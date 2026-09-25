const db = require('../config/db');
const activityService = require('./activityService');

/**
 * Generate a unique Pass Number e.g. GP-20260923-4812
 */
function generatePassNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `GP-${dateStr}-${randomSuffix}`;
}

/**
 * Helper to get student record by user_id
 */
async function getStudentByUserId(userId) {
  const [rows] = await db.pool.query(
    `SELECT s.*, b.room_id, r.hostel_id, h.name as hostel_name, r.room_number, b.bed_number
     FROM students s
     LEFT JOIN beds b ON s.bed_id = b.id
     LEFT JOIN rooms r ON b.room_id = r.id
     LEFT JOIN hostels h ON r.hostel_id = h.id
     WHERE s.user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Helper to get assigned hostel IDs for a superintendent
 */
async function getAssignedHostelIds(userId) {
  const [rows] = await db.pool.query(
    `SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?`,
    [userId]
  );
  return rows.map((r) => r.hostel_id);
}

/**
 * Create a new Gate Pass request (Student side)
 */
async function requestGatePass(user, data) {
  const student = await getStudentByUserId(user.id);
  if (!student) {
    throw new Error('Student profile not found.');
  }

  if (!student.hostel_id) {
    throw new Error('You must have an active hostel bed allocation to apply for a Gate Pass.');
  }

  const {
    pass_type = 'LOCAL_OUTING',
    out_date_time,
    expected_in_date_time,
    reason,
    destination,
    parent_phone
  } = data;

  if (!out_date_time || !expected_in_date_time || !reason) {
    throw new Error('Out Date/Time, Expected In Date/Time, and Reason are required.');
  }

  const outDate = new Date(out_date_time);
  const inDate = new Date(expected_in_date_time);

  if (isNaN(outDate.getTime()) || isNaN(inDate.getTime())) {
    throw new Error('Invalid Date/Time values provided.');
  }

  if (inDate <= outDate) {
    throw new Error('Expected return time must be later than departure time.');
  }

  // Generate unique pass number
  let passNumber = generatePassNumber();
  let isUnique = false;
  let retries = 0;
  while (!isUnique && retries < 5) {
    const [existing] = await db.pool.query('SELECT id FROM gate_passes WHERE pass_number = ?', [passNumber]);
    if (existing.length === 0) {
      isUnique = true;
    } else {
      passNumber = generatePassNumber();
      retries++;
    }
  }

  const query = `
    INSERT INTO gate_passes (
      pass_number, student_id, hostel_id, pass_type,
      out_date_time, expected_in_date_time, reason,
      destination, parent_phone, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `;

  const values = [
    passNumber,
    student.id,
    student.hostel_id,
    pass_type,
    out_date_time,
    expected_in_date_time,
    reason.trim(),
    destination ? destination.trim() : null,
    parent_phone ? parent_phone.trim() : student.phone
  ];

  const [result] = await db.pool.query(query, values);
  const passId = result.insertId;

  // Log activity
  await activityService.logActivity({
    actorId: user.id,
    action: 'CREATE_GATE_PASS',
    module: 'GATE_PASS',
    entityType: 'GATE_PASS',
    entityId: passId,
    hostelId: student.hostel_id,
    studentId: student.id,
    description: `Requested Gate Pass ${passNumber} (${pass_type})`,
    metadata: { passNumber, pass_type, out_date_time, expected_in_date_time }
  });

  return getGatePassById(user, passId);
}

/**
 * Fetch Gate Passes with role-based scoping and filtering
 */
async function getGatePasses(user, filters = {}) {
  const {
    status,
    pass_type,
    hostel_id,
    search,
    page = 1,
    limit = 20
  } = filters;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const params = [];
  const whereClauses = [];

  // Role Scoping
  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student) return { data: [], total: 0, page: 1, limit: 20 };
    whereClauses.push('gp.student_id = ?');
    params.push(student.id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (assignedHostels.length === 0) return { data: [], total: 0, page: 1, limit: 20 };
    whereClauses.push(`gp.hostel_id IN (${assignedHostels.map(() => '?').join(',')})`);
    params.push(...assignedHostels);
  }

  // Filters
  if (status) {
    whereClauses.push('gp.status = ?');
    params.push(status);
  }

  if (pass_type) {
    whereClauses.push('gp.pass_type = ?');
    params.push(pass_type);
  }

  if (hostel_id && user.role !== 'STUDENT') {
    whereClauses.push('gp.hostel_id = ?');
    params.push(hostel_id);
  }

  if (search) {
    whereClauses.push('(gp.pass_number LIKE ? OR s.full_name LIKE ? OR s.roll_number LIKE ? OR gp.destination LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count query
  const countSql = `
    SELECT COUNT(*) as total
    FROM gate_passes gp
    JOIN students s ON gp.student_id = s.id
    ${whereSql}
  `;
  const [countRows] = await db.pool.query(countSql, params);
  const total = countRows[0].total;

  // Data query
  const dataSql = `
    SELECT 
      gp.*,
      s.full_name as student_name,
      s.roll_number,
      s.phone as student_phone,
      s.branch,
      s.year,
      h.name as hostel_name,
      h.code as hostel_code,
      r.room_number,
      b.bed_number,
      u.full_name as approved_by_name
    FROM gate_passes gp
    JOIN students s ON gp.student_id = s.id
    JOIN hostels h ON gp.hostel_id = h.id
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON gp.approved_by = u.id
    ${whereSql}
    ORDER BY gp.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.pool.query(dataSql, [...params, parseInt(limit, 10), offset]);

  return {
    data: rows,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
}

/**
 * Get single gate pass by ID with authorization check
 */
async function getGatePassById(user, passId) {
  const sql = `
    SELECT 
      gp.*,
      s.full_name as student_name,
      s.roll_number,
      s.phone as student_phone,
      s.branch,
      s.year,
      h.name as hostel_name,
      h.code as hostel_code,
      r.room_number,
      b.bed_number,
      u.full_name as approved_by_name
    FROM gate_passes gp
    JOIN students s ON gp.student_id = s.id
    JOIN hostels h ON gp.hostel_id = h.id
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON gp.approved_by = u.id
    WHERE gp.id = ? OR gp.pass_number = ?
  `;

  const [rows] = await db.pool.query(sql, [passId, passId]);
  if (rows.length === 0) {
    throw new Error('Gate Pass not found.');
  }

  const pass = rows[0];

  // Authorization Check
  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student || student.id !== pass.student_id) {
      throw new Error('Unauthorized to view this Gate Pass.');
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (!assignedHostels.includes(pass.hostel_id)) {
      throw new Error('Unauthorized: This Gate Pass belongs to an unassigned hostel.');
    }
  }

  return pass;
}

/**
 * Approve or Reject a Gate Pass (Warden / Admin)
 */
async function approveRejectGatePass(user, passId, { action, rejection_reason }) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to approve or reject gate passes.');
  }

  const pass = await getGatePassById(user, passId);

  if (pass.status !== 'PENDING') {
    throw new Error(`Cannot change decision for a Gate Pass that is already ${pass.status}.`);
  }

  const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  const sql = `
    UPDATE gate_passes
    SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ?
    WHERE id = ?
  `;

  await db.pool.query(sql, [
    nextStatus,
    user.id,
    action === 'REJECT' ? (rejection_reason || 'Rejected by Warden') : null,
    pass.id
  ]);

  // Log activity
  await activityService.logActivity({
    actorId: user.id,
    action: action === 'APPROVE' ? 'APPROVE_GATE_PASS' : 'REJECT_GATE_PASS',
    module: 'GATE_PASS',
    entityType: 'GATE_PASS',
    entityId: pass.id,
    hostelId: pass.hostel_id,
    studentId: pass.student_id,
    description: `${action === 'APPROVE' ? 'Approved' : 'Rejected'} Gate Pass ${pass.pass_number}`,
    metadata: { action, passNumber: pass.pass_number, rejection_reason }
  });

  return getGatePassById(user, pass.id);
}

