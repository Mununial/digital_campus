const db = require('../config/db');
const activityService = require('./activityService');

/**
 * Generate unique Leave Application Number e.g. LV-20260923-8192
 */
function generateLeaveNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `LV-${dateStr}-${randomSuffix}`;
}

/**
 * Helper to fetch student record by user_id
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
 * Helper to fetch assigned hostel IDs for a superintendent
 */
async function getAssignedHostelIds(userId) {
  const [rows] = await db.pool.query(
    `SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?`,
    [userId]
  );
  return rows.map((r) => r.hostel_id);
}

/**
 * Apply for leave (Student)
 */
async function applyForLeave(user, data) {
  const student = await getStudentByUserId(user.id);
  if (!student) {
    throw new Error('Student profile not found.');
  }

  if (!student.hostel_id) {
    throw new Error('You must have an active hostel bed allocation to apply for Leave.');
  }

  const {
    leave_type = 'HOME_LEAVE',
    start_date,
    end_date,
    reason,
    destination_address,
    emergency_phone,
    document_url
  } = data;

  if (!start_date || !end_date || !reason) {
    throw new Error('Start Date, End Date, and Reason are required.');
  }

  const startDateObj = new Date(start_date);
  const endDateObj = new Date(end_date);

  if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    throw new Error('Invalid Date values provided.');
  }

  if (endDateObj < startDateObj) {
    throw new Error('End Date cannot be earlier than Start Date.');
  }

  // Generate unique leave number
  let leaveNumber = generateLeaveNumber();
  let isUnique = false;
  let retries = 0;
  while (!isUnique && retries < 5) {
    const [existing] = await db.pool.query('SELECT id FROM leave_applications WHERE leave_number = ?', [leaveNumber]);
    if (existing.length === 0) {
      isUnique = true;
    } else {
      leaveNumber = generateLeaveNumber();
      retries++;
    }
  }

  const query = `
    INSERT INTO leave_applications (
      leave_number, student_id, hostel_id, leave_type,
      start_date, end_date, reason,
      destination_address, emergency_phone, document_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `;

  const values = [
    leaveNumber,
    student.id,
    student.hostel_id,
    leave_type,
    start_date,
    end_date,
    reason.trim(),
    destination_address ? destination_address.trim() : null,
    emergency_phone ? emergency_phone.trim() : student.phone,
    document_url ? document_url.trim() : null
  ];

  const [result] = await db.pool.query(query, values);
  const leaveId = result.insertId;

  // Log activity
  await activityService.logActivity({
    actorId: user.id,
    action: 'CREATE_LEAVE_APPLICATION',
    module: 'LEAVE',
    entityType: 'LEAVE',
    entityId: leaveId,
    hostelId: student.hostel_id,
    studentId: student.id,
    description: `Applied for ${leave_type.replace('_', ' ')} (${start_date} to ${end_date})`,
    metadata: { leaveNumber, leave_type, start_date, end_date }
  });

  return getLeaveApplicationById(user, leaveId);
}

/**
 * Fetch Leave Applications with role-based scoping and filtering
 */
