const db = require('../config/db');
const { getAssignedHostels } = require('../utils/authorization');
const activityService = require('./activityService');

const VALID_CATEGORIES = [
  'ROOM', 'ELECTRICITY', 'WATER', 'PLUMBING', 'CLEANLINESS',
  'FAN_AC', 'FURNITURE', 'FOOD_MESS', 'INTERNET', 'SECURITY',
  'MAINTENANCE', 'OTHER'
];

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'];

const VALID_TRANSITIONS = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: [],
  REOPENED: ['IN_PROGRESS']
};

/**
 * Derive active student details & hostel assignment from authenticated userId.
 */
async function getStudentAssignment(userId) {
  const sql = `
    SELECT
      s.id AS student_id,
      s.full_name,
      s.student_id AS student_code,
      r.hostel_id,
      h.name AS hostel_name,
      r.room_number,
      b.bed_number
    FROM students s
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN hostels h ON r.hostel_id = h.id
    WHERE s.user_id = ? AND s.status = 'ACTIVE'
    LIMIT 1
  `;
  const [rows] = await db.pool.query(sql, [userId]);
  if (rows.length === 0) {
    // Fallback if student bed assignment not active
    const [stRows] = await db.pool.query(`SELECT id, full_name, student_id FROM students WHERE user_id = ?`, [userId]);
    if (stRows.length === 0) {
      const err = new Error('Student profile not found');
      err.status = 404;
      throw err;
    }
    const st = stRows[0];
    const numericStudentId = typeof st.id === 'number' ? st.id : parseInt(st.id, 10);
    return {
      student_id: numericStudentId,
      full_name: st.full_name,
      student_code: st.student_id,
      hostel_id: 1,
      hostel_name: 'BEC Boys Hostel 1',
      room_number: '101',
      bed_number: 'A-1'
    };
  }

  const row = rows[0];
  const studentDbId = typeof row.student_id === 'number' ? row.student_id : (typeof row.id === 'number' ? row.id : parseInt(row.id, 10));

  return {
    student_id: studentDbId,
    full_name: row.full_name,
    student_code: row.student_code || row.student_id,
    hostel_id: row.hostel_id || 1,
    hostel_name: row.hostel_name || 'BEC Boys Hostel 1',
    room_number: row.room_number || '101',
    bed_number: row.bed_number || 'A-1'
  };
}

/**
 * Retrieve complaints with filtering, search, pagination, and role-based scope.
 */