/**
 * Cancel a pending Gate Pass (Student)
 */
async function cancelGatePass(user, passId) {
  const pass = await getGatePassById(user, passId);

  if (pass.status !== 'PENDING') {
    throw new Error('Only PENDING gate pass requests can be cancelled.');
  }

  await db.pool.query("UPDATE gate_passes SET status = 'CANCELLED' WHERE id = ?", [pass.id]);

  await activityService.logActivity({
    actorId: user.id,
    action: 'CANCEL_GATE_PASS',
    module: 'GATE_PASS',
    entityType: 'GATE_PASS',
    entityId: pass.id,
    hostelId: pass.hostel_id,
    studentId: pass.student_id,
    description: `Cancelled Gate Pass ${pass.pass_number}`,
    metadata: { passNumber: pass.pass_number }
  });

  return getGatePassById(user, pass.id);
}

/**
 * Security Guard / Staff Action: Mark Check-Out or Return
 */
async function securityGateAction(user, { pass_identifier, action, security_remarks }) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to perform security gate actions.');
  }

  const pass = await getGatePassById(user, pass_identifier);

  if (action === 'CHECK_OUT') {
    if (pass.status !== 'APPROVED') {
      throw new Error(`Gate Pass must be APPROVED before checking out. Current status: ${pass.status}`);
    }
    await db.pool.query(
      `UPDATE gate_passes 
       SET status = 'CHECKED_OUT', actual_out_time = NOW(), security_remarks = ?
       WHERE id = ?`,
      [security_remarks || 'Outing verified at main gate', pass.id]
    );
  } else if (action === 'CHECK_IN' || action === 'RETURN') {
    if (pass.status !== 'CHECKED_OUT') {
      throw new Error(`Gate Pass must be CHECKED_OUT before marking return. Current status: ${pass.status}`);
    }
    await db.pool.query(
      `UPDATE gate_passes 
       SET status = 'RETURNED', actual_in_time = NOW(), security_remarks = ?
       WHERE id = ?`,
      [security_remarks || 'Returned and verified at main gate', pass.id]
    );
  } else {
    throw new Error('Invalid security action. Expected CHECK_OUT or CHECK_IN.');
  }

  await activityService.logActivity({
    actorId: user.id,
    action: `SECURITY_${action}`,
    module: 'GATE_PASS',
    entityType: 'GATE_PASS',
    entityId: pass.id,
    hostelId: pass.hostel_id,
    studentId: pass.student_id,
    description: `Security Action '${action}' for Gate Pass ${pass.pass_number}`,
    metadata: { action, passNumber: pass.pass_number, security_remarks }
  });

  return getGatePassById(user, pass.id);
}

