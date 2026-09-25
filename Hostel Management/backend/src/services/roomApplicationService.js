const db = require('../config/db');
const activityService = require('./activityService');
const reportingService = require('./reportingIntegrationService');

/**
 * Generate unique Room Application Number e.g. RA-20260923-9124
 */
function generateApplicationNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RA-${dateStr}-${randomSuffix}`;
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
 * Apply for Room Allocation (Student)
 */
async function applyForRoom(user, data) {
  const student = await getStudentByUserId(user.id);
  if (!student) {
    throw new Error('Student profile not found.');
  }

  // Check if student already has a pending application
  const [pending] = await db.pool.query(
    "SELECT id FROM room_applications WHERE student_id = ? AND status = 'PENDING'",
    [student.id]
  );
  if (pending.length > 0) {
    throw new Error('You already have an active Room Allocation application pending review.');
  }

  const {
    preferred_hostel_id,
    room_type_preference = 'NON_AC',
    preferred_roommate_roll_no,
    special_requests,
    academic_year = student.year || 1
  } = data;

  if (!preferred_hostel_id) {
    throw new Error('Preferred Hostel is required.');
  }

  // Verify preferred hostel exists and validate gender
  const [hostelRows] = await db.pool.query('SELECT id, name, gender FROM hostels WHERE id = ?', [preferred_hostel_id]);
  if (hostelRows.length === 0) {
    throw new Error('Selected preferred hostel does not exist.');
  }

  const targetHostel = hostelRows[0];
  const hGender = String(targetHostel.gender || '').toUpperCase();

  const repStudent = reportingService.findReportingStudentByRoll(student.roll_number);
  const studentGender = reportingService.normalizeGender(repStudent?.gender || student.gender || user.gender || 'MALE');

  if (hGender !== 'COED') {
    if (studentGender === 'MALE' && hGender !== 'MALE') {
      throw new Error(`Cannot apply to ${hGender} hostel (${targetHostel.name}). Boys can only apply for Boys' hostels.`);
    }
    if (studentGender === 'FEMALE' && hGender !== 'FEMALE') {
      throw new Error(`Cannot apply to ${hGender} hostel (${targetHostel.name}). Girls can only apply for Girls' hostels.`);
    }
  }

  // Verify roommate roll number if provided
  let roommateName = null;
  if (preferred_roommate_roll_no && preferred_roommate_roll_no.trim()) {
    const [roommateRows] = await db.pool.query(
      'SELECT id, full_name FROM students WHERE roll_number = ?',
      [preferred_roommate_roll_no.trim()]
    );
    if (roommateRows.length > 0) {
      roommateName = roommateRows[0].full_name;
    }
  }

  // Generate unique application number
  let appNumber = generateApplicationNumber();
  let isUnique = false;
  let retries = 0;
  while (!isUnique && retries < 5) {
    const [existing] = await db.pool.query('SELECT id FROM room_applications WHERE application_number = ?', [appNumber]);
    if (existing.length === 0) {
      isUnique = true;
    } else {
      appNumber = generateApplicationNumber();
      retries++;
    }
  }

  const query = `
    INSERT INTO room_applications (
      application_number, student_id, preferred_hostel_id,
      room_type_preference, preferred_roommate_roll_no,
      special_requests, academic_year, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `;

  const values = [
    appNumber,
    student.id,
    preferred_hostel_id,
    room_type_preference,
    preferred_roommate_roll_no ? preferred_roommate_roll_no.trim() : null,
    special_requests ? special_requests.trim() : null,
    academic_year
  ];

  const [result] = await db.pool.query(query, values);
  const applicationId = result.insertId;

  // Log activity
  await activityService.logActivity({
    actorId: user.id,
    action: 'CREATE_ROOM_APPLICATION',
    module: 'ALLOCATION',
    entityType: 'ROOM_APPLICATION',
    entityId: applicationId,
    hostelId: preferred_hostel_id,
    studentId: student.id,
    description: `Submitted Room Application ${appNumber} (${room_type_preference})`,
    metadata: { appNumber, room_type_preference, preferred_hostel_id, preferred_roommate_roll_no }
  });

  return getRoomApplicationById(user, applicationId);
}

/**
 * Fetch Room Applications with role-based scoping and filtering
 */
