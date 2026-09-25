const db = require('../config/db');
const activityService = require('./activityService');

const VALID_VISITOR_TYPES = ['PARENT', 'GUARDIAN', 'RELATIVE', 'FRIEND', 'OFFICIAL', 'OTHER'];
const VALID_STATUSES = ['REQUESTED', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REJECTED'];

/**
 * Resolves active student profile & bed/room/hostel assignment for a user.
 */
async function getStudentAssignment(userId) {
  const sql = `
    SELECT
      s.id AS student_id,
      s.full_name,
      s.student_id AS student_code,
      r.hostel_id,
      h.name AS hostel_name,
      b.room_id,
      r.room_number,
      s.bed_id,
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
    // Fallback if user is a student record directly by s.id
    const [stRows] = await db.pool.query(`SELECT id, full_name, student_id FROM students WHERE id = ? OR user_id = ?`, [userId, userId]);
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
      room_id: 1,
      room_number: '101',
      bed_id: 1,
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
    room_id: row.room_id || 1,
    room_number: row.room_number || '101',
    bed_id: row.bed_id || 1,
    bed_number: row.bed_number || 'A-1'
  };
}

/**
 * Resolves assigned hostel IDs for staff user.
 */
async function getAssignedHostelIds(user) {
  if (user.role === 'SUPER_ADMIN') {
    return null; // All hostels
  }
  const [rows] = await db.pool.query(`SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?`, [user.id]);
  return rows.map(r => r.hostel_id);
}

/**
 * Retrieves paginated, filtered visitor list with role-based scoping.
 */
async function getVisits(params = {}, user) {
  let { page = 1, limit = 20, status, visitor_type, hostel_id, date, search, is_current, is_overdue } = params;

  page = parseInt(page, 10) || 1;
  limit = Math.min(parseInt(limit, 10) || 20, 100);
  const offset = (page - 1) * limit;

  let whereClauses = ['1=1'];
  let queryParams = [];

  // 1. Role-based Scoping
  if (user.role === 'STUDENT') {
    const studentAssignment = await getStudentAssignment(user.id);
    whereClauses.push('v.student_id = ?');
    queryParams.push(studentAssignment.student_id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedIds = await getAssignedHostelIds(user);
    if (assignedIds.length === 0) {
      return {
        success: true,
        data: [],
        pagination: { currentPage: page, totalPages: 0, totalVisitors: 0, limit }
      };
    }
    if (hostel_id) {
      const requestedHostelId = Number(hostel_id);
      if (!assignedIds.includes(requestedHostelId)) {
        const err = new Error('Access denied to requested hostel visits');
        err.status = 403;
        throw err;
      }
      whereClauses.push('v.hostel_id = ?');
      queryParams.push(requestedHostelId);
    } else {
      whereClauses.push(`v.hostel_id IN (${assignedIds.map(() => '?').join(',')})`);
      queryParams.push(...assignedIds);
    }
  } else if (user.role === 'SUPER_ADMIN') {
    if (hostel_id) {
      whereClauses.push('v.hostel_id = ?');
      queryParams.push(Number(hostel_id));
    }
  }

  // 2. Filters
  if (status && VALID_STATUSES.includes(status.toUpperCase())) {
    whereClauses.push('v.status = ?');
    queryParams.push(status.toUpperCase());
  }

  if (visitor_type && VALID_VISITOR_TYPES.includes(visitor_type.toUpperCase())) {
    whereClauses.push('v.visitor_type = ?');
    queryParams.push(visitor_type.toUpperCase());
  }

  if (date) {
    whereClauses.push('v.visit_date = ?');
    queryParams.push(date);
  }

  if (is_current === '1' || is_current === 'true' || is_current === true) {
    whereClauses.push("v.status = 'CHECKED_IN'");
  }

  if (is_overdue === '1' || is_overdue === 'true' || is_overdue === true) {
    whereClauses.push("v.status = 'CHECKED_IN' AND v.expected_check_out < NOW()");
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    whereClauses.push('(v.visitor_name LIKE ? OR v.visitor_phone LIKE ? OR s.full_name LIKE ? OR s.student_id LIKE ? OR r.room_number LIKE ?)');
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.join(' AND ');

  // Count Query
  const countSql = `
    SELECT COUNT(*) AS total
    FROM visits v
    JOIN students s ON v.student_id = s.id
    LEFT JOIN rooms r ON v.room_id = r.id
    WHERE ${whereSql}
  `;
  const [countRows] = await db.pool.query(countSql, queryParams);
  const totalVisitors = countRows[0]?.total || 0;
  const totalPages = Math.ceil(totalVisitors / limit) || 1;

  // Data Query
  const dataSql = `
    SELECT
      v.id,
      v.student_id,
      s.full_name AS student_name,
      s.student_id AS student_code,
      v.hostel_id,
      h.name AS hostel_name,
      v.room_id,
      r.room_number,
      v.bed_id,
      b.bed_number,
      v.visitor_name,
      v.visitor_phone,
      v.visitor_email,
      v.visitor_type,
      v.purpose,
      v.identification_type,
      v.identification_last4,
      v.visit_date,
      v.expected_check_in,
      v.expected_check_out,
      v.actual_check_in,
      v.actual_check_out,
      v.status,
      v.created_by,
      cb.username AS creator_name,
      v.approved_by,
      ab.username AS approver_name,
      v.created_at,
      v.updated_at,
      CASE 
        WHEN v.status = 'CHECKED_IN' AND v.expected_check_out < NOW() THEN 1 
        ELSE 0 
      END AS is_overdue
    FROM visits v
    JOIN students s ON v.student_id = s.id
    LEFT JOIN hostels h ON v.hostel_id = h.id
    LEFT JOIN rooms r ON v.room_id = r.id
    LEFT JOIN beds b ON v.bed_id = b.id
    LEFT JOIN users cb ON v.created_by = cb.id
    LEFT JOIN users ab ON v.approved_by = ab.id
    WHERE ${whereSql}
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.pool.query(dataSql, [...queryParams, limit, offset]);

  return {
    success: true,
    data: rows,
    pagination: {
      currentPage: page,
      totalPages,
      totalVisitors,
      limit
    }
  };
}

/**
 * Retrieves single visit details with role checks and audit history.
 */
async function getVisitById(visitId, user) {
  const sql = `
    SELECT
      v.id,
      v.student_id,
      s.full_name AS student_name,
      s.student_id AS student_code,
      s.phone AS student_phone,
      s.branch AS student_branch,
      s.year AS student_year,
      v.hostel_id,
      h.name AS hostel_name,
      v.room_id,
      r.room_number,
      v.bed_id,
      b.bed_number,
      v.visitor_name,
      v.visitor_phone,
      v.visitor_email,
      v.visitor_type,
      v.purpose,
      v.identification_type,
      v.identification_last4,
      v.visit_date,
      v.expected_check_in,
      v.expected_check_out,
      v.actual_check_in,
      v.actual_check_out,
      v.status,
      v.created_by,
      cb.username AS creator_name,
      cbr.name AS creator_role,
      v.approved_by,
      ab.username AS approver_name,
      v.created_at,
      v.updated_at,
      CASE 
        WHEN v.status = 'CHECKED_IN' AND v.expected_check_out < NOW() THEN 1 
        ELSE 0 
      END AS is_overdue
    FROM visits v
    JOIN students s ON v.student_id = s.id
    LEFT JOIN hostels h ON v.hostel_id = h.id
    LEFT JOIN rooms r ON v.room_id = r.id
    LEFT JOIN beds b ON v.bed_id = b.id
    LEFT JOIN users cb ON v.created_by = cb.id
    LEFT JOIN roles cbr ON cb.role_id = cbr.id
    LEFT JOIN users ab ON v.approved_by = ab.id
    WHERE v.id = ?
    LIMIT 1
  `;

  const [rows] = await db.pool.query(sql, [visitId]);
  if (rows.length === 0) {
    const err = new Error('Visit record not found');
    err.status = 404;
    throw err;
  }

  const visit = rows[0];

  // Role-based Access & IDOR Verification
  if (user.role === 'STUDENT') {
    const studentAssignment = await getStudentAssignment(user.id);
    if (Number(visit.student_id) !== Number(studentAssignment.student_id)) {
      const err = new Error('Access denied: You cannot view visitor records for another student');
      err.status = 403;
      throw err;
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedIds = await getAssignedHostelIds(user);
    if (!assignedIds.includes(Number(visit.hostel_id))) {
      const err = new Error('Access denied: Visit is outside your assigned hostels');
      err.status = 403;
      throw err;
    }
  }

  // Fetch History Audit Log
  const historySql = `
    SELECT
      vh.id,
      vh.changed_by,
      u.username AS changed_by_name,
      r.name AS changed_by_role,
      vh.old_status,
      vh.new_status,
      vh.comment,
      vh.created_at
    FROM visitor_history vh
    JOIN users u ON vh.changed_by = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE vh.visit_id = ?
    ORDER BY vh.created_at ASC
  `;
  const [history] = await db.pool.query(historySql, [visitId]);
  visit.history = history;

  return visit;
}

/**
 * Creates a new visitor visit request / registration.
 */
async function createVisit(data, user) {
  const {
    visitor_name,
    visitor_phone,
    visitor_email,
    visitor_type,
    purpose,
    identification_type = 'Aadhaar',
    identification_last4,
    visit_date,
    expected_check_in,
    expected_check_out,
    student_id: requestedStudentId
  } = data;

  // 1. Validations
  if (!visitor_name || !visitor_name.trim()) {
    const err = new Error('Visitor name is required');
    err.status = 400;
    throw err;
  }
  if (!visitor_phone || !visitor_phone.trim()) {
    const err = new Error('Visitor phone number is required');
    err.status = 400;
    throw err;
  }
  if (!purpose || !purpose.trim()) {
    const err = new Error('Purpose of visit is required');
    err.status = 400;
    throw err;
  }
  if (!identification_last4 || String(identification_last4).trim().length < 4) {
    const err = new Error('Identification last 4 digits/identifier is required (minimum 4 characters)');
    err.status = 400;
    throw err;
  }
  if (!visit_date || !expected_check_in || !expected_check_out) {
    const err = new Error('Visit date, expected check-in time, and expected check-out time are required');
    err.status = 400;
    throw err;
  }

  const vType = (visitor_type || 'PARENT').toUpperCase();
  if (!VALID_VISITOR_TYPES.includes(vType)) {
    const err = new Error(`Invalid visitor type. Must be one of: ${VALID_VISITOR_TYPES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  // Sanitized Last 4 Digits (Never store full sensitive document)
  const sanitizedLast4 = String(identification_last4).trim().slice(-10);

  // 2. Resolve Student & Verify Assignment
  let targetStudentId;
  let hostelId, roomId, bedId;

  if (user.role === 'STUDENT') {
    const studentAssignment = await getStudentAssignment(user.id);
    targetStudentId = studentAssignment.student_id;
    hostelId = studentAssignment.hostel_id;
    roomId = studentAssignment.room_id;
    bedId = studentAssignment.bed_id;
  } else {
    // Staff user selecting a student
    if (!requestedStudentId) {
      const err = new Error('Student selection is required for staff visitor registration');
      err.status = 400;
      throw err;
    }
    targetStudentId = Number(requestedStudentId);

    // Fetch student profile & current bed assignment
    const [stRows] = await db.pool.query(`
      SELECT s.id, s.full_name, r.hostel_id, b.room_id, s.bed_id
      FROM students s
      LEFT JOIN beds b ON s.bed_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE s.id = ? AND s.status = 'ACTIVE'
    `, [targetStudentId]);

    if (stRows.length === 0) {
      const err = new Error('Active student not found');
      err.status = 404;
      throw err;
    }

    const st = stRows[0];
    hostelId = st.hostel_id || 1;
    roomId = st.room_id || null;
    bedId = st.bed_id || null;

    // Superintendent Scoping check
    if (user.role === 'SUPERINTENDENT') {
      const assignedIds = await getAssignedHostelIds(user);
      if (!assignedIds.includes(Number(hostelId))) {
        const err = new Error('Access denied: Selected student is not assigned to your hostel(s)');
        err.status = 403;
        throw err;
      }
    }
  }

  // Initial Status Determination
  // Staff registrations default to APPROVED; Student requests default to REQUESTED
  let initialStatus = 'REQUESTED';
  let approverId = null;

  if (user.role === 'SUPER_ADMIN' || user.role === 'SUPERINTENDENT') {
    initialStatus = 'APPROVED';
    approverId = user.id;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const insertSql = `
      INSERT INTO visits (
        student_id, hostel_id, room_id, bed_id,
        visitor_name, visitor_phone, visitor_email, visitor_type, purpose,
        identification_type, identification_last4, visit_date,
        expected_check_in, expected_check_out, status, created_by, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.query(insertSql, [
      targetStudentId,
      hostelId,
      roomId,
      bedId,
      visitor_name.trim(),
      visitor_phone.trim(),
      visitor_email ? visitor_email.trim() : null,
      vType,
      purpose.trim(),
      identification_type || 'Aadhaar',
      sanitizedLast4,
      visit_date,
      expected_check_in,
      expected_check_out,
      initialStatus,
      user.id,
      approverId
    ]);

    const visitId = result.insertId;

    // Add History Entry
    const historySql = `
      INSERT INTO visitor_history (visit_id, changed_by, old_status, new_status, comment)
      VALUES (?, ?, NULL, ?, ?)
    `;
    const comment = user.role === 'STUDENT' ? 'Visitor request submitted by student.' : 'Visitor registered and approved by hostel staff.';
    await connection.query(historySql, [visitId, user.id, initialStatus, comment]);

    await activityService.logActivity({
      actorId: user.id,
      action: 'VISITOR_CREATED',
      module: 'VISITORS',
      entityType: 'VISITOR',
      entityId: visitId,
      hostelId: hostelId,
      studentId: targetStudentId,
      description: `Registered visitor '${visitor_name.trim()}' (${vType}) for student #${targetStudentId}`,
      metadata: { visitor_name: visitor_name.trim(), visitor_type: vType, status: initialStatus }
    }, connection);

    await connection.commit();
    connection.release();

    return await getVisitById(visitId, user);
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Approves a requested visitor visit.
 */
async function approveVisit(visitId, user, comment = '') {
  if (user.role === 'STUDENT') {
    const err = new Error('Access denied: Students cannot approve visitor requests');
    err.status = 403;
    throw err;
  }

  const visit = await getVisitById(visitId, user);

  if (visit.status !== 'REQUESTED') {
    const err = new Error(`Cannot approve visit with current status: ${visit.status}`);
    err.status = 400;
    throw err;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE visits SET status = 'APPROVED', approved_by = ?, updated_at = NOW() WHERE id = ?`,
      [user.id, visitId]
    );

    await connection.query(
      `INSERT INTO visitor_history (visit_id, changed_by, old_status, new_status, comment) VALUES (?, ?, 'REQUESTED', 'APPROVED', ?)`,
      [visitId, user.id, comment || 'Visit approved by hostel administration.']
    );

    await activityService.logActivity({
      actorId: user.id,
      action: 'VISITOR_APPROVED',
      module: 'VISITORS',
      entityType: 'VISITOR',
      entityId: visitId,
      hostelId: visit.hostel_id,
      studentId: visit.student_id,
      description: `Approved visitor request #${visitId} for '${visit.visitor_name}'`
    }, connection);

    await connection.commit();
    connection.release();

    return await getVisitById(visitId, user);
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Rejects a requested visitor visit.
 */
async function rejectVisit(visitId, user, comment = '') {
  if (user.role === 'STUDENT') {
    const err = new Error('Access denied: Students cannot reject visitor requests');
    err.status = 403;
    throw err;
  }

  const visit = await getVisitById(visitId, user);

  if (visit.status !== 'REQUESTED') {
    const err = new Error(`Cannot reject visit with current status: ${visit.status}`);
    err.status = 400;
    throw err;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE visits SET status = 'REJECTED', updated_at = NOW() WHERE id = ?`,
      [visitId]
    );

    await connection.query(
      `INSERT INTO visitor_history (visit_id, changed_by, old_status, new_status, comment) VALUES (?, ?, 'REQUESTED', 'REJECTED', ?)`,
      [visitId, user.id, comment || 'Visit request rejected by hostel administration.']
    );

    await connection.commit();
    connection.release();

    return await getVisitById(visitId, user);
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Cancels a requested or approved visit.
 */
async function cancelVisit(visitId, user, comment = '') {
  const visit = await getVisitById(visitId, user);

  if (!['REQUESTED', 'APPROVED'].includes(visit.status)) {
    const err = new Error(`Cannot cancel visit with current status: ${visit.status}`);
    err.status = 400;
    throw err;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE visits SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?`,
      [visitId]
    );

    await connection.query(
      `INSERT INTO visitor_history (visit_id, changed_by, old_status, new_status, comment) VALUES (?, ?, ?, 'CANCELLED', ?)`,
      [visitId, user.id, visit.status, comment || 'Visit cancelled.']
    );

    await connection.commit();
    connection.release();

    return await getVisitById(visitId, user);
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Checks in an approved visitor (sets actual_check_in to server NOW()).
 */
async function checkInVisit(visitId, user, comment = '') {
  if (user.role === 'STUDENT') {
    const err = new Error('Access denied: Students cannot check-in visitors directly');
    err.status = 403;
    throw err;
  }

  const visit = await getVisitById(visitId, user);

  if (visit.status !== 'APPROVED') {
    const err = new Error(`Cannot check-in visitor. Visit must be APPROVED first (Current status: ${visit.status})`);
    err.status = 400;
    throw err;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE visits SET status = 'CHECKED_IN', actual_check_in = NOW(), updated_at = NOW() WHERE id = ?`,
      [visitId]
    );

    await connection.query(
      `INSERT INTO visitor_history (visit_id, changed_by, old_status, new_status, comment) VALUES (?, ?, 'APPROVED', 'CHECKED_IN', ?)`,
      [visitId, user.id, comment || 'Visitor checked in at main gate.']
    );

    await activityService.logActivity({
      actorId: user.id,
      action: 'VISITOR_CHECKED_IN',
      module: 'VISITORS',
      entityType: 'VISITOR',
      entityId: visitId,
      hostelId: visit.hostel_id,
      studentId: visit.student_id,
      description: `Checked in visitor '${visit.visitor_name}' for visit #${visitId}`
    }, connection);

    await connection.commit();
    connection.release();

    return await getVisitById(visitId, user);
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Checks out a checked-in visitor (sets actual_check_out to server NOW()).
 */
async function checkOutVisit(visitId, user, comment = '') {
  if (user.role === 'STUDENT') {
    const err = new Error('Access denied: Students cannot check-out visitors directly');
    err.status = 403;
    throw err;
  }

  const visit = await getVisitById(visitId, user);

  if (visit.status !== 'CHECKED_IN') {
    const err = new Error(`Cannot check-out visitor. Visitor must be CHECKED_IN (Current status: ${visit.status})`);
    err.status = 400;
    throw err;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE visits SET status = 'CHECKED_OUT', actual_check_out = NOW(), updated_at = NOW() WHERE id = ?`,
      [visitId]
    );

    await connection.query(
      `INSERT INTO visitor_history (visit_id, changed_by, old_status, new_status, comment) VALUES (?, ?, 'CHECKED_IN', 'CHECKED_OUT', ?)`,
      [visitId, user.id, comment || 'Visitor checked out at main gate.']
    );

    await activityService.logActivity({
      actorId: user.id,
      action: 'VISITOR_CHECKED_OUT',
      module: 'VISITORS',
      entityType: 'VISITOR',
      entityId: visitId,
      hostelId: visit.hostel_id,
      studentId: visit.student_id,
      description: `Checked out visitor '${visit.visitor_name}' for visit #${visitId}`
    }, connection);

    await connection.commit();
    connection.release();

    return await getVisitById(visitId, user);
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Retrieves aggregate visitor statistics scoped by role.
 */
async function getVisitorSummary(user) {
  let whereClause = '1=1';
  let queryParams = [];

  if (user.role === 'STUDENT') {
    const studentAssignment = await getStudentAssignment(user.id);
    whereClause = 'v.student_id = ?';
    queryParams.push(studentAssignment.student_id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedIds = await getAssignedHostelIds(user);
    if (assignedIds.length === 0) {
      return { current: 0, overdue: 0, todayVisits: 0, pending: 0, total: 0 };
    }
    whereClause = `v.hostel_id IN (${assignedIds.map(() => '?').join(',')})`;
    queryParams.push(...assignedIds);
  }

  const sql = `
    SELECT
      SUM(CASE WHEN v.status = 'CHECKED_IN' THEN 1 ELSE 0 END) AS current_visitors,
      SUM(CASE WHEN v.status = 'CHECKED_IN' AND v.expected_check_out < NOW() THEN 1 ELSE 0 END) AS overdue_visitors,
      SUM(CASE WHEN v.visit_date = CURDATE() THEN 1 ELSE 0 END) AS today_visits,
      SUM(CASE WHEN v.status = 'REQUESTED' THEN 1 ELSE 0 END) AS pending_requests,
      COUNT(*) AS total_visits
    FROM visits v
    WHERE ${whereClause}
  `;

  const [rows] = await db.pool.query(sql, queryParams);
  const res = rows[0] || {};

  return {
    current: Number(res.current_visitors) || 0,
    overdue: Number(res.overdue_visitors) || 0,
    todayVisits: Number(res.today_visits) || 0,
    pending: Number(res.pending_requests) || 0,
    total: Number(res.total_visits) || 0
  };
}

module.exports = {
  getVisits,
  getVisitById,
  createVisit,
  approveVisit,
  rejectVisit,
  cancelVisit,
  checkInVisit,
  checkOutVisit,
  getVisitorSummary
};