/**
 * Summary Statistics for Gate Passes
 */
async function getGatePassStats(user) {
  let hostelClause = '';
  const params = [];

  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student) return { pending: 0, approved: 0, checkedOut: 0, returnedToday: 0, total: 0 };
    hostelClause = 'WHERE student_id = ?';
    params.push(student.id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (assignedHostels.length === 0) return { pending: 0, approved: 0, checkedOut: 0, returnedToday: 0, total: 0 };
    hostelClause = `WHERE hostel_id IN (${assignedHostels.map(() => '?').join(',')})`;
    params.push(...assignedHostels);
  }

  const sql = `
    SELECT
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'CHECKED_OUT' THEN 1 END) as checkedOut,
      COUNT(CASE WHEN status = 'RETURNED' AND DATE(actual_in_time) = CURDATE() THEN 1 END) as returnedToday,
      COUNT(*) as total
    FROM gate_passes
    ${hostelClause}
  `;

  const [rows] = await db.pool.query(sql, params);
  return rows[0] || { pending: 0, approved: 0, checkedOut: 0, returnedToday: 0, total: 0 };
}

module.exports = {
  requestGatePass,
  getGatePasses,
  getGatePassById,
  approveRejectGatePass,
  cancelGatePass,
  securityGateAction,
  getGatePassStats
};