async function getRoomApplications(user, filters = {}) {
  const {
    status,
    room_type_preference,
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
    whereClauses.push('ra.student_id = ?');
    params.push(student.id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (assignedHostels.length === 0) return { data: [], total: 0, page: 1, limit: 20 };
    whereClauses.push(`ra.preferred_hostel_id IN (${assignedHostels.map(() => '?').join(',')})`);
    params.push(...assignedHostels);
  }

  // Filters
  if (status) {
    whereClauses.push('ra.status = ?');
    params.push(status);
  }

  if (room_type_preference) {
    whereClauses.push('ra.room_type_preference = ?');
    params.push(room_type_preference);
  }

  if (hostel_id && user.role !== 'STUDENT') {
    whereClauses.push('ra.preferred_hostel_id = ?');
    params.push(hostel_id);
  }

  if (search) {
    whereClauses.push('(ra.application_number LIKE ? OR s.full_name LIKE ? OR s.roll_number LIKE ? OR ra.preferred_roommate_roll_no LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count query
  const countSql = `
    SELECT COUNT(*) as total
    FROM room_applications ra
    JOIN students s ON ra.student_id = s.id
    ${whereSql}
  `;
  const [countRows] = await db.pool.query(countSql, params);
  const total = countRows[0].total;

  // Data query
  const dataSql = `
    SELECT 
      ra.*,
      s.full_name as student_name,
      s.roll_number,
      s.phone as student_phone,
      s.branch,
      s.year,
      h.name as preferred_hostel_name,
      h.code as preferred_hostel_code,
      b.bed_number as allocated_bed_number,
      r.room_number as allocated_room_number,
      u.full_name as reviewed_by_name,
      rm.full_name as preferred_roommate_name
    FROM room_applications ra
    JOIN students s ON ra.student_id = s.id
    JOIN hostels h ON ra.preferred_hostel_id = h.id
    LEFT JOIN beds b ON ra.allocated_bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON ra.reviewed_by = u.id
    LEFT JOIN students rm ON ra.preferred_roommate_roll_no = rm.roll_number
    ${whereSql}
    ORDER BY ra.created_at DESC
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
 * Get single room application by ID or Application Number with scoping
 */
async function getRoomApplicationById(user, applicationId) {
  const sql = `
    SELECT 
      ra.*,
      s.full_name as student_name,
      s.roll_number,
      s.phone as student_phone,
      s.branch,
      s.year,
      h.name as preferred_hostel_name,
      h.code as preferred_hostel_code,
      b.bed_number as allocated_bed_number,
      r.room_number as allocated_room_number,
      u.full_name as reviewed_by_name,
      rm.full_name as preferred_roommate_name
    FROM room_applications ra
    JOIN students s ON ra.student_id = s.id
    JOIN hostels h ON ra.preferred_hostel_id = h.id
    LEFT JOIN beds b ON ra.allocated_bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON ra.reviewed_by = u.id
    LEFT JOIN students rm ON ra.preferred_roommate_roll_no = rm.roll_number
    WHERE ra.id = ? OR ra.application_number = ?
  `;

  const [rows] = await db.pool.query(sql, [applicationId, applicationId]);
  if (rows.length === 0) {
    throw new Error('Room Application not found.');
  }

  const app = rows[0];

  // Scoping check
  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student || student.id !== app.student_id) {
      throw new Error('Unauthorized to view this Room Application.');
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (!assignedHostels.includes(app.preferred_hostel_id)) {
      throw new Error('Unauthorized: This Room Application belongs to an unassigned hostel.');
    }
  }

  return app;
}

/**
 * Staff 1-Click Bed Allocation & Application Approval
 */
async function approveAndAllocateRoom(user, applicationId, { bed_id, remarks }) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to allocate beds or approve room applications.');
  }

  if (!bed_id) {
    throw new Error('Target Bed ID is required for allocation.');
  }

  const app = await getRoomApplicationById(user, applicationId);

  if (app.status !== 'PENDING' && app.status !== 'APPROVED') {
    throw new Error(`Cannot allocate room for an application that is already ${app.status}.`);
  }

  // Verify target bed exists and is available
  const [bedRows] = await db.pool.query('SELECT id, room_id, status FROM beds WHERE id = ?', [bed_id]);
  if (bedRows.length === 0) {
    throw new Error('Target Bed does not exist.');
  }

  const bed = bedRows[0];
  if (bed.status !== 'AVAILABLE') {
    throw new Error(`Target Bed is currently ${bed.status} and cannot be allocated.`);
  }

  // Fetch bed's hostel and validate gender
  const [roomRowsCheck] = await db.pool.query(
    'SELECT r.hostel_id, h.name as hostel_name, h.gender as hostel_gender FROM rooms r JOIN hostels h ON r.hostel_id = h.id WHERE r.id = ?',
    [bed.room_id]
  );
  if (roomRowsCheck.length > 0) {
    const bHostel = roomRowsCheck[0];
    const hGender = String(bHostel.hostel_gender || '').toUpperCase();
    const repStudent = reportingService.findReportingStudentByRoll(app.roll_number);
    const studentGender = reportingService.normalizeGender(repStudent?.gender || 'MALE');
    if (hGender !== 'COED') {
      if (studentGender === 'MALE' && hGender !== 'MALE') {
        throw new Error(`Cannot allocate MALE student (${app.student_name}) to ${hGender} hostel (${bHostel.hostel_name}). Boys can only be allocated to Boys' hostels.`);
      }
      if (studentGender === 'FEMALE' && hGender !== 'FEMALE') {
        throw new Error(`Cannot allocate FEMALE student (${app.student_name}) to ${hGender} hostel (${bHostel.hostel_name}). Girls can only be allocated to Girls' hostels.`);
      }
    }
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch room and hostel ID for target bed
    const [roomRows] = await connection.query('SELECT hostel_id FROM rooms WHERE id = ?', [bed.room_id]);
    const hostelId = roomRows[0]?.hostel_id || app.preferred_hostel_id;

    // 1. Mark bed as OCCUPIED
    await connection.query("UPDATE beds SET status = 'OCCUPIED' WHERE id = ?", [bed.id]);

    // 2. Link bed to student
    await connection.query("UPDATE students SET bed_id = ? WHERE id = ?", [bed.id, app.student_id]);

    // 3. Insert active allocation record in student_allocations
    await connection.query(
      `INSERT INTO student_allocations (student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by)
       VALUES (?, ?, ?, ?, CURDATE(), 'ACTIVE', ?)
       ON DUPLICATE KEY UPDATE hostel_id = VALUES(hostel_id), room_id = VALUES(room_id), bed_id = VALUES(bed_id), status = 'ACTIVE', allocated_from = CURDATE()`,
      [app.student_id, hostelId, bed.room_id, bed.id, user.id]
    );

    // 4. Update room application record
    await connection.query(
      `UPDATE room_applications 
       SET status = 'ALLOCATED', allocated_bed_id = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [bed.id, user.id, app.id]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // Log activity
  await activityService.logActivity({
    actorId: user.id,
    action: 'ALLOCATE_ROOM_APPLICATION',
    module: 'ALLOCATION',
    entityType: 'ROOM_APPLICATION',
    entityId: app.id,
    hostelId: app.preferred_hostel_id,
    studentId: app.student_id,
    description: `Allocated Bed ID ${bed_id} for Application ${app.application_number}`,
    metadata: { applicationId: app.id, bedId: bed_id }
  });

  return getRoomApplicationById(user, app.id);
}

/**
 * Staff Reject Room Application
 */
async function rejectRoomApplication(user, applicationId, { rejection_reason }) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to reject room applications.');
  }

  const app = await getRoomApplicationById(user, applicationId);

  if (app.status !== 'PENDING') {
    throw new Error(`Cannot reject Room Application that is already ${app.status}.`);
  }

  await db.pool.query(
    `UPDATE room_applications 
     SET status = 'REJECTED', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ?
     WHERE id = ?`,
    [user.id, rejection_reason || 'Application rejected by Hostel Warden', app.id]
  );

  await activityService.logActivity({
    actorId: user.id,
    action: 'REJECT_ROOM_APPLICATION',
    module: 'ALLOCATION',
    entityType: 'ROOM_APPLICATION',
    entityId: app.id,
    hostelId: app.preferred_hostel_id,
    studentId: app.student_id,
    description: `Rejected Room Application ${app.application_number}`,
    metadata: { appNumber: app.application_number, rejection_reason }
  });

  return getRoomApplicationById(user, app.id);
}

/**
 * Cancel pending Room Application (Student)
 */
async function cancelRoomApplication(user, applicationId) {
  const app = await getRoomApplicationById(user, applicationId);

  if (app.status !== 'PENDING') {
    throw new Error('Only PENDING room applications can be cancelled.');
  }

  await db.pool.query("UPDATE room_applications SET status = 'CANCELLED' WHERE id = ?", [app.id]);

  await activityService.logActivity({
    actorId: user.id,
    action: 'CANCEL_ROOM_APPLICATION',
    module: 'ALLOCATION',
    entityType: 'ROOM_APPLICATION',
    entityId: app.id,
    hostelId: app.preferred_hostel_id,
    studentId: app.student_id,
    description: `Cancelled Room Application ${app.application_number}`,
    metadata: { appNumber: app.application_number }
  });

  return getRoomApplicationById(user, app.id);
}

/**
 * Summary Statistics for Room Applications
 */
async function getRoomApplicationStats(user) {
  let hostelClause = '';
  const params = [];

  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student) return { pending: 0, allocated: 0, rejected: 0, total: 0 };
    hostelClause = 'WHERE student_id = ?';
    params.push(student.id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (assignedHostels.length === 0) return { pending: 0, allocated: 0, rejected: 0, total: 0 };
    hostelClause = `WHERE preferred_hostel_id IN (${assignedHostels.map(() => '?').join(',')})`;
    params.push(...assignedHostels);
  }

  const sql = `
    SELECT
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'ALLOCATED' THEN 1 END) as allocated,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
      COUNT(*) as total
    FROM room_applications
    ${hostelClause}
  `;

  const [rows] = await db.pool.query(sql, params);
  return rows[0] || { pending: 0, allocated: 0, rejected: 0, total: 0 };
}

module.exports = {
  applyForRoom,
  getRoomApplications,
  getRoomApplicationById,
  approveAndAllocateRoom,
  rejectRoomApplication,
  cancelRoomApplication,
  getRoomApplicationStats
};
