const db = require('../config/db');
const passwordUtil = require('../utils/password');
const securityService = require('./securityService');
const activityService = require('./activityService');
const cloudinary = require('../config/cloudinary');

/**
 * Returns paginated user list with filters (SUPER_ADMIN only).
 */
const getUsers = async ({ page = 1, limit = 20, role, status, search }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = [];
  let queryParams = [];

  if (role) {
    whereClauses.push('r.name = ?');
    queryParams.push(role);
  }

  if (status) {
    whereClauses.push('u.status = ?');
    queryParams.push(status);
  }

  if (search) {
    whereClauses.push('(u.username LIKE ? OR u.email LIKE ? OR s.full_name LIKE ? OR s.student_id LIKE ? OR s.roll_number LIKE ?)');
    const term = `%${search}%`;
    queryParams.push(term, term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [countRows] = await db.pool.query(
    `SELECT COUNT(DISTINCT u.id) as total
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN students s ON s.user_id = u.id
     ${whereSql}`,
    queryParams
  );
  const total = countRows[0]?.total || 0;

  const [users] = await db.pool.query(
    `SELECT u.id, u.username, u.email, u.full_name, u.gender, u.phone, u.status, u.must_change_password, u.last_login_at, u.created_at, u.updated_at,
            r.name as role,
            s.id as student_record_id, s.full_name as student_name, s.student_id as student_code, s.roll_number,
            (SELECT GROUP_CONCAT(h.name SEPARATOR ', ')
             FROM superintendent_hostels sh
             JOIN hostels h ON sh.hostel_id = h.id
             WHERE sh.user_id = u.id) as assigned_hostels
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN students s ON s.user_id = u.id
     ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, limitNum, offset]
  );

  return {
    users,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };
};

/**
 * Gets details for a single user.
 */
const getUserById = async (targetId) => {
  const [users] = await db.pool.query(
    `SELECT u.id, u.username, u.email, u.full_name, u.gender, u.phone, u.status, u.must_change_password, u.last_login_at, u.created_at, u.updated_at,
            r.name as role
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [targetId]
  );

  if (users.length === 0) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const user = users[0];

  if (user.role === 'SUPERINTENDENT') {
    const [assigned] = await db.pool.query(
      `SELECT h.id, h.name, h.code
       FROM superintendent_hostels sh
       JOIN hostels h ON sh.hostel_id = h.id
       WHERE sh.user_id = ?`,
      [targetId]
    );
    user.assigned_hostels = assigned;
  } else if (user.role === 'STUDENT') {
    const [students] = await db.pool.query(
      `SELECT s.id as student_record_id, s.full_name, s.student_id as student_code, s.student_id, s.roll_number, s.branch, s.course, s.year as year_of_study, s.year, s.semester, s.phone as phone_number, s.phone, s.photo_url
       FROM students s WHERE s.user_id = ?`,
      [targetId]
    );
    if (students.length > 0) {
      user.student_profile = students[0];
    }
  }

  return user;
};

/**
 * Creates a new user account (SUPER_ADMIN only).
 */
const createUser = async (userData, actor, reqContext = {}) => {
  const { username, email, password, role = 'STUDENT', student_id = null, hostel_ids = [], full_name = null, gender = null, phone = null } = userData;
  const { ip_address = null, user_agent = null } = reqContext;

  if (!username || !email || !password) {
    const err = new Error('Username, email, and password are required.');
    err.status = 400;
    throw err;
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanRole = role.trim().toUpperCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error('Please enter a valid email address.');
    err.status = 400;
    throw err;
  }

  // Validate role
  const [roles] = await db.pool.query('SELECT id, name FROM roles WHERE name = ?', [cleanRole]);
  if (roles.length === 0) {
    const err = new Error(`Invalid role '${cleanRole}'. Must be SUPER_ADMIN, SUPERINTENDENT, or STUDENT.`);
    err.status = 400;
    throw err;
  }
  const roleId = roles[0].id;

  // Validate password strength
  const passCheck = passwordUtil.validatePasswordStrength(password);
  if (!passCheck.isValid) {
    const err = new Error(passCheck.message);
    err.status = 400;
    throw err;
  }

  // Check unique username
  const [existingUser] = await db.pool.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
  if (existingUser.length > 0) {
    const err = new Error(`Username '${cleanUsername}' is already taken.`);
    err.status = 409;
    throw err;
  }

  // Check unique email
  const [existingEmail] = await db.pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existingEmail.length > 0) {
    const err = new Error(`Email '${cleanEmail}' is already registered.`);
    err.status = 409;
    throw err;
  }

  let validGender = null;
  if (gender && ['MALE', 'FEMALE', 'OTHER'].includes(gender.toUpperCase())) {
    validGender = gender.toUpperCase();
  }

  const hash = await passwordUtil.hashPassword(password);

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    const [insertRes] = await conn.query(
      `INSERT INTO users (role_id, username, email, full_name, gender, phone, password_hash, status, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1)`,
      [roleId, cleanUsername, cleanEmail, full_name ? full_name.trim() : null, validGender, phone ? phone.trim() : null, hash]
    );
    const newUserId = insertRes.insertId;

    // Link student if provided
    if (cleanRole === 'STUDENT' && student_id) {
      await conn.query('UPDATE students SET user_id = ? WHERE id = ?', [newUserId, student_id]);
    }

    // Assign hostels if superintendent
    if (cleanRole === 'SUPERINTENDENT' && Array.isArray(hostel_ids) && hostel_ids.length > 0) {
      for (const hId of hostel_ids) {
        await conn.query(
          'INSERT INTO superintendent_hostels (user_id, hostel_id) VALUES (?, ?)',
          [newUserId, hId]
        );
      }
    }

    await conn.commit();

    await securityService.logSecurityEvent({
      action: 'USER_CREATED',
      user_id: newUserId,
      actor_id: actor.id,
      ip_address,
      user_agent,
      metadata: { username: cleanUsername, email: cleanEmail, role: cleanRole }
    });

    await activityService.logActivity({
      actorId: actor.id,
      action: 'USER_CREATED',
      module: 'USERS',
      entityType: 'USER',
      entityId: newUserId,
      description: `Created new user account '${cleanUsername}' with role '${cleanRole}'`,
      metadata: { username: cleanUsername, email: cleanEmail, role: cleanRole }
    }, conn);

    return { id: newUserId, username: cleanUsername, email: cleanEmail, role: cleanRole, must_change_password: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * Updates a user's status (ACTIVE / INACTIVE).
 */
const updateUserStatus = async (targetId, newStatus, actor, reqContext = {}) => {
  const { ip_address = null, user_agent = null } = reqContext;

  if (!['ACTIVE', 'INACTIVE'].includes(newStatus)) {
    const err = new Error('Status must be ACTIVE or INACTIVE.');
    err.status = 400;
    throw err;
  }

  // Self-protection
  if (targetId === actor.id && newStatus === 'INACTIVE') {
    const err = new Error('You cannot deactivate your own account.');
    err.status = 400;
    throw err;
  }

  const [users] = await db.pool.query(
    `SELECT u.id, u.status, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [targetId]
  );
  if (users.length === 0) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const targetUser = users[0];

  // Last active Super Admin protection
  if (targetUser.role === 'SUPER_ADMIN' && newStatus === 'INACTIVE') {
    const [adminCount] = await db.pool.query(
      `SELECT COUNT(*) as cnt FROM users u JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'SUPER_ADMIN' AND u.status = 'ACTIVE' AND u.id != ?`,
      [targetId]
    );
    if (adminCount[0].cnt === 0) {
      const err = new Error('Cannot deactivate the last active Super Admin account.');
      err.status = 400;
      throw err;
    }
  }

  await db.pool.query('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, targetId]);

  const auditAction = newStatus === 'ACTIVE' ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED';
  await securityService.logSecurityEvent({
    action: auditAction,
    user_id: targetId,
    actor_id: actor.id,
    ip_address,
    user_agent,
    metadata: { previous_status: targetUser.status, new_status: newStatus }
  });

  await activityService.logActivity({
    actorId: actor.id,
    action: newStatus === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    module: 'USERS',
    entityType: 'USER',
    entityId: targetId,
    description: `${newStatus === 'ACTIVE' ? 'Activated' : 'Deactivated'} user account #${targetId}`,
    metadata: { previous_status: targetUser.status, new_status: newStatus }
  });

  return { success: true, id: targetId, status: newStatus };
};

/**
 * Updates a user's role.
 */
const updateUserRole = async (targetId, newRole, actor, reqContext = {}) => {
  const { ip_address = null, user_agent = null } = reqContext;

  const [roles] = await db.pool.query('SELECT id, name FROM roles WHERE name = ?', [newRole]);
  if (roles.length === 0) {
    const err = new Error(`Invalid role '${newRole}'.`);
    err.status = 400;
    throw err;
  }
  const newRoleId = roles[0].id;

  const [users] = await db.pool.query(
    `SELECT u.id, u.status, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [targetId]
  );
  if (users.length === 0) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const targetUser = users[0];
  const oldRole = targetUser.role;

  if (oldRole === newRole) {
    return { success: true, id: targetId, role: newRole };
  }

  // Last active Super Admin protection if demoting from SUPER_ADMIN
  if (oldRole === 'SUPER_ADMIN') {
    const [adminCount] = await db.pool.query(
      `SELECT COUNT(*) as cnt FROM users u JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'SUPER_ADMIN' AND u.status = 'ACTIVE' AND u.id != ?`,
      [targetId]
    );
    if (adminCount[0].cnt === 0) {
      const err = new Error('Cannot demote the last active Super Admin account.');
      err.status = 400;
      throw err;
    }
  }

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('UPDATE users SET role_id = ?, updated_at = NOW() WHERE id = ?', [newRoleId, targetId]);

    // If demoted from SUPERINTENDENT to another role, remove hostel assignments
    if (oldRole === 'SUPERINTENDENT' && newRole !== 'SUPERINTENDENT') {
      await conn.query('DELETE FROM superintendent_hostels WHERE user_id = ?', [targetId]);
    }

    await conn.commit();

    await securityService.logSecurityEvent({
      action: 'ROLE_CHANGED',
      user_id: targetId,
      actor_id: actor.id,
      ip_address,
      user_agent,
      metadata: { previous_role: oldRole, new_role: newRole }
    });

    await activityService.logActivity({
      actorId: actor.id,
      action: 'ROLE_CHANGED',
      module: 'USERS',
      entityType: 'USER',
      entityId: targetId,
      description: `Changed role for user #${targetId} from '${oldRole}' to '${newRole}'`,
      metadata: { previous_role: oldRole, new_role: newRole }
    }, conn);

    return { success: true, id: targetId, role: newRole };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * Resets a user's password (SUPER_ADMIN only).
 */
const adminResetPassword = async (targetId, newPassword, actor, reqContext = {}) => {
  const { ip_address = null, user_agent = null } = reqContext;

  const passCheck = passwordUtil.validatePasswordStrength(newPassword);
  if (!passCheck.isValid) {
    const err = new Error(passCheck.message);
    err.status = 400;
    throw err;
  }

  const [users] = await db.pool.query('SELECT id, username FROM users WHERE id = ?', [targetId]);
  if (users.length === 0) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const targetUsername = users[0].username;
  const hash = await passwordUtil.hashPassword(newPassword);
  await db.pool.query(
    'UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = NOW() WHERE id = ?',
    [hash, targetId]
  );

  await securityService.logSecurityEvent({
    action: 'PASSWORD_RESET',
    user_id: targetId,
    actor_id: actor.id,
    ip_address,
    user_agent
  });

  await activityService.logActivity({
    actorId: actor.id,
    action: 'PASSWORD_RESET',
    module: 'AUTHENTICATION',
    entityType: 'USER',
    entityId: targetId,
    description: `Reset password for user '${targetUsername}'`
  });

  return { success: true, message: 'Password reset successfully. User must change password on next login.' };
};

/**
 * Manages superintendent hostel assignments (SUPER_ADMIN only).
 */
const updateSuperintendentHostels = async (targetId, hostelIds, actor, reqContext = {}) => {
  const { ip_address = null, user_agent = null } = reqContext;

  const [users] = await db.pool.query(
    `SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [targetId]
  );

  if (users.length === 0) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  if (users[0].role !== 'SUPERINTENDENT') {
    const err = new Error('Hostel assignments can only be set for Superintendent users.');
    err.status = 400;
    throw err;
  }

  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM superintendent_hostels WHERE user_id = ?', [targetId]);

    if (Array.isArray(hostelIds) && hostelIds.length > 0) {
      for (const hId of hostelIds) {
        await conn.query(
          'INSERT INTO superintendent_hostels (user_id, hostel_id) VALUES (?, ?)',
          [targetId, hId]
        );
      }
    }

    await conn.commit();

    await securityService.logSecurityEvent({
      action: 'HOSTEL_ASSIGNED',
      user_id: targetId,
      actor_id: actor.id,
      ip_address,
      user_agent,
      metadata: { assigned_hostel_ids: hostelIds }
    });

    const isAssigned = Array.isArray(hostelIds) && hostelIds.length > 0;
    await activityService.logActivity({
      actorId: actor.id,
      action: isAssigned ? 'HOSTEL_ASSIGNED' : 'HOSTEL_UNASSIGNED',
      module: 'USERS',
      entityType: 'USER',
      entityId: targetId,
      description: isAssigned ? `Assigned superintendent #${targetId} to hostels [${hostelIds.join(', ')}]` : `Removed all hostel assignments from superintendent #${targetId}`,
      metadata: { assigned_hostel_ids: hostelIds }
    });

    return { success: true, id: targetId, assigned_hostel_ids: hostelIds };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * Self-profile update with strict field whitelisting.
 */
const updateSelfProfile = async (userId, updates, reqContext = {}) => {
  const { ip_address = null, user_agent = null } = reqContext;

  const [users] = await db.pool.query(
    `SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [userId]
  );
  if (users.length === 0) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const role = users[0].role;
  let userFields = [];
  let userParams = [];

  // Whitelisted fields for user table: email
  if (updates.email && typeof updates.email === 'string') {
    const cleanEmail = updates.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const err = new Error('Please provide a valid email address.');
      err.status = 400;
      throw err;
    }
    const [existing] = await db.pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, userId]);
    if (existing.length > 0) {
      const err = new Error('Email address is already in use by another account.');
      err.status = 409;
      throw err;
    }
    userFields.push('email = ?');
    userParams.push(cleanEmail);
  }

  // full_name
  if (updates.full_name !== undefined) {
    const nameVal = typeof updates.full_name === 'string' ? updates.full_name.trim() : null;
    userFields.push('full_name = ?');
    userParams.push(nameVal);
  }

  // gender ('MALE', 'FEMALE', 'OTHER')
  if (updates.gender !== undefined) {
    const validGenders = ['MALE', 'FEMALE', 'OTHER'];
    const g = typeof updates.gender === 'string' ? updates.gender.toUpperCase().trim() : null;
    if (g && validGenders.includes(g)) {
      userFields.push('gender = ?');
      userParams.push(g);
    } else if (g === null || g === '') {
      userFields.push('gender = ?');
      userParams.push(null);
    } else {
      const err = new Error("Invalid gender. Must be 'MALE', 'FEMALE', or 'OTHER'.");
      err.status = 400;
      throw err;
    }
  }

  // phone / phone_number
  const phoneInput = updates.phone !== undefined ? updates.phone : updates.phone_number;
  if (phoneInput !== undefined) {
    const cleanPhone = typeof phoneInput === 'string' ? phoneInput.trim() : null;
    userFields.push('phone = ?');
    userParams.push(cleanPhone);
  }

  if (userFields.length > 0) {
    userParams.push(userId);
    await db.pool.query(
      `UPDATE users SET ${userFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      userParams
    );
  }

  // If student role, keep student table fields in sync
  if (role === 'STUDENT') {
    let studentFields = [];
    let studentParams = [];
    if (phoneInput !== undefined) {
      studentFields.push('phone = ?');
      studentParams.push(phoneInput && typeof phoneInput === 'string' ? phoneInput.trim() : null);
    }
    if (updates.full_name !== undefined && typeof updates.full_name === 'string' && updates.full_name.trim()) {
      studentFields.push('full_name = ?');
      studentParams.push(updates.full_name.trim());
    }
    if (updates.date_of_birth !== undefined && updates.date_of_birth) {
      studentFields.push('date_of_birth = ?');
      studentParams.push(updates.date_of_birth);
    }
    if (updates.base64Photo && typeof updates.base64Photo === 'string' && updates.base64Photo.startsWith('data:image')) {
      try {
        const uploadResult = await cloudinary.uploader.upload(updates.base64Photo, {
          folder: 'hostel_management/students',
          transformation: [{ width: 500, height: 500, crop: 'limit' }]
        });
        studentFields.push('photo_url = ?', 'cloudinary_public_id = ?');
        studentParams.push(uploadResult.secure_url, uploadResult.public_id);
      } catch (err) {
        console.warn('Student profile photo upload to Cloudinary error:', err.message);
      }
    }
    // Registration number (student_id / registration_no)
    const regNoInput = updates.registration_no !== undefined ? updates.registration_no : (updates.student_id !== undefined ? updates.student_id : (updates.reg_no !== undefined ? updates.reg_no : updates.student_code));
    if (regNoInput !== undefined && typeof regNoInput === 'string') {
      const cleanRegNo = regNoInput.trim();
      if (cleanRegNo) {
        const [currStudent] = await db.pool.query('SELECT id, student_id FROM students WHERE user_id = ?', [userId]);
        if (currStudent.length > 0 && currStudent[0].student_id !== cleanRegNo) {
          const [dupStudent] = await db.pool.query(
            'SELECT id FROM students WHERE student_id = ? AND user_id != ?',
            [cleanRegNo, userId]
          );
          if (dupStudent.length > 0) {
            const err = new Error(`Registration Number '${cleanRegNo}' is already registered to another student.`);
            err.status = 409;
            throw err;
          }

          const [dupUser] = await db.pool.query(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [cleanRegNo, userId]
          );
          if (dupUser.length > 0) {
            const err = new Error(`Registration Number / Username '${cleanRegNo}' is already taken by another account.`);
            err.status = 409;
            throw err;
          }

          studentFields.push('student_id = ?');
          studentParams.push(cleanRegNo);

          await db.pool.query('UPDATE users SET username = ?, updated_at = NOW() WHERE id = ?', [cleanRegNo, userId]);
        }
      }
    }

    if (studentFields.length > 0) {
      studentParams.push(userId);
      await db.pool.query(
        `UPDATE students SET ${studentFields.join(', ')} WHERE user_id = ?`,
        studentParams
      );
    }
  }

  await securityService.logSecurityEvent({
    action: 'PROFILE_UPDATED',
    user_id: userId,
    actor_id: userId,
    ip_address,
    user_agent
  });

  return { success: true, message: 'Profile updated successfully.' };
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUserStatus,
  updateUserRole,
  adminResetPassword,
  updateSuperintendentHostels,
  updateSelfProfile
};
