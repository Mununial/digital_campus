const db = require('../config/db');
const authorization = require('../utils/authorization');
const passwordUtil = require('../utils/password');
const cloudinary = require('../config/cloudinary');
const reportingService = require('./reportingIntegrationService');

/**
 * Helper to upload profile photo to Cloudinary.
 * Falls back to mock response if Cloudinary is not configured or in test environments.
 */
const uploadProfilePhoto = async (base64Data) => {
  if (!base64Data) return null;

  // Basic validation of base64 image prefix
  const match = base64Data.match(/^data:image\/(\w+);base64,/);
  if (!match) {
    const error = new Error('Invalid image format. Supported formats: JPG, JPEG, PNG, WEBP.');
    error.status = 400;
    throw error;
  }

  const extension = match[1].toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    const error = new Error('Unsupported file extension. Supported: JPG, JPEG, PNG, WEBP.');
    error.status = 400;
    throw error;
  }

  // Basic size validation (approx 5MB max)
  const sizeInBytes = Math.round((base64Data.length * 3) / 4);
  if (sizeInBytes > 5 * 1024 * 1024) {
    const error = new Error('File size exceeds the maximum limit of 5MB.');
    error.status = 400;
    throw error;
  }

  // Check if Cloudinary is fully configured
  const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'your_api_secret';

  if (!isCloudinaryConfigured) {
    console.warn('Cloudinary credentials not set. Falling back to mock image upload.');
    return {
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
      public_id: 'mock_cloudinary_public_id_' + Date.now()
    };
  }

  try {
    const uploadRes = await cloudinary.uploader.upload(base64Data, {
      folder: 'hostel_management/students',
      resource_type: 'image'
    });
    return {
      secure_url: uploadRes.secure_url,
      public_id: uploadRes.public_id
    };
  } catch (err) {
    const error = new Error(`Cloudinary upload failed: ${err.message}`);
    error.status = 500;
    throw error;
  }
};

/**
 * Helper to delete profile photo from Cloudinary.
 */