async function getLeaveApplications(user, filters = {}) {
  const {
    status,
    leave_type,
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
    whereClauses.push('la.student_id = ?');
    params.push(student.id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (assignedHostels.length === 0) return { data: [], total: 0, page: 1, limit: 20 };
    whereClauses.push(`la.hostel_id IN (${assignedHostels.map(() => '?').join(',')})`);
    params.push(...assignedHostels);
  }

  // Filters
  if (status) {
    if (status === 'ON_LEAVE_TODAY') {
      whereClauses.push("la.status = 'APPROVED' AND CURDATE() BETWEEN la.start_date AND la.end_date");
    } else {
      whereClauses.push('la.status = ?');
      params.push(status);
    }
  }

  if (leave_type) {
    whereClauses.push('la.leave_type = ?');
    params.push(leave_type);
  }

  if (hostel_id && user.role !== 'STUDENT') {
    whereClauses.push('la.hostel_id = ?');
    params.push(hostel_id);
  }

  if (search) {
    whereClauses.push('(la.leave_number LIKE ? OR s.full_name LIKE ? OR s.roll_number LIKE ? OR la.destination_address LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count query
  const countSql = `
    SELECT COUNT(*) as total
    FROM leave_applications la
    JOIN students s ON la.student_id = s.id
    ${whereSql}
  `;
  const [countRows] = await db.pool.query(countSql, params);
  const total = countRows[0].total;

  // Data query
  const dataSql = `
    SELECT 
      la.*,
      DATE_FORMAT(la.start_date, '%Y-%m-%d') as start_date,
      DATE_FORMAT(la.end_date, '%Y-%m-%d') as end_date,
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
    FROM leave_applications la
    JOIN students s ON la.student_id = s.id
    JOIN hostels h ON la.hostel_id = h.id
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON la.approved_by = u.id
    ${whereSql}
    ORDER BY la.created_at DESC
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
 * Get single leave application by ID or Leave Number with scoping
 */
async function getLeaveApplicationById(user, leaveId) {
  const sql = `
    SELECT 
      la.*,
      DATE_FORMAT(la.start_date, '%Y-%m-%d') as start_date,
      DATE_FORMAT(la.end_date, '%Y-%m-%d') as end_date,
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
    FROM leave_applications la
    JOIN students s ON la.student_id = s.id
    JOIN hostels h ON la.hostel_id = h.id
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON la.approved_by = u.id
    WHERE la.id = ? OR la.leave_number = ?
  `;

  const [rows] = await db.pool.query(sql, [leaveId, leaveId]);
  if (rows.length === 0) {
    throw new Error('Leave Application not found.');
  }

  const leave = rows[0];

  // Scoping check
  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student || student.id !== leave.student_id) {
      throw new Error('Unauthorized to view this Leave Application.');
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (!assignedHostels.includes(leave.hostel_id)) {
      throw new Error('Unauthorized: This Leave Application belongs to an unassigned hostel.');
    }
  }

  return leave;
}

/**
 * Approve or Reject Leave Application (Staff)
 */
async function approveRejectLeave(user, leaveId, { action, rejection_reason, remarks }) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to approve or reject leave applications.');
  }

  const leave = await getLeaveApplicationById(user, leaveId);

  if (leave.status !== 'PENDING') {
    throw new Error(`Cannot change decision for a Leave Application that is already ${leave.status}.`);
  }

  const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  const sql = `
    UPDATE leave_applications
    SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ?, remarks = ?
    WHERE id = ?
  `;

  await db.pool.query(sql, [
    nextStatus,
    user.id,
    action === 'REJECT' ? (rejection_reason || 'Rejected by Warden') : null,
    remarks || null,
    leave.id
  ]);

  // Log activity
  await activityService.logActivity({
    actorId: user.id,
    action: action === 'APPROVE' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
    module: 'LEAVE',
    entityType: 'LEAVE',
    entityId: leave.id,
    hostelId: leave.hostel_id,
    studentId: leave.student_id,
    description: `${action === 'APPROVE' ? 'Approved' : 'Rejected'} Leave Application ${leave.leave_number}`,
    metadata: { action, leaveNumber: leave.leave_number, rejection_reason }
  });

  return getLeaveApplicationById(user, leave.id);
}

/**
 * Cancel pending Leave Application (Student)
 */
async function cancelLeaveApplication(user, leaveId) {
  const leave = await getLeaveApplicationById(user, leaveId);

  if (leave.status !== 'PENDING') {
    throw new Error('Only PENDING leave applications can be cancelled.');
  }

  await db.pool.query("UPDATE leave_applications SET status = 'CANCELLED' WHERE id = ?", [leave.id]);

  await activityService.logActivity({
    actorId: user.id,
    action: 'CANCEL_LEAVE',
    module: 'LEAVE',
    entityType: 'LEAVE',
    entityId: leave.id,
    hostelId: leave.hostel_id,
    studentId: leave.student_id,
    description: `Cancelled Leave Application ${leave.leave_number}`,
    metadata: { leaveNumber: leave.leave_number }
  });

  return getLeaveApplicationById(user, leave.id);
}

/**
 * Get Leave Application summary stats
 */
async function getLeaveStats(user) {
  let hostelClause = '';
  const params = [];

  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student) return { pending: 0, approved: 0, onLeaveToday: 0, total: 0 };
    hostelClause = 'WHERE student_id = ?';
    params.push(student.id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (assignedHostels.length === 0) return { pending: 0, approved: 0, onLeaveToday: 0, total: 0 };
    hostelClause = `WHERE hostel_id IN (${assignedHostels.map(() => '?').join(',')})`;
    params.push(...assignedHostels);
  }

  const sql = `
    SELECT
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'APPROVED' AND CURDATE() BETWEEN start_date AND end_date THEN 1 END) as onLeaveToday,
      COUNT(*) as total
    FROM leave_applications
    ${hostelClause}
  `;

  const [rows] = await db.pool.query(sql, params);
  return rows[0] || { pending: 0, approved: 0, onLeaveToday: 0, total: 0 };
}

module.exports = {
  applyForLeave,
  getLeaveApplications,
  getLeaveApplicationById,
  approveRejectLeave,
  cancelLeaveApplication,
  getLeaveStats
};