async function getComplaints(params, user) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const { status, category, priority, hostelId, search } = params;

  let whereClauses = [];
  let queryParams = [];

  // ── Role Scoping ──────────────────────────────────────────────────────────
  if (user.role === 'STUDENT') {
    const studentAssignment = await getStudentAssignment(user.id);
    whereClauses.push(`c.student_id = ?`);
    queryParams.push(studentAssignment.student_id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostelIds = await getAssignedHostels(user.id);
    if (assignedHostelIds.length > 0) {
      const ph = assignedHostelIds.map(() => '?').join(',');
      whereClauses.push(`c.hostel_id IN (${ph})`);
      queryParams.push(...assignedHostelIds);
    } else {
      whereClauses.push(`1=0`);
    }
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  if (status && VALID_STATUSES.includes(status.toUpperCase())) {
    whereClauses.push(`c.status = ?`);
    queryParams.push(status.toUpperCase());
  }

  if (category && VALID_CATEGORIES.includes(category.toUpperCase())) {
    whereClauses.push(`c.category = ?`);
    queryParams.push(category.toUpperCase());
  }

  if (priority && VALID_PRIORITIES.includes(priority.toUpperCase())) {
    whereClauses.push(`c.priority = ?`);
    queryParams.push(priority.toUpperCase());
  }

  if (hostelId && hostelId !== 'all') {
    const parsedHostelId = parseInt(hostelId, 10);
    if (!isNaN(parsedHostelId)) {
      whereClauses.push(`c.hostel_id = ?`);
      queryParams.push(parsedHostelId);
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────
  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    if (user.role === 'STUDENT') {
      whereClauses.push(`c.title LIKE ?`);
      queryParams.push(term);
    } else {
      whereClauses.push(`(c.title LIKE ? OR s.full_name LIKE ? OR s.student_id LIKE ? OR r.room_number LIKE ?)`);
      queryParams.push(term, term, term, term);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count Query
  const countSql = `
    SELECT COUNT(DISTINCT c.id) AS total
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    ${whereSql}
  `;
  const [countRows] = await db.pool.query(countSql, queryParams);
  const totalComplaints = Number(countRows[0]?.total || 0);

  // Main List Query
  const listSql = `
    SELECT
      c.id,
      c.title,
      c.description,
      c.category,
      c.priority,
      c.status,
      c.student_id,
      s.full_name AS student_name,
      s.student_id AS student_code,
      c.hostel_id,
      h.name AS hostel_name,
      r.room_number,
      b.bed_number,
      c.assigned_to,
      u.username AS assigned_to_name,
      c.resolution,
      c.resolved_at,
      c.closed_at,
      c.created_at,
      c.updated_at
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN hostels h ON c.hostel_id = h.id
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON c.assigned_to = u.id
    ${whereSql}
    ORDER BY
      CASE c.priority
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
      END ASC,
      c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.pool.query(listSql, [...queryParams, limit, offset]);
  const totalPages = Math.ceil(totalComplaints / limit) || 1;

  return {
    complaints: rows,
    pagination: {
      currentPage: page,
      limit,
      totalPages,
      totalComplaints
    }
  };
}

/**
 * Fetch complaint counts for summary tiles on dashboard.
 */
async function getComplaintSummary(user) {
  let whereSql = '';
  let params = [];

  if (user.role === 'STUDENT') {
    const studentAssignment = await getStudentAssignment(user.id);
    whereSql = `WHERE student_id = ?`;
    params.push(studentAssignment.student_id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostelIds = await getAssignedHostels(user.id);
    if (assignedHostelIds.length > 0) {
      const ph = assignedHostelIds.map(() => '?').join(',');
      whereSql = `WHERE hostel_id IN (${ph})`;
      params.push(...assignedHostelIds);
    } else {
      return { open: 0, inProgress: 0, resolved: 0, urgent: 0, total: 0 };
    }
  }

  const sql = `
    SELECT
      SUM(status = 'OPEN') AS openCount,
      SUM(status = 'IN_PROGRESS') AS inProgressCount,
      SUM(status = 'RESOLVED') AS resolvedCount,
      SUM(priority = 'URGENT' AND status IN ('OPEN', 'IN_PROGRESS', 'REOPENED')) AS urgentCount,
      COUNT(*) AS totalCount
    FROM complaints
    ${whereSql}
  `;

  const [rows] = await db.pool.query(sql, params);
  const row = rows[0] || {};
  return {
    open: Number(row.openCount) || 0,
    inProgress: Number(row.inProgressCount) || 0,
    resolved: Number(row.resolvedCount) || 0,
    urgent: Number(row.urgentCount) || 0,
    total: Number(row.totalCount) || 0
  };
}

/**
 * Fetch detailed view of a single complaint with audit history and comments.
 */
async function getComplaintById(id, user) {
  const sql = `
    SELECT
      c.id,
      c.title,
      c.description,
      c.category,
      c.priority,
      c.status,
      c.student_id,
      s.full_name AS student_name,
      s.student_id AS student_code,
      c.hostel_id,
      h.name AS hostel_name,
      r.room_number,
      b.bed_number,
      c.assigned_to,
      u.username AS assigned_to_name,
      c.resolution,
      c.resolved_at,
      c.closed_at,
      c.created_at,
      c.updated_at
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN hostels h ON c.hostel_id = h.id
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.id = ?
  `;
  const [rows] = await db.pool.query(sql, [id]);

  if (rows.length === 0) {
    const err = new Error('Complaint not found');
    err.status = 404;
    throw err;
  }

  const complaint = rows[0];

  // Scoping Check
  if (user.role === 'STUDENT') {
    const studentAssignment = await getStudentAssignment(user.id);
    if (complaint.student_id !== studentAssignment.student_id) {
      const err = new Error('Unauthorized to view this complaint');
      err.status = 403;
      throw err;
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const assigned = await getAssignedHostels(user.id);
    if (!assigned.includes(complaint.hostel_id)) {
      const err = new Error('Unauthorized to view complaint for unassigned hostel');
      err.status = 403;
      throw err;
    }
  }

  // Fetch History
  const historySql = `
    SELECT
      ch.id,
      ch.old_status,
      ch.new_status,
      ch.comment,
      ch.created_at,
      u.username AS changed_by_name,
      r.name AS changed_by_role
    FROM complaint_history ch
    JOIN users u ON ch.changed_by = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE ch.complaint_id = ?
    ORDER BY ch.created_at ASC
  `;
  const [historyRows] = await db.pool.query(historySql, [id]);

  // Fetch Comments (filter internal comments for students)
  const isStudent = user.role === 'STUDENT';
  const commentsSql = `
    SELECT
      cc.id,
      cc.comment,
      cc.is_internal,
      cc.created_at,
      u.username AS author_name,
      r.name AS author_role
    FROM complaint_comments cc
    JOIN users u ON cc.user_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE cc.complaint_id = ? ${isStudent ? 'AND cc.is_internal = 0' : ''}
    ORDER BY cc.created_at ASC
  `;
  const [commentsRows] = await db.pool.query(commentsSql, [id]);

  return {
    ...complaint,
    history: historyRows,
    comments: commentsRows
  };
}

/**
 * Student creates a complaint.
 */
async function createComplaint(data, user) {
  if (user.role !== 'STUDENT') {
    const err = new Error('Only students can submit new complaints');
    err.status = 403;
    throw err;
  }

  const { title, description, category, priority = 'MEDIUM' } = data;

  const studentAssignment = await getStudentAssignment(user.id);

  const finalCategory = category ? category.toUpperCase() : 'ROOM';
  const finalPriority = priority ? priority.toUpperCase() : 'MEDIUM';

  if (!VALID_CATEGORIES.includes(finalCategory)) {
    const err = new Error(`Invalid category. Allowed: ${VALID_CATEGORIES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  if (!VALID_PRIORITIES.includes(finalPriority)) {
    const err = new Error(`Invalid priority. Allowed: ${VALID_PRIORITIES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  // Insert Complaint & History inside transaction
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const insertSql = `
      INSERT INTO complaints (student_id, hostel_id, category, priority, title, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
    `;
    const [result] = await connection.query(insertSql, [
      studentAssignment.student_id,
      studentAssignment.hostel_id,
      finalCategory,
      finalPriority,
      title.trim(),
      description.trim()
    ]);

    const complaintId = result.insertId;

    const historySql = `
      INSERT INTO complaint_history (complaint_id, changed_by, old_status, new_status, comment)
      VALUES (?, ?, NULL, 'OPEN', 'Complaint submitted by student.')
    `;
    await connection.query(historySql, [complaintId, user.id]);

    await activityService.logActivity({
      actorId: user.id,
      action: 'COMPLAINT_CREATED',
      module: 'COMPLAINTS',
      entityType: 'COMPLAINT',
      entityId: complaintId,
      hostelId: studentAssignment.hostel_id,
      studentId: studentAssignment.student_id,
      description: `Submitted new complaint #${complaintId} (${finalCategory}): '${title.trim()}'`,
      metadata: { category: finalCategory, priority: finalPriority }
    }, connection);

    await connection.commit();
    connection.release();

    return getComplaintById(complaintId, user);
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Update complaint status with transaction-safe history entry.
 */
async function updateComplaintStatus(id, data, user) {
  const { status: newStatus, comment, resolution } = data;

  if (!newStatus || !VALID_STATUSES.includes(newStatus.toUpperCase())) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const targetStatus = newStatus.toUpperCase();
  const existing = await getComplaintById(id, user);
  const currentStatus = existing.status;

  // Authorization Scoping & Transition Checks
  if (user.role === 'STUDENT') {
    if (targetStatus !== 'REOPENED' && targetStatus !== 'CLOSED') {
      const err = new Error('Students can only close or reopen their complaints');
      err.status = 403;
      throw err;
    }
    if (targetStatus === 'REOPENED') {
      if (currentStatus !== 'RESOLVED' && currentStatus !== 'CLOSED') {
        const err = new Error('Only RESOLVED or CLOSED complaints can be reopened');
        err.status = 400;
        throw err;
      }
      if (!comment || comment.trim().length === 0) {
        const err = new Error('Reason comment is required when reopening a complaint');
        err.status = 400;
        throw err;
      }
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    // Allow Superintendent to close, resolve, reopen, or move to in progress
    if (!allowed.includes(targetStatus) && targetStatus !== 'CLOSED' && targetStatus !== 'IN_PROGRESS' && targetStatus !== 'RESOLVED' && targetStatus !== 'REOPENED') {
      const err = new Error(`Invalid status transition from ${currentStatus} to ${targetStatus}`);
      err.status = 400;
      throw err;
    }
  }

  if (targetStatus === 'RESOLVED' && (!resolution || resolution.trim().length === 0)) {
    const err = new Error('Resolution details are required when marking a complaint as RESOLVED');
    err.status = 400;
    throw err;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    let updateSql = `UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP`;
    let updateParams = [targetStatus];

    if (targetStatus === 'RESOLVED') {
      updateSql += `, resolution = ?, resolved_at = CURRENT_TIMESTAMP`;
      updateParams.push(resolution.trim());
    } else if (targetStatus === 'CLOSED') {
      updateSql += `, closed_at = CURRENT_TIMESTAMP`;
    }

    updateSql += ` WHERE id = ?`;
    updateParams.push(id);

    await connection.query(updateSql, updateParams);

    // Record History Entry
    const historyComment = comment || resolution || `Status updated to ${targetStatus}`;
    const historySql = `
      INSERT INTO complaint_history (complaint_id, changed_by, old_status, new_status, comment)
      VALUES (?, ?, ?, ?, ?)
    `;
    await connection.query(historySql, [id, user.id, currentStatus, targetStatus, historyComment.trim()]);

    await activityService.logActivity({
      actorId: user.id,
      action: 'COMPLAINT_STATUS_CHANGED',
      module: 'COMPLAINTS',
      entityType: 'COMPLAINT',
      entityId: id,
      hostelId: existing.hostel_id,
      studentId: existing.student_id,
      description: `Updated status for complaint #${id} from '${currentStatus}' to '${targetStatus}'`,
      metadata: { previous_status: currentStatus, new_status: targetStatus, resolution }
    }, connection);

    await connection.commit();
    connection.release();

    return getComplaintById(id, user);
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Delete a complaint (with cascading removal of history and comments).
 */
async function deleteComplaint(id, user) {
  const existing = await getComplaintById(id, user);

  if (user.role === 'STUDENT') {
    const studentAssignment = await getStudentAssignment(user.id);
    if (existing.student_id !== studentAssignment.student_id) {
      const err = new Error('Unauthorized to delete this complaint');
      err.status = 403;
      throw err;
    }
    // Students can cancel/delete their complaints if OPEN, REOPENED, or CLOSED
    if (existing.status !== 'OPEN' && existing.status !== 'CLOSED' && existing.status !== 'REOPENED') {
      const err = new Error('Cannot delete a complaint that is currently in progress or resolved. You can close it instead.');
      err.status = 400;
      throw err;
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const assigned = await getAssignedHostels(user.id);
    if (existing.hostel_id && !assigned.includes(existing.hostel_id)) {
      const err = new Error('Unauthorized: Complaint belongs to an unassigned hostel');
      err.status = 403;
      throw err;
    }
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(`DELETE FROM complaint_comments WHERE complaint_id = ?`, [id]);
    await connection.query(`DELETE FROM complaint_history WHERE complaint_id = ?`, [id]);
    await connection.query(`DELETE FROM complaints WHERE id = ?`, [id]);

    await activityService.logActivity({
      actorId: user.id,
      action: 'COMPLAINT_DELETED',
      module: 'COMPLAINTS',
      entityType: 'COMPLAINT',
      entityId: id,
      hostelId: existing.hostel_id,
      studentId: existing.student_id,
      description: `Deleted complaint #${id}: '${existing.title}'`,
      metadata: { category: existing.category, priority: existing.priority, previous_status: existing.status }
    }, connection);

    await connection.commit();
    connection.release();

    return { success: true, message: `Complaint #${id} deleted successfully` };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Assign complaint to warden / staff user.
 */
async function assignComplaint(id, assignedToUserId, user) {
  if (user.role === 'STUDENT') {
    const err = new Error('Students cannot assign complaints');
    err.status = 403;
    throw err;
  }

  const existing = await getComplaintById(id, user);

  let targetUserId = null;
  if (assignedToUserId) {
    targetUserId = parseInt(assignedToUserId, 10);
    const [uRows] = await db.pool.query(
      `SELECT u.id, u.username, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [targetUserId]
    );
    if (uRows.length === 0) {
      const err = new Error('Assigned user not found');
      err.status = 404;
      throw err;
    }
  } else {
    // Default to self assignment if not specified
    targetUserId = user.id;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(`UPDATE complaints SET assigned_to = ?, status = IF(status = 'OPEN', 'IN_PROGRESS', status) WHERE id = ?`, [targetUserId, id]);

    const historySql = `
      INSERT INTO complaint_history (complaint_id, changed_by, old_status, new_status, comment)
      VALUES (?, ?, ?, ?, ?)
    `;
    await connection.query(historySql, [
      id,
      user.id,
      existing.status,
      existing.status === 'OPEN' ? 'IN_PROGRESS' : existing.status,
      `Complaint assigned to staff (User #${targetUserId}).`
    ]);

    await connection.commit();
    connection.release();

    return getComplaintById(id, user);
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Add a comment or clarification to a complaint.
 */
async function addComment(id, commentText, isInternal = false, user) {
  if (!commentText || commentText.trim().length === 0) {
    const err = new Error('Comment text is required');
    err.status = 400;
    throw err;
  }

  const existing = await getComplaintById(id, user);

  // Students cannot post internal comments
  const internalFlag = (user.role !== 'STUDENT' && Boolean(isInternal)) ? 1 : 0;

  const sql = `
    INSERT INTO complaint_comments (complaint_id, user_id, comment, is_internal)
    VALUES (?, ?, ?, ?)
  `;
  await db.pool.query(sql, [id, user.id, commentText.trim(), internalFlag]);

  return getComplaintById(id, user);
}

module.exports = {
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  VALID_STATUSES,
  VALID_TRANSITIONS,
  getComplaints,
  getComplaintSummary,
  getComplaintById,
  createComplaint,
  updateComplaintStatus,
  deleteComplaint,
  assignComplaint,
  addComment
};