const deleteProfilePhoto = async (publicId) => {
  if (!publicId || publicId.startsWith('mock_cloudinary_')) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Failed to delete Cloudinary photo ${publicId}:`, err);
  }
};

/**
 * Retrieves all students matching search queries and filters, role-scoped.
 */
/**
 * Retrieves all students matching search queries and filters, role-scoped.
 * Reporting module is the MASTER data source; Hostel room/bed assignments are overlaid.
 */
const getAllStudents = async (filters = {}, user) => {
  const { role, id: userId } = user;
  const { page = 1, limit = 20, search = '', hostel_id, branch, course, year, status } = filters;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(250, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  // 1. Fetch existing hostel students from DB to know who already has bed_id or active allocations
  let localStudents = [];
  try {
    const [rows] = await db.pool.query(`
      SELECT s.*, u.username, u.email as user_email, u.status as user_status, u.gender as user_gender,
             b.bed_number, r.room_number, r.id as room_id, f.floor_name, f.id as floor_id,
             h.name as hostel_name, h.id as hostel_id, h.gender as hostel_gender
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN beds b ON s.bed_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN floors f ON r.floor_id = f.id
      LEFT JOIN hostels h ON f.hostel_id = h.id
    `);
    localStudents = rows || [];
  } catch (err) {
    console.warn('[getAllStudents DB Notice]:', err.message);
  }

  // 2. Load Master Student Records from Reporting Module
  const reportingMaster = reportingService.getReportingMasterList();

  // 3. Merge: Reporting is Master. For every Reporting student, overlay hostel allocation if any
  const mergedList = reportingMaster.map(rStudent => {
    const cleanRoll = String(rStudent.roll_number || '').trim().toLowerCase();
    const cleanEmail = String(rStudent.email || '').trim().toLowerCase();
    const localMatch = localStudents.find(ls => 
      String(ls.roll_number || '').trim().toLowerCase() === cleanRoll ||
      String(ls.email || '').trim().toLowerCase() === cleanEmail
    );

    if (localMatch) {
      return {
        ...localMatch,
        full_name: rStudent.full_name || localMatch.full_name,
        roll_number: rStudent.roll_number,
        student_id: rStudent.student_id || localMatch.student_id,
        gender: rStudent.gender || localMatch.user_gender || 'Male',
        normalized_gender: rStudent.normalized_gender || 'MALE',
        branch: rStudent.branch || localMatch.branch,
        year: rStudent.year || localMatch.year,
        course: rStudent.course || localMatch.course,
        email: rStudent.email || localMatch.email,
        phone: rStudent.phone || localMatch.phone,
        status: localMatch.status || 'ACTIVE'
      };
    }

    return {
      id: rStudent.roll_number,
      student_id: rStudent.student_id || rStudent.roll_number,
      roll_number: rStudent.roll_number,
      full_name: rStudent.full_name,
      gender: rStudent.gender,
      normalized_gender: rStudent.normalized_gender,
      branch: rStudent.branch,
      course: rStudent.course,
      year: rStudent.year,
      semester: rStudent.semester,
      email: rStudent.email,
      phone: rStudent.phone,
      bed_id: null,
      bed_number: null,
      room_number: null,
      hostel_name: null,
      hostel_id: null,
      status: 'ACTIVE'
    };
  });

  // Also include any local student not in reportingMaster (e.g. John Doe, Jane Smith)
  localStudents.forEach(ls => {
    const cleanRoll = String(ls.roll_number || '').trim().toLowerCase();
    if (!mergedList.some(m => String(m.roll_number || '').trim().toLowerCase() === cleanRoll)) {
      const repInfo = reportingService.findReportingStudentByRoll(ls.roll_number);
      const gender = repInfo?.gender || ls.user_gender || 'Male';
      mergedList.push({
        ...ls,
        gender,
        normalized_gender: reportingService.normalizeGender(gender)
      });
    }
  });

  // 4. Role scoping
  let accessibleList = mergedList;
  if (role === 'SUPERINTENDENT') {
    const assignedHostels = await authorization.getAssignedHostels(userId);
    if (assignedHostels.length === 0) {
      return { students: [], currentPage: pageNum, totalPages: 0, totalStudents: 0, limit: limitNum };
    }
    accessibleList = mergedList.filter(s => !s.hostel_id || assignedHostels.includes(Number(s.hostel_id)));
  }

  // 5. Apply filters
  let filtered = accessibleList;
  if (hostel_id && hostel_id !== 'all') {
    filtered = filtered.filter(s => String(s.hostel_id) === String(hostel_id));
  }
  if (branch) {
    filtered = filtered.filter(s => String(s.branch).toLowerCase() === String(branch).toLowerCase());
  }
  if (year) {
    filtered = filtered.filter(s => Number(s.year) === Number(year));
  }
  if (status) {
    filtered = filtered.filter(s => String(s.status).toUpperCase() === String(status).toUpperCase());
  }
  if (search && search.trim() !== '') {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter(s => 
      (s.full_name && s.full_name.toLowerCase().includes(term)) ||
      (s.roll_number && s.roll_number.toLowerCase().includes(term)) ||
      (s.student_id && String(s.student_id).toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.phone && String(s.phone).includes(term))
    );
  }

  const totalStudents = filtered.length;
  const totalPages = Math.ceil(totalStudents / limitNum) || 1;
  const paginated = filtered.slice(offset, offset + limitNum);

  return {
    students: paginated,
    currentPage: pageNum,
    totalPages,
    totalStudents,
    limit: limitNum
  };
};

/**
 * Retrieves a single student profile by ID.
 */
const getStudentById = async (studentId, user) => {
  const isAuthorized = await authorization.hasStudentAccess(user, studentId);
  if (!isAuthorized) {
    const error = new Error('Forbidden: You do not have permission to access this student record.');
    error.status = 403;
    throw error;
  }

  const [rows] = await db.pool.query(
    `SELECT s.*, u.username, u.email as user_email, u.status as user_status,
            b.bed_number, r.room_number, r.id as room_id, f.floor_name, f.id as floor_id,
            h.name as hostel_name, h.id as hostel_id
     FROM students s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN beds b ON s.bed_id = b.id
     LEFT JOIN rooms r ON b.room_id = r.id
     LEFT JOIN floors f ON r.floor_id = f.id
     LEFT JOIN hostels h ON f.hostel_id = h.id
     WHERE s.id = ?`,
    [studentId]
  );

  if (rows.length === 0) {
    const error = new Error('Student record not found.');
    error.status = 404;
    throw error;
  }

  return rows[0];
};

/**
 * Creates a new student user and profile in a transaction-safe manner.
 */
const createStudent = async (studentData, creator) => {
  const {
    student_id, roll_number, full_name, phone, email, branch, course, year, semester,
    hostel_id, floor_id, room_id, bed_id, admission_date, password, base64Photo,
    date_of_birth
  } = studentData;

  // 1. Inputs validation
  if (!full_name || !full_name.trim()) {
    const error = new Error('Full name is required.');
    error.status = 400;
    throw error;
  }

  // Auto-generate or sanitize student_id (Registration Number is optional)
  let finalStudentId = (student_id && student_id.trim()) ? student_id.trim() : null;
  if (!finalStudentId) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    finalStudentId = `BEC${randomDigits}`;
  }

  // Auto-generate email (fullname@bec.ac.in) if not provided
  let finalEmail = (email && email.trim()) ? email.trim().toLowerCase() : null;
  if (!finalEmail) {
    const cleanName = full_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    finalEmail = `${cleanName || 'student'}@bec.ac.in`;
  }

  // Format default password from DOB (format DDMMYYYY)
  let finalPassword = '';
  if (date_of_birth && /^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
    const [yyyy, mm, dd] = date_of_birth.split('-');
    finalPassword = `${dd}${mm}${yyyy}`;
  } else if (password && password.trim().length >= 6) {
    finalPassword = password.trim();
  } else {
    finalPassword = 'password123';
  }

  const finalRollNumber = (roll_number && roll_number.trim()) ? roll_number.trim() : null;

  if (!hostel_id || !room_id || !bed_id) {
    const error = new Error('Complete hostel, room, and bed assignments are required.');
    error.status = 400;
    throw error;
  }

  // 2. Creator scope validation
  if (creator.role === 'SUPERINTENDENT') {
    const assigned = await authorization.getAssignedHostels(creator.id);
    if (!assigned.includes(Number(hostel_id))) {
      const error = new Error('Forbidden: You can only assign students to your assigned hostel(s).');
      error.status = 403;
      throw error;
    }
  }

  // 3. Unique Constraints checks
  const [existingUser] = await db.pool.query(
    'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
    [finalStudentId, finalEmail]
  );
  if (existingUser.length > 0) {
    const matched = existingUser[0];
    if (matched.email === finalEmail) {
      const error = new Error(`Student email '${finalEmail}' is already registered. Please use a unique name or customized email.`);
      error.status = 400;
      throw error;
    }
    const error = new Error(`Student registration ID '${finalStudentId}' is already in use. Please provide a different registration number.`);
    error.status = 400;
    throw error;
  }

  const [existingStudentId] = await db.pool.query(
    'SELECT id FROM students WHERE student_id = ?',
    [finalStudentId]
  );
  if (existingStudentId.length > 0) {
    const error = new Error(`Student Registration Number '${finalStudentId}' is already registered.`);
    error.status = 400;
    throw error;
  }

  const [existingEmail] = await db.pool.query(
    'SELECT id FROM students WHERE email = ?',
    [finalEmail]
  );
  if (existingEmail.length > 0) {
    const error = new Error(`Student Email '${finalEmail}' is already registered.`);
    error.status = 400;
    throw error;
  }

  // 4. Validate complete bed -> room -> hostel hierarchy
  const [bedStructure] = await db.pool.query(
    `SELECT b.id as bed_id, r.id as room_id, r.floor_id, r.hostel_id, b.status as bed_status
     FROM beds b
     JOIN rooms r ON b.room_id = r.id
     JOIN hostels h ON r.hostel_id = h.id
     WHERE b.id = ?`,
    [bed_id]
  );

  if (bedStructure.length === 0) {
    const error = new Error('Selected bed does not exist.');
    error.status = 400;
    throw error;
  }

  const bed = bedStructure[0];
  if (
    bed.room_id !== Number(room_id) ||
    bed.hostel_id !== Number(hostel_id) ||
    (floor_id && bed.floor_id && bed.floor_id !== Number(floor_id))
  ) {
    const error = new Error('Invalid assignment relationship: Bed does not belong to the selected room, floor, or hostel.');
    error.status = 400;
    throw error;
  }

  if (bed.bed_status !== 'AVAILABLE') {
    const error = new Error('Selected bed is not available.');
    error.status = 400;
    throw error;
  }

  // 5. Upload Profile Photo if provided
  let photoUrl = null;
  let cloudinaryPublicId = null;
  if (base64Photo) {
    const uploadRes = await uploadProfilePhoto(base64Photo);
    photoUrl = uploadRes.secure_url;
    cloudinaryPublicId = uploadRes.public_id;
  }

  // 6. DB Transaction Execution
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Hash password (defaults to DOB DDMMYYYY e.g. 15082005)
    const passwordHash = await passwordUtil.hashPassword(finalPassword);

    // B. Create account in users table (role_id 3 is STUDENT)
    const [userInsertResult] = await connection.query(
      `INSERT INTO users (role_id, username, email, full_name, phone, password_hash, status, must_change_password) 
       VALUES (3, ?, ?, ?, ?, ?, 'ACTIVE', 0)`,
      [finalStudentId, finalEmail, full_name.trim(), phone ? phone.trim() : null, passwordHash]
    );
    const newUserId = userInsertResult.insertId;

    // C. Create student record
    const [studentInsertResult] = await connection.query(
      `INSERT INTO students (
        user_id, student_id, roll_number, full_name, date_of_birth, photo_url, cloudinary_public_id,
        phone, email, branch, course, year, semester, bed_id, admission_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        newUserId, finalStudentId, finalRollNumber, full_name.trim(),
        date_of_birth || null, photoUrl, cloudinaryPublicId,
        phone ? phone.trim() : null, finalEmail, branch || '', course || '', parseInt(year, 10) || 1, parseInt(semester, 10) || 1,
        bed_id, admission_date || new Date().toISOString().slice(0, 10)
      ]
    );

    // D. Update bed status to OCCUPIED
    await connection.query(
      "UPDATE beds SET status = 'OCCUPIED' WHERE id = ?",
      [bed_id]
    );

    // E. Create initial ACTIVE record in student_allocations
    const adminStaffId = creator?.id || 1;
    const allocDate = admission_date || new Date().toISOString().slice(0, 10);
    await connection.query(
      `INSERT INTO student_allocations (student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [studentInsertResult.insertId, hostel_id, room_id, bed_id, allocDate, adminStaffId]
    );

    await connection.commit();
    return { id: studentInsertResult.insertId, student_id: finalStudentId, full_name: full_name.trim(), email: finalEmail, date_of_birth: date_of_birth || null };
  } catch (err) {
    await connection.rollback();
    // Clean up Cloudinary file if created
    if (cloudinaryPublicId) {
      await deleteProfilePhoto(cloudinaryPublicId);
    }
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Updates details of an existing student.
 */
const updateStudent = async (studentId, updateData, user) => {
  const isAuthorized = await authorization.hasStudentAccess(user, studentId);
  if (!isAuthorized) {
    const error = new Error('Forbidden: You do not have permission to edit this student.');
    error.status = 403;
    throw error;
  }

  const currentStudent = await getStudentById(studentId, user);

  const {
    full_name, date_of_birth, phone, email, branch, course, year, semester, status, base64Photo, student_id, registration_no
  } = updateData;

  const regNoInput = student_id !== undefined ? student_id : registration_no;
  let newStudentId = null;
  if (regNoInput !== undefined && typeof regNoInput === 'string') {
    const cleanRegNo = regNoInput.trim();
    if (cleanRegNo && cleanRegNo !== currentStudent.student_id) {
      newStudentId = cleanRegNo;
      // Check uniqueness in students table
      const [dupStudent] = await db.pool.query(
        'SELECT id FROM students WHERE student_id = ? AND id != ?',
        [newStudentId, studentId]
      );
      if (dupStudent.length > 0) {
        const error = new Error(`Student Registration Number '${newStudentId}' is already registered to another student.`);
        error.status = 409;
        throw error;
      }

      // Check uniqueness in users table
      const [dupUser] = await db.pool.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [newStudentId, currentStudent.user_id]
      );
      if (dupUser.length > 0) {
        const error = new Error(`Student Registration ID / Username '${newStudentId}' is already in use by another account.`);
        error.status = 409;
        throw error;
      }
    }
  }

  let photoUrl = currentStudent.photo_url;
  let newCloudinaryPublicId = null;
  let oldCloudinaryPublicId = currentStudent.cloudinary_public_id;

  // 1. Handle base64 image upload if provided
  if (base64Photo) {
    const uploadRes = await uploadProfilePhoto(base64Photo, `student_${newStudentId || currentStudent.student_id}`);
    photoUrl = uploadRes.secure_url;
    newCloudinaryPublicId = uploadRes.public_id;
  }

  // 2. Perform updates inside transaction
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Update student table
    const studentUpdates = [];
    const studentParams = [];

    if (newStudentId) { studentUpdates.push('student_id = ?'); studentParams.push(newStudentId); }
    if (full_name !== undefined) { studentUpdates.push('full_name = ?'); studentParams.push(full_name.trim()); }
    if (date_of_birth !== undefined) { studentUpdates.push('date_of_birth = ?'); studentParams.push(date_of_birth || null); }
    if (phone !== undefined) { studentUpdates.push('phone = ?'); studentParams.push(phone ? phone.trim() : ''); }
    if (email !== undefined) { studentUpdates.push('email = ?'); studentParams.push(email.trim()); }
    if (branch !== undefined) { studentUpdates.push('branch = ?'); studentParams.push(branch.trim()); }
    if (course !== undefined) { studentUpdates.push('course = ?'); studentParams.push(course.trim()); }
    if (year !== undefined) { studentUpdates.push('year = ?'); studentParams.push(parseInt(year, 10)); }
    if (semester !== undefined) { studentUpdates.push('semester = ?'); studentParams.push(parseInt(semester, 10)); }
    if (status !== undefined) { studentUpdates.push('status = ?'); studentParams.push(status); }
    if (newCloudinaryPublicId) {
      studentUpdates.push('photo_url = ?', 'cloudinary_public_id = ?');
      studentParams.push(photoUrl, newCloudinaryPublicId);
    }

    if (studentUpdates.length > 0) {
      studentParams.push(studentId);
      await connection.query(`UPDATE students SET ${studentUpdates.join(', ')} WHERE id = ?`, studentParams);
    }

    // B. Keep user account table in sync
    const userUpdates = [];
    const userParams = [];

    if (newStudentId) { userUpdates.push('username = ?'); userParams.push(newStudentId); }
    if (full_name !== undefined) { userUpdates.push('full_name = ?'); userParams.push(full_name.trim()); }
    if (phone !== undefined) { userUpdates.push('phone = ?'); userParams.push(phone ? phone.trim() : null); }
    if (email !== undefined) { userUpdates.push('email = ?'); userParams.push(email.trim()); }

    if (userUpdates.length > 0) {
      userParams.push(currentStudent.user_id);
      await connection.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    // C. Keep user status in sync if student status is changing
    if (status && status !== currentStudent.status) {
      const userStatus = status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
      await connection.query(
        'UPDATE users SET status = ? WHERE id = ?',
        [userStatus, currentStudent.user_id]
      );

      // If student is deactivated, release their bed and close allocations
      if (status !== 'ACTIVE' && currentStudent.bed_id) {
        await connection.query(
          "UPDATE beds SET status = 'AVAILABLE' WHERE id = ?",
          [currentStudent.bed_id]
        );
        await connection.query(
          "UPDATE students SET bed_id = NULL WHERE id = ?",
          [studentId]
        );
        await connection.query(
          `UPDATE student_allocations
           SET status = 'CHECKED_OUT', allocated_until = CURDATE(), checkout_reason = 'LEFT_COLLEGE'
           WHERE student_id = ? AND status = 'ACTIVE'`,
          [studentId]
        );
      }
    }

    await connection.commit();

    // Successfully saved! Clean up old image if replaced
    if (oldCloudinaryPublicId && newCloudinaryPublicId) {
      await deleteProfilePhoto(oldCloudinaryPublicId);
    }

    return { success: true };
  } catch (err) {
    await connection.rollback();
    // Clean up newly uploaded image on failure
    if (newCloudinaryPublicId && newCloudinaryPublicId !== currentStudent.cloudinary_public_id) {
      await deleteProfilePhoto(newCloudinaryPublicId);
    }
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Transfers a student's room / bed assignment in a transaction-safe manner.
 */
const transferStudent = async (studentId, transferData, user) => {
  const { new_hostel_id, new_floor_id, new_room_id, new_bed_id } = transferData;
  if (!new_hostel_id || !new_room_id || !new_bed_id) {
    const error = new Error('Destination Hostel, Room, and Bed must be selected.');
    error.status = 400;
    throw error;
  }

  // 1. Authorize current access
  const isAuthorized = await authorization.hasStudentAccess(user, studentId);
  if (!isAuthorized) {
    const error = new Error('Forbidden: You do not have permission to transfer this student.');
    error.status = 403;
    throw error;
  }

  // 2. Validate transfer destination scope limits
  if (user.role === 'SUPERINTENDENT') {
    const assigned = await authorization.getAssignedHostels(user.id);
    if (!assigned.includes(Number(new_hostel_id))) {
      const error = new Error('Forbidden: You can only transfer students to your assigned hostel(s).');
      error.status = 403;
      throw error;
    }

    // Must also make sure student is currently in one of their assigned hostels
    const [rows] = await db.pool.query(
      `SELECT r.hostel_id FROM students s
       LEFT JOIN beds b ON s.bed_id = b.id
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE s.id = ?`,
      [studentId]
    );
    if (rows.length === 0 || !assigned.includes(Number(rows[0].hostel_id))) {
      const error = new Error('Forbidden: You can only transfer students out of your assigned hostel(s).');
      error.status = 403;
      throw error;
    }
  }

  const student = await getStudentById(studentId, user);
  if (student.bed_id === Number(new_bed_id)) {
    return { success: true, message: 'Student is already assigned to this bed.' };
  }

  // 3. Validate target bed structure and availability
  const [bedStructure] = await db.pool.query(
    `SELECT b.id as bed_id, r.id as room_id, r.floor_id, r.hostel_id, b.status as bed_status
     FROM beds b
     JOIN rooms r ON b.room_id = r.id
     JOIN hostels h ON r.hostel_id = h.id
     WHERE b.id = ?`,
    [new_bed_id]
  );

  if (bedStructure.length === 0) {
    const error = new Error('Selected destination bed does not exist.');
    error.status = 400;
    throw error;
  }

  const targetBed = bedStructure[0];
  if (
    targetBed.room_id !== Number(new_room_id) ||
    targetBed.hostel_id !== Number(new_hostel_id) ||
    (new_floor_id && targetBed.floor_id && targetBed.floor_id !== Number(new_floor_id))
  ) {
    const error = new Error('Invalid destination relationship: Bed does not belong to the selected room, floor, or hostel.');
    error.status = 400;
    throw error;
  }

  if (targetBed.bed_status !== 'AVAILABLE') {
    const error = new Error('Selected destination bed is not available.');
    error.status = 400;
    throw error;
  }

  // 4. Perform transaction
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Free old bed if assigned
    if (student.bed_id) {
      await connection.query(
        "UPDATE beds SET status = 'AVAILABLE' WHERE id = ?",
        [student.bed_id]
      );
    }

    // B. Occupy new bed
    await connection.query(
      "UPDATE beds SET status = 'OCCUPIED' WHERE id = ?",
      [new_bed_id]
    );

    // C. Update student assignment
    await connection.query(
      "UPDATE students SET bed_id = ? WHERE id = ?",
      [new_bed_id, studentId]
    );

    // D. Update student_allocations history
    const transferDate = new Date().toISOString().slice(0, 10);
    await connection.query(
      `UPDATE student_allocations 
       SET status = 'TRANSFERRED', allocated_until = ?, transfer_reason = 'Transferred to new room/hostel'
       WHERE student_id = ? AND status = 'ACTIVE'`,
      [transferDate, studentId]
    );

    await connection.query(
      `INSERT INTO student_allocations (student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [studentId, new_hostel_id, new_room_id, new_bed_id, transferDate, user?.id || 1]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Deactivates/archives a student user and frees their assigned bed.
 */
const deactivateStudent = async (studentId, newStatus, user) => {
  if (!['INACTIVE', 'GRADUATED'].includes(newStatus)) {
    const error = new Error('Invalid deactivation status. Supported: INACTIVE, GRADUATED.');
    error.status = 400;
    throw error;
  }

  return updateStudent(studentId, { status: newStatus }, user);
};

/**
 * Mass import students from parsed Excel/CSV data (12 Fields).
 */
const bulkImportStudents = async (records, creator) => {
  if (!records || !Array.isArray(records) || records.length === 0) {
    const error = new Error('No student records provided for import.');
    error.status = 400;
    throw error;
  }

  const connection = await db.pool.getConnection();
  const summary = {
    total: records.length,
    importedCount: 0,
    skippedCount: 0,
    errors: []
  };

  try {
    const [roleRows] = await connection.query("SELECT id FROM roles WHERE name = 'STUDENT'");
    const studentRoleId = roleRows[0] ? roleRows[0].id : 4;

    // Cache hostels, floors, rooms, beds for speed
    const [allHostels] = await connection.query('SELECT id, name, code FROM hostels');

    for (let idx = 0; idx < records.length; idx++) {
      const rec = records[idx];
      const rowNum = idx + 1;

      // Map 12 fields (support various casing / column names from Google Form)
      const fullName = (rec['Student Name\n'] || rec['Student Name'] || rec.name || rec.full_name || '').toString().trim();
      const rawDob = rec['D.O.B'] || rec.dob || rec.date_of_birth;
      let rawRegNo = (rec['Registration No.(1st year student add N/A)'] || rec['Registration No.'] || rec['Registration No'] || rec.registrationNo || rec.student_id || rec.roll_number || '').toString().trim();
      if (rawRegNo.toUpperCase() === 'N/A' || rawRegNo.toUpperCase() === 'NA') {
        rawRegNo = '';
      }

      const rawEmail = (rec['Email Id'] || rec['Email ID'] || rec['Email'] || rec.email || '').toString().trim().toLowerCase();
      const course = (rec['Course'] || rec.course || 'B.Tech').toString().trim();
      const branch = (rec['stream'] || rec.stream || rec.branch || 'CSE').toString().trim();
      const year = parseInt(rec['Year'] || rec.year || 1, 10) || 1;
      const semester = parseInt(rec['Semister'] || rec.semester || 1, 10) || 1;
      const hostelInput = (rec['Hostel Choose'] || rec['Hostel'] || rec.hostel || 'Main Hostel').toString().trim();
      const floorInput = (rec['Floor  Choose'] || rec['Floor Choose'] || rec['Floor'] || rec.floor || 'Floor 1').toString().trim();
      const photoUrl = (rec['Passport Size Photo'] || rec.photoUrl || rec.photo_url || '').toString().trim();
      const roomNoInput = (rec['ROOM NO'] || rec['Room No'] || rec.roomNo || rec.room_number || '101').toString().trim();

      if (!fullName) {
        summary.skippedCount++;
        summary.errors.push({ row: rowNum, name: 'N/A', regNo: rawRegNo || 'N/A', reason: 'Missing Student Name' });
        continue;
      }

      // Generate Registration No if missing
      let finalRegNo = rawRegNo;
      if (!finalRegNo) {
        const randomDigits = Math.floor(100000 + Math.random() * 900000);
        finalRegNo = `REG${randomDigits}`;
      }

      // Generate Email if missing
      let finalEmail = rawEmail;
      if (!finalEmail) {
        const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
        finalEmail = `${cleanName || 'student'}_${finalRegNo.toLowerCase()}@bec.ac.in`;
      }

      // Parse DOB & default password
      let dobStr = null;
      let defaultPass = 'password123';
      if (rawDob) {
        if (typeof rawDob === 'number') {
          const dateObj = new Date(Math.round((rawDob - 25569) * 86400 * 1000));
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          dobStr = `${yyyy}-${mm}-${dd}`;
          defaultPass = `${dd}${mm}${yyyy}`;
        } else {
          const str = String(rawDob).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            dobStr = str;
            const [y, m, d] = str.split('-');
            defaultPass = `${d}${m}${y}`;
          } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
            const parts = str.split(/[\/\-]/);
            const num1 = parseInt(parts[0], 10);
            const num2 = parseInt(parts[1], 10);
            const y = parts[2];
            let d, m;
            if (num1 > 12) {
              d = String(num1).padStart(2, '0');
              m = String(num2).padStart(2, '0');
            } else if (num2 > 12) {
              m = String(num1).padStart(2, '0');
              d = String(num2).padStart(2, '0');
            } else {
              // Default Google Form export (MM/DD/YYYY)
              m = String(num1).padStart(2, '0');
              d = String(num2).padStart(2, '0');
            }
            dobStr = `${y}-${m}-${d}`;
            defaultPass = `${d}${m}${y}`;
          }
        }
      }

      await connection.beginTransaction();

      try {
        // Check uniqueness of student_id and email
        const [existing] = await connection.query(
          'SELECT id FROM users WHERE username = ? OR email = ?',
          [finalRegNo, finalEmail]
        );
        if (existing.length > 0) {
          await connection.rollback();
          summary.skippedCount++;
          summary.errors.push({ row: rowNum, name: fullName, regNo: finalRegNo, reason: `Registration No or Email '${finalRegNo}'/'${finalEmail}' already exists` });
          continue;
        }

        // 1. Resolve Hostel (Auto-create if not found)
        let targetHostel = allHostels.find(h => 
          h.name.toLowerCase() === hostelInput.toLowerCase() || 
          h.code.toLowerCase() === hostelInput.toLowerCase()
        );
        if (!targetHostel) {
          const isGirls = hostelInput.toLowerCase().includes('girls') || hostelInput.toLowerCase().includes('female');
          const hostelGender = isGirls ? 'FEMALE' : 'MALE';
          const cleanName = hostelInput || (isGirls ? 'Baramunda Girls Hostel' : 'Baramunda Boys Hostel');
          let hostelCode = cleanName.split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 8);
          if (!hostelCode || allHostels.some(h => h.code === hostelCode)) {
            hostelCode = `${hostelCode || 'HST'}${allHostels.length + 1}`;
          }

          const [newHostelRes] = await connection.query(
            'INSERT INTO hostels (name, code, gender, location, status) VALUES (?, ?, ?, ?, "ACTIVE")',
            [cleanName, hostelCode, hostelGender, 'Bhubaneswar, Odisha, India']
          );
          targetHostel = {
            id: newHostelRes.insertId,
            name: cleanName,
            code: hostelCode
          };
          allHostels.push(targetHostel);
        }

        // 2. Resolve Floor
        let targetFloorId = null;
        let floorNum = parseInt(floorInput.replace(/[^0-9]/g, '') || '1', 10);
        const [floors] = await connection.query(
          'SELECT id FROM floors WHERE hostel_id = ? AND (floor_name = ? OR floor_number = ?)',
          [targetHostel.id, floorInput, floorNum]
        );
        if (floors.length > 0) {
          targetFloorId = floors[0].id;
        } else {
          // Auto-create floor if not found
          const [newFloorRes] = await connection.query(
            'INSERT INTO floors (hostel_id, floor_name, floor_number, status) VALUES (?, ?, ?, "ACTIVE")',
            [targetHostel.id, floorInput || `Floor ${floorNum}`, floorNum]
          );
          targetFloorId = newFloorRes.insertId;
        }

        // 3. Resolve Room
        let targetRoomId = null;
        const roomNumStr = roomNoInput || '101';
        const [rooms] = await connection.query(
          'SELECT id FROM rooms WHERE hostel_id = ? AND room_number = ?',
          [targetHostel.id, roomNumStr]
        );
        if (rooms.length > 0) {
          targetRoomId = rooms[0].id;
        } else {
          // Auto-create room if not found
          const [newRoomRes] = await connection.query(
            'INSERT INTO rooms (hostel_id, floor_id, room_number, capacity, status) VALUES (?, ?, ?, 4, "ACTIVE")',
            [targetHostel.id, targetFloorId, roomNumStr]
          );
          targetRoomId = newRoomRes.insertId;
        }

        // 4. Resolve Bed
        let targetBedId = null;
        const [availBeds] = await connection.query(
          'SELECT id FROM beds WHERE room_id = ? AND status = "AVAILABLE" ORDER BY id ASC LIMIT 1',
          [targetRoomId]
        );
        if (availBeds.length > 0) {
          targetBedId = availBeds[0].id;
        } else {
          // Auto-create bed if full or none available
          const [allRoomBeds] = await connection.query('SELECT COUNT(*) as cnt FROM beds WHERE room_id = ?', [targetRoomId]);
          const bedCount = (allRoomBeds[0]?.cnt || 0) + 1;
          const [newBedRes] = await connection.query(
            'INSERT INTO beds (room_id, bed_number, status) VALUES (?, ?, "AVAILABLE")',
            [targetRoomId, `Bed ${bedCount}`]
          );
          targetBedId = newBedRes.insertId;
        }

        // Hash password
        const passwordHash = await passwordUtil.hashPassword(defaultPass);

        // Create User
        const [userRes] = await connection.query(
          `INSERT INTO users (role_id, username, email, full_name, password_hash, status)
           VALUES (?, ?, ?, ?, ?, "ACTIVE")`,
          [studentRoleId, finalRegNo, finalEmail, fullName, passwordHash]
        );
        const newUserId = userRes.insertId;

        // Create Student
        const [studentRes] = await connection.query(
          `INSERT INTO students (user_id, student_id, roll_number, full_name, date_of_birth, photo_url, phone, email, branch, course, year, semester, bed_id, admission_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, "ACTIVE")`,
          [newUserId, finalRegNo, finalRegNo, fullName, dobStr, photoUrl || null, '0000000000', finalEmail, branch, course, year, semester, targetBedId]
        );
        const newStudentId = studentRes.insertId;

        // Mark Bed as OCCUPIED
        await connection.query('UPDATE beds SET status = "OCCUPIED" WHERE id = ?', [targetBedId]);

        // Insert Allocation record
        const todayStr = new Date().toISOString().slice(0, 10);
        await connection.query(
          `INSERT INTO student_allocations (student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by)
           VALUES (?, ?, ?, ?, ?, "ACTIVE", ?)`,
          [newStudentId, targetHostel.id, targetRoomId, targetBedId, todayStr, creator?.id || 1]
        );

        await connection.commit();
        summary.importedCount++;
      } catch (err) {
        await connection.rollback();
        summary.skippedCount++;
        summary.errors.push({ row: rowNum, name: fullName, regNo: finalRegNo, reason: err.message });
      }
    }

    return summary;
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  transferStudent,
  deactivateStudent,
  bulkImportStudents
};
