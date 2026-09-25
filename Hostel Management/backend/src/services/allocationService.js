const db = require('../config/db');
const authorization = require('../utils/authorization');
const activityService = require('./activityService');
const reportingService = require('./reportingIntegrationService');

const VALID_CHECKOUT_REASONS = [
  'COURSE_COMPLETED', 'TRANSFERRED', 'LEFT_COLLEGE', 
  'HOSTEL_CHANGE', 'DISCIPLINARY', 'PERSONAL', 'OTHER'
];

/**
 * Retrieves paginated allocations with filtering and role scoping.
 */
const getAllocations = async (filters = {}, user) => {
  const { role, id: userId } = user;
  const { page = 1, limit = 20, search = '', hostel_id, status } = filters;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const queryParams = [];

  // Scoping based on role
  if (role === 'SUPERINTENDENT') {
    const assignedHostels = await authorization.getAssignedHostels(userId);
    if (assignedHostels.length === 0) {
      return { allocations: [], currentPage: pageNum, totalPages: 0, totalAllocations: 0, limit: limitNum };
    }

    if (hostel_id && hostel_id !== 'all') {
      if (!assignedHostels.includes(Number(hostel_id))) {
        const error = new Error('Forbidden: You do not have access to this hostel allocations.');
        error.status = 403;
        throw error;
      }
      conditions.push('sa.hostel_id = ?');
      queryParams.push(Number(hostel_id));
    } else {
      conditions.push('sa.hostel_id IN (?)');
      queryParams.push(assignedHostels);
    }
  } else if (role === 'SUPER_ADMIN') {
    if (hostel_id && hostel_id !== 'all') {
      conditions.push('sa.hostel_id = ?');
      queryParams.push(Number(hostel_id));
    }
  } else {
    const error = new Error('Forbidden: You do not have access to allocation records.');
    error.status = 403;
    throw error;
  }

  // Filters
  if (status) {
    conditions.push('sa.status = ?');
    queryParams.push(status);
  }

  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    conditions.push('(s.full_name LIKE ? OR s.student_id LIKE ? OR s.roll_number LIKE ? OR h.name LIKE ? OR r.room_number LIKE ? OR b.bed_number LIKE ?)');
    queryParams.push(term, term, term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM student_allocations sa
    JOIN students s ON sa.student_id = s.id
    JOIN hostels h ON sa.hostel_id = h.id
    JOIN rooms r ON sa.room_id = r.id
    JOIN beds b ON sa.bed_id = b.id
    ${whereClause}
  `;

  const [countResult] = await db.pool.query(countQuery, queryParams);
  const totalAllocations = countResult[0]?.total || 0;
  const totalPages = Math.ceil(totalAllocations / limitNum);

  // Paginated rows
  const selectQuery = `
    SELECT sa.*, 
           s.full_name as student_name, s.student_id as student_code, s.roll_number, s.status as student_status, s.branch, s.course, s.photo_url,
           h.name as hostel_name, h.code as hostel_code,
           r.room_number,
           b.bed_number,
           u.username as allocated_by_username
    FROM student_allocations sa
    JOIN students s ON sa.student_id = s.id
    JOIN hostels h ON sa.hostel_id = h.id
    JOIN rooms r ON sa.room_id = r.id
    JOIN beds b ON sa.bed_id = b.id
    LEFT JOIN users u ON sa.allocated_by = u.id
    ${whereClause}
    ORDER BY sa.id DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.pool.query(selectQuery, [...queryParams, limitNum, offset]);

  return {
    allocations: rows,
    currentPage: pageNum,
    totalPages,
    totalAllocations,
    limit: limitNum
  };
};

/**
 * Gets details of a single allocation by ID.
 */
const getAllocationById = async (id, user) => {
  const [rows] = await db.pool.query(
    `SELECT sa.*, 
            s.full_name as student_name, s.student_id as student_code, s.roll_number, s.status as student_status, s.branch, s.course, s.photo_url, s.phone, s.email,
            h.name as hostel_name, h.code as hostel_code,
            r.room_number,
            b.bed_number,
            u.username as allocated_by_username
     FROM student_allocations sa
     JOIN students s ON sa.student_id = s.id
     JOIN hostels h ON sa.hostel_id = h.id
     JOIN rooms r ON sa.room_id = r.id
     JOIN beds b ON sa.bed_id = b.id
     LEFT JOIN users u ON sa.allocated_by = u.id
     WHERE sa.id = ?`,
    [id]
  );

  if (rows.length === 0) {
    const error = new Error('Allocation record not found.');
    error.status = 404;
    throw error;
  }

  const alloc = rows[0];
  const isAuthorized = await authorization.hasStudentAccess(user, alloc.student_id);
  if (!isAuthorized) {
    const error = new Error('Forbidden: You do not have permission to view this allocation.');
    error.status = 403;
    throw error;
  }

  return alloc;
};

/**
 * Gets full allocation history for a specific student.
 */
const getStudentAllocationHistory = async (studentId, user) => {
  const isAuthorized = await authorization.hasStudentAccess(user, studentId);
  if (!isAuthorized) {
    const error = new Error('Forbidden: You do not have permission to view this student allocation history.');
    error.status = 403;
    throw error;
  }

  const [rows] = await db.pool.query(
    `SELECT sa.*, 
            h.name as hostel_name, h.code as hostel_code,
            r.room_number, f.floor_name,
            b.bed_number,
            u.username as allocated_by_username
     FROM student_allocations sa
     JOIN hostels h ON sa.hostel_id = h.id
     JOIN rooms r ON sa.room_id = r.id
     LEFT JOIN floors f ON r.floor_id = f.id
     JOIN beds b ON sa.bed_id = b.id
     LEFT JOIN users u ON sa.allocated_by = u.id
     WHERE sa.student_id = ?
     ORDER BY sa.id DESC`,
    [studentId]
  );

  return rows;
};

/**
 * Gets current allocation & history for the currently logged-in student user.
 */
const getMyAllocation = async (user) => {
  if (user.role !== 'STUDENT') {
    const error = new Error('Forbidden: Only student accounts can access personal allocation profile.');
    error.status = 403;
    throw error;
  }

  const [studentRows] = await db.pool.query(
    'SELECT id, full_name, student_id, roll_number, status, bed_id, hostel_required FROM students WHERE user_id = ? OR roll_number = ?',
    [user.id, user.username || user.rollNo || '']
  );

  if (studentRows.length === 0) {
    const error = new Error('Student profile record not found.');
    error.status = 404;
    throw error;
  }

  const student = studentRows[0];
  if (student.hostel_required === 'No') {
    const err = new Error('You are a Day Scholar. Hostel facility not applicable.');
    err.status = 403;
    err.isDayScholar = true;
    throw err;
  }
  let history = await getStudentAllocationHistory(student.id, user);
  let activeAllocation = history.find(a => a.status === 'ACTIVE') || null;

  // Auto-heal if student has bed_id in students table but lacks active allocation record
  if (!activeAllocation && student.bed_id) {
    const [bedDetails] = await db.pool.query(
      `SELECT b.id as bed_id, b.bed_number, r.id as room_id, r.room_number, r.hostel_id,
              h.name as hostel_name, h.code as hostel_code, f.floor_name
       FROM beds b
       JOIN rooms r ON b.room_id = r.id
       JOIN hostels h ON r.hostel_id = h.id
       LEFT JOIN floors f ON r.floor_id = f.id
       WHERE b.id = ?`,
      [student.bed_id]
    );

    if (bedDetails.length > 0) {
      const b = bedDetails[0];
      const allocDate = new Date().toISOString().slice(0, 10);
      try {
        const [insertRes] = await db.pool.query(
          `INSERT INTO student_allocations (student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by)
           VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
          [student.id, b.hostel_id, b.room_id, b.bed_id, allocDate, user.id]
        );
        activeAllocation = {
          id: insertRes.insertId,
          student_id: student.id,
          hostel_id: b.hostel_id,
          room_id: b.room_id,
          bed_id: b.bed_id,
          allocated_from: allocDate,
          status: 'ACTIVE',
          hostel_name: b.hostel_name,
          hostel_code: b.hostel_code,
          room_number: b.room_number,
          floor_name: b.floor_name,
          bed_number: b.bed_number
        };
        history = [activeAllocation, ...history];
      } catch (insertErr) {
        console.warn('Auto-heal allocation insert warning:', insertErr.message);
      }
    }
  }

  // Fetch roommates in the same room
  let roommates = [];
  if (activeAllocation && activeAllocation.room_id) {
    const [roommateRows] = await db.pool.query(
      `SELECT s.id, s.full_name, s.student_id, s.roll_number, s.branch, s.year, s.photo_url, b.bed_number
       FROM students s
       JOIN beds b ON s.bed_id = b.id
       WHERE b.room_id = ? AND s.id != ? AND s.status = 'ACTIVE'`,
      [activeAllocation.room_id, student.id]
    );
    roommates = roommateRows;
  }

  return {
    student,
    currentAllocation: activeAllocation,
    roommates,
    history
  };
};

/**
 * Gets available beds in a specific hostel/room for assignment dropdowns.
 */
const getAvailableBeds = async (hostelId, roomId, user) => {
  if (user.role === 'SUPERINTENDENT') {
    const assigned = await authorization.getAssignedHostels(user.id);
    if (!assigned.includes(Number(hostelId))) {
      const error = new Error('Forbidden: You do not have access to this hostel.');
      error.status = 403;
      throw error;
    }
  }

  let query = `
    SELECT b.id, b.bed_number, b.status, r.room_number, r.id as room_id, h.name as hostel_name
    FROM beds b
    JOIN rooms r ON b.room_id = r.id
    JOIN hostels h ON r.hostel_id = h.id
    WHERE b.status = 'AVAILABLE' AND h.id = ?
  `;
  const queryParams = [Number(hostelId)];

  if (roomId) {
    query += ' AND r.id = ?';
    queryParams.push(Number(roomId));
  }

  query += ' ORDER BY LENGTH(r.room_number) ASC, r.room_number ASC, LENGTH(b.bed_number) ASC, b.bed_number ASC';

  const [rows] = await db.pool.query(query, queryParams);
  return rows;
};

/**
 * Allocates an unassigned student to a bed in a transaction-safe manner.
 */
const allocateStudent = async (data, staffUser) => {
  const { student_id, hostel_id, room_id, bed_id, allocated_from } = data;

  if (!student_id || !hostel_id || !room_id || !bed_id) {
    const error = new Error('Student, Hostel, Room, and Bed assignments are required.');
    error.status = 400;
    throw error;
  }

  // 1. Staff permission check
  if (staffUser.role === 'SUPERINTENDENT') {
    const assigned = await authorization.getAssignedHostels(staffUser.id);
    if (!assigned.includes(Number(hostel_id))) {
      const error = new Error('Forbidden: You can only allocate students to your assigned hostel(s).');
      error.status = 403;
      throw error;
    }
  } else if (staffUser.role !== 'SUPER_ADMIN') {
    const error = new Error('Forbidden: Staff permission required for allocation.');
    error.status = 403;
    throw error;
  }

  // 2. Resolve student record (from Hostel DB or Reporting Master)
  let student = null;
  let reportingStudent = null;

  if (!isNaN(Number(student_id))) {
    const [sRows] = await db.pool.query('SELECT * FROM students WHERE id = ?', [student_id]);
    if (sRows.length > 0) {
      student = sRows[0];
      reportingStudent = reportingService.findReportingStudentByRoll(student.roll_number);
    }
  }

  if (!student) {
    const [sRows] = await db.pool.query(
      'SELECT * FROM students WHERE roll_number = ? OR student_id = ?',
      [student_id, student_id]
    );
    if (sRows.length > 0) {
      student = sRows[0];
      reportingStudent = reportingService.findReportingStudentByRoll(student.roll_number);
    }
  }

  if (!reportingStudent) {
    reportingStudent = reportingService.findReportingStudentByRoll(student_id);
  }

  if (!student && !reportingStudent) {
    const error = new Error('Student record not found in Reporting or Hostel master.');
    error.status = 404;
    throw error;
  }

  // JIT sync: If student is not yet in Hostel DB, sync them now
  if (!student && reportingStudent) {
    student = await reportingService.syncReportingStudentToHostel(reportingStudent);
  }

  if (student.status !== 'ACTIVE') {
    const error = new Error(`Cannot allocate room to ${student.status} student. Student status must be ACTIVE.`);
    error.status = 400;
    throw error;
  }

  // 3. Gender-based Allocation Rule
  const [hostelRows] = await db.pool.query('SELECT id, name, code, gender FROM hostels WHERE id = ?', [hostel_id]);
  if (hostelRows.length === 0) {
    const error = new Error('Selected hostel does not exist.');
    error.status = 404;
    throw error;
  }

  const targetHostel = hostelRows[0];
  const hostelGender = String(targetHostel.gender || '').toUpperCase(); // 'MALE', 'FEMALE', 'COED'

  const studentRawGender = reportingStudent?.gender || student.gender || student.user_gender || 'Male';
  const studentGender = reportingService.normalizeGender(studentRawGender); // 'MALE', 'FEMALE'

  if (hostelGender !== 'COED') {
    if (studentGender === 'MALE' && hostelGender !== 'MALE') {
      const error = new Error(`Cannot allot MALE student (${reportingStudent?.full_name || student.full_name}) to ${hostelGender} hostel (${targetHostel.name}). Boys can only be allotted to Boys' hostels.`);
      error.status = 400;
      throw error;
    }
    if (studentGender === 'FEMALE' && hostelGender !== 'FEMALE') {
      const error = new Error(`Cannot allot FEMALE student (${reportingStudent?.full_name || student.full_name}) to ${hostelGender} hostel (${targetHostel.name}). Girls can only be allotted to Girls' hostels.`);
      error.status = 400;
      throw error;
    }
  }

  const finalStudentId = student.id;

  // Transaction execution
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock student row & check active allocation
    const [activeAlloc] = await connection.query(
      "SELECT id FROM student_allocations WHERE student_id = ? AND status = 'ACTIVE' FOR UPDATE",
      [finalStudentId]
    );

    if (activeAlloc.length > 0 || student.bed_id) {
      const error = new Error('Student already has an active hostel room/bed allocation.');
      error.status = 400;
      throw error;
    }

    // Lock bed row & check status & hierarchy
    const [bedRows] = await connection.query(
      `SELECT b.id, b.status, b.room_id, r.hostel_id 
       FROM beds b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ? FOR UPDATE`,
      [bed_id]
    );

    if (bedRows.length === 0) {
      const error = new Error('Selected bed does not exist.');
      error.status = 400;
      throw error;
    }

    const bed = bedRows[0];
    if (bed.room_id !== Number(room_id) || bed.hostel_id !== Number(hostel_id)) {
      const error = new Error('Invalid assignment relationship: Bed does not belong to the selected room or hostel.');
      error.status = 400;
      throw error;
    }

    if (bed.status !== 'AVAILABLE') {
      const error = new Error(`Selected bed is currently ${bed.status} and cannot be allocated.`);
      error.status = 400;
      throw error;
    }

    const allocFromDate = allocated_from || new Date().toISOString().slice(0, 10);

    // Create allocation record
    const [insertRes] = await connection.query(
      `INSERT INTO student_allocations 
       (student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [finalStudentId, hostel_id, room_id, bed_id, allocFromDate, staffUser.id]
    );

    // Update bed status to OCCUPIED
    await connection.query(
      "UPDATE beds SET status = 'OCCUPIED' WHERE id = ?",
      [bed_id]
    );

    // Update student's bed reference
    await connection.query(
      "UPDATE students SET bed_id = ? WHERE id = ?",
      [bed_id, finalStudentId]
    );

    await activityService.logActivity({
      actorId: staffUser.id,
      action: 'STUDENT_ALLOCATED',
      module: 'ALLOCATION',
      entityType: 'ALLOCATION',
      entityId: insertRes.insertId,
      hostelId: hostel_id,
      studentId: finalStudentId,
      description: `Allocated student #${finalStudentId} (${reportingStudent?.full_name || student.full_name}) to Hostel #${hostel_id} (${targetHostel.name}), Room #${room_id}, Bed #${bed_id}`,
      metadata: { hostel_id, room_id, bed_id, allocated_from: allocFromDate, gender: studentGender }
    }, connection);

    await connection.commit();
    return { success: true, allocation_id: insertRes.insertId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Transfers a student to a new room or hostel in a transaction-safe manner.
 */
const transferStudent = async (allocationId, transferData, staffUser) => {
  const { new_hostel_id, new_room_id, new_bed_id, transfer_date, transfer_reason } = transferData;

  if (!new_hostel_id || !new_room_id || !new_bed_id) {
    const error = new Error('Destination Hostel, Room, and Bed assignments are required for transfer.');
    error.status = 400;
    throw error;
  }

  // Fetch current active allocation
  const [allocRows] = await db.pool.query(
    `SELECT sa.*, s.id as student_id, s.status as student_status, s.roll_number, s.full_name, u.gender as user_gender 
     FROM student_allocations sa
     JOIN students s ON sa.student_id = s.id
     JOIN users u ON s.user_id = u.id
     WHERE sa.id = ?`,
    [allocationId]
  );

  if (allocRows.length === 0) {
    const error = new Error('Allocation record not found.');
    error.status = 404;
    throw error;
  }

  const currentAlloc = allocRows[0];
  if (currentAlloc.status !== 'ACTIVE') {
    const error = new Error('Only ACTIVE allocations can be transferred.');
    error.status = 400;
    throw error;
  }

  if (currentAlloc.bed_id === Number(new_bed_id)) {
    const error = new Error('Student is already assigned to this exact bed.');
    error.status = 400;
    throw error;
  }

  // Destination Hostel Gender Check
  const [destHostelRows] = await db.pool.query('SELECT id, name, gender FROM hostels WHERE id = ?', [new_hostel_id]);
  if (destHostelRows.length === 0) {
    const error = new Error('Destination hostel does not exist.');
    error.status = 404;
    throw error;
  }
  const destHostel = destHostelRows[0];
  const destGender = String(destHostel.gender || '').toUpperCase();

  const repStudent = reportingService.findReportingStudentByRoll(currentAlloc.roll_number);
  const studentGender = reportingService.normalizeGender(repStudent?.gender || currentAlloc.user_gender || 'MALE');

  if (destGender !== 'COED') {
    if (studentGender === 'MALE' && destGender !== 'MALE') {
      const error = new Error(`Cannot transfer MALE student (${repStudent?.full_name || currentAlloc.full_name || ''}) to ${destGender} hostel (${destHostel.name}). Boys can only be transferred to Boys' hostels.`);
      error.status = 400;
      throw error;
    }
    if (studentGender === 'FEMALE' && destGender !== 'FEMALE') {
      const error = new Error(`Cannot transfer FEMALE student (${repStudent?.full_name || currentAlloc.full_name || ''}) to ${destGender} hostel (${destHostel.name}). Girls can only be transferred to Girls' hostels.`);
      error.status = 400;
      throw error;
    }
  }

  // Staff permission validations: Superintendent must be assigned to BOTH source & destination hostels!
  if (staffUser.role === 'SUPERINTENDENT') {
    const assigned = await authorization.getAssignedHostels(staffUser.id);
    if (!assigned.includes(Number(currentAlloc.hostel_id))) {
      const error = new Error('Forbidden: You can only transfer students out of your assigned hostel(s).');
      error.status = 403;
      throw error;
    }
    if (!assigned.includes(Number(new_hostel_id))) {
      const error = new Error('Forbidden: You cannot transfer students into an unauthorized destination hostel.');
      error.status = 403;
      throw error;
    }
  } else if (staffUser.role !== 'SUPER_ADMIN') {
    const error = new Error('Forbidden: Staff permission required for student transfer.');
    error.status = 403;
    throw error;
  }

  const tDate = transfer_date || new Date().toISOString().slice(0, 10);

  // Transaction execution
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock target destination bed
    const [targetBedRows] = await connection.query(
      `SELECT b.id, b.status, b.room_id, r.hostel_id 
       FROM beds b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ? FOR UPDATE`,
      [new_bed_id]
    );

    if (targetBedRows.length === 0) {
      const error = new Error('Destination bed does not exist.');
      error.status = 400;
      throw error;
    }

    const targetBed = targetBedRows[0];
    if (targetBed.room_id !== Number(new_room_id) || targetBed.hostel_id !== Number(new_hostel_id)) {
      const error = new Error('Invalid destination relationship: Bed does not belong to the selected room or hostel.');
      error.status = 400;
      throw error;
    }

    if (targetBed.status !== 'AVAILABLE') {
      const error = new Error(`Destination bed is currently ${targetBed.status} and cannot be assigned.`);
      error.status = 400;
      throw error;
    }

    // 1. Mark current allocation as TRANSFERRED
    await connection.query(
      `UPDATE student_allocations 
       SET status = 'TRANSFERRED', allocated_until = ?, transfer_reason = ? 
       WHERE id = ?`,
      [tDate, transfer_reason || 'Transferred room/bed', allocationId]
    );

    // 2. Insert new ACTIVE allocation
    const [newInsert] = await connection.query(
      `INSERT INTO student_allocations 
       (student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by, transfer_reason)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [currentAlloc.student_id, new_hostel_id, new_room_id, new_bed_id, tDate, staffUser.id, transfer_reason || null]
    );

    // 3. Release old bed
    await connection.query(
      "UPDATE beds SET status = 'AVAILABLE' WHERE id = ?",
      [currentAlloc.bed_id]
    );

    // 4. Occupy new bed
    await connection.query(
      "UPDATE beds SET status = 'OCCUPIED' WHERE id = ?",
      [new_bed_id]
    );

    // 5. Update student's bed reference
    await connection.query(
      "UPDATE students SET bed_id = ? WHERE id = ?",
      [new_bed_id, currentAlloc.student_id]
    );

    await activityService.logActivity({
      actorId: staffUser.id,
      action: 'STUDENT_TRANSFERRED',
      module: 'ALLOCATION',
      entityType: 'ALLOCATION',
      entityId: newInsert.insertId,
      hostelId: new_hostel_id,
      studentId: currentAlloc.student_id,
      description: `Transferred student #${currentAlloc.student_id} from Hostel #${currentAlloc.hostel_id}/Bed #${currentAlloc.bed_id} to Hostel #${new_hostel_id}/Bed #${new_bed_id}`,
      metadata: { from_hostel_id: currentAlloc.hostel_id, from_bed_id: currentAlloc.bed_id, to_hostel_id: new_hostel_id, to_bed_id: new_bed_id }
    }, connection);

    await connection.commit();
    return { success: true, new_allocation_id: newInsert.insertId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Checks out a student from their hostel room/bed in a transaction-safe manner.
 */
const checkoutStudent = async (allocationId, checkoutData, staffUser) => {
  const { checkout_date, checkout_reason, custom_reason } = checkoutData;

  if (!checkout_reason || !VALID_CHECKOUT_REASONS.includes(checkout_reason)) {
    const error = new Error(`Invalid checkout reason. Supported: ${VALID_CHECKOUT_REASONS.join(', ')}.`);
    error.status = 400;
    throw error;
  }

  const [allocRows] = await db.pool.query(
    `SELECT sa.*, s.id as student_id 
     FROM student_allocations sa
     JOIN students s ON sa.student_id = s.id
     WHERE sa.id = ?`,
    [allocationId]
  );

  if (allocRows.length === 0) {
    const error = new Error('Allocation record not found.');
    error.status = 404;
    throw error;
  }

  const currentAlloc = allocRows[0];
  if (currentAlloc.status !== 'ACTIVE') {
    const error = new Error('Only ACTIVE allocations can be checked out.');
    error.status = 400;
    throw error;
  }

  // Staff permission check
  if (staffUser.role === 'SUPERINTENDENT') {
    const assigned = await authorization.getAssignedHostels(staffUser.id);
    if (!assigned.includes(Number(currentAlloc.hostel_id))) {
      const error = new Error('Forbidden: You can only checkout students from your assigned hostel(s).');
      error.status = 403;
      throw error;
    }
  } else if (staffUser.role !== 'SUPER_ADMIN') {
    const error = new Error('Forbidden: Staff permission required for checkout.');
    error.status = 403;
    throw error;
  }

  const cDate = checkout_date || new Date().toISOString().slice(0, 10);

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update allocation status
    await connection.query(
      `UPDATE student_allocations 
       SET status = 'CHECKED_OUT', allocated_until = ?, checkout_reason = ?, custom_reason = ? 
       WHERE id = ?`,
      [cDate, checkout_reason, custom_reason || null, allocationId]
    );

    // 2. Release bed
    await connection.query(
      "UPDATE beds SET status = 'AVAILABLE' WHERE id = ?",
      [currentAlloc.bed_id]
    );

    // 3. Clear student bed reference
    await connection.query(
      "UPDATE students SET bed_id = NULL WHERE id = ?",
      [currentAlloc.student_id]
    );

    await activityService.logActivity({
      actorId: staffUser.id,
      action: 'STUDENT_CHECKED_OUT',
      module: 'ALLOCATION',
      entityType: 'ALLOCATION',
      entityId: allocationId,
      hostelId: currentAlloc.hostel_id,
      studentId: currentAlloc.student_id,
      description: `Checked out student #${currentAlloc.student_id} from Hostel #${currentAlloc.hostel_id} (Reason: ${checkout_reason})`,
      metadata: { checkout_reason, checkout_date: cDate }
    }, connection);

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
 * Diagnostic tool to check database consistency between beds, students, and allocations.
 */
const getConsistencyReport = async (user) => {
  if (!['SUPER_ADMIN', 'SUPERINTENDENT'].includes(user.role)) {
    const error = new Error('Forbidden: Access denied to consistency audit tool.');
    error.status = 403;
    throw error;
  }

  // 1. Occupied beds without active allocation
  const [occupiedWithoutAlloc] = await db.pool.query(
    `SELECT b.id as bed_id, b.bed_number, r.room_number, h.name as hostel_name
     FROM beds b
     JOIN rooms r ON b.room_id = r.id
     JOIN hostels h ON r.hostel_id = h.id
     LEFT JOIN student_allocations sa ON b.id = sa.bed_id AND sa.status = 'ACTIVE'
     WHERE b.status = 'OCCUPIED' AND sa.id IS NULL`
  );

  // 2. Active allocations with available/maintenance bed
  const [allocWithAvailableBed] = await db.pool.query(
    `SELECT sa.id as allocation_id, sa.student_id, b.id as bed_id, b.status as bed_status
     FROM student_allocations sa
     JOIN beds b ON sa.bed_id = b.id
     WHERE sa.status = 'ACTIVE' AND b.status != 'OCCUPIED'`
  );

  // 3. Students whose bed_id does not match active allocation bed_id
  const [mismatchedStudentBeds] = await db.pool.query(
    `SELECT s.id as student_id, s.full_name, s.bed_id as student_bed_id, sa.bed_id as alloc_bed_id
     FROM students s
     JOIN student_allocations sa ON s.id = sa.student_id AND sa.status = 'ACTIVE'
     WHERE s.bed_id IS NULL OR s.bed_id != sa.bed_id`
  );

  // 4. Students with multiple active allocations
  const [duplicateActiveAllocations] = await db.pool.query(
    `SELECT student_id, COUNT(*) as active_count
     FROM student_allocations
     WHERE status = 'ACTIVE'
     GROUP BY student_id
     HAVING active_count > 1`
  );

  const hasIssues = 
    occupiedWithoutAlloc.length > 0 ||
    allocWithAvailableBed.length > 0 ||
    mismatchedStudentBeds.length > 0 ||
    duplicateActiveAllocations.length > 0;

  return {
    isConsistent: !hasIssues,
    issues: {
      occupiedBedsWithoutActiveAllocation: occupiedWithoutAlloc,
      activeAllocationsWithAvailableBed: allocWithAvailableBed,
      mismatchedStudentBeds,
      duplicateActiveAllocations
    }
  };
};

/**
 * Deterministic Auto-Allotment based on Reporting Database
 * Boys -> Campus 1 (Boys Hostel), Girls -> Campus 2 (Girls Hostel)
 * 3 students per room, rooms start from 101, grouped by branch and sorted by roll number.
 */
const autoAllotFromReporting = async (user) => {
  if (user && user.role !== 'SUPER_ADMIN') {
    const error = new Error('Forbidden: Only Super Administrators can trigger auto-allotment.');
    error.status = 403;
    throw error;
  }

  const [hostels] = await db.pool.query('SELECT id, name, code, gender FROM hostels ORDER BY id ASC');
  const boysHostel = hostels.find(h => h.gender === 'MALE') || hostels[0];
  const girlsHostel = hostels.find(h => h.gender === 'FEMALE') || hostels[1];

  await db.pool.query(`
    INSERT IGNORE INTO floors (id, hostel_id, floor_name, floor_number, status) VALUES
    (1, ${boysHostel.id}, 'Ground Floor', 1, 'ACTIVE'),
    (2, ${boysHostel.id}, 'First Floor', 2, 'ACTIVE'),
    (3, ${boysHostel.id}, 'Second Floor', 3, 'ACTIVE'),
    (4, ${girlsHostel.id}, 'Ground Floor', 1, 'ACTIVE')
  `);

  await db.pool.query('UPDATE students SET bed_id = NULL, hostel_id = NULL');
  await db.pool.query('DELETE FROM student_allocations');
  await db.pool.query('DELETE FROM beds');
  await db.pool.query('DELETE FROM rooms');

  const [hostellers] = await db.pool.query(`
    SELECT id, user_id, student_id, roll_number, full_name, gender, branch, hostel_required, photo_url
    FROM students
    WHERE hostel_required = 'Yes' AND status = 'ACTIVE'
    ORDER BY 
      CASE WHEN UPPER(TRIM(gender)) LIKE 'F%' THEN 2 ELSE 1 END,
      branch ASC,
      roll_number ASC
  `);

  const boys = hostellers.filter(s => !String(s.gender).trim().toUpperCase().startsWith('F'));
  const girls = hostellers.filter(s => String(s.gender).trim().toUpperCase().startsWith('F'));

  async function allocateCohort(studentList, hostelId, startRoomNumber, floorMappings) {
    const ROOM_CAPACITY = 3;
    const totalRooms = Math.ceil(studentList.length / ROOM_CAPACITY);
    let studentIdx = 0;

    for (let r = 0; r < totalRooms; r++) {
      const roomNumStr = String(startRoomNumber + r);
      const floorId = floorMappings(r);

      const [roomRes] = await db.pool.query(`
        INSERT INTO rooms (hostel_id, floor_id, room_number, capacity, status)
        VALUES (?, ?, ?, ?, 'ACTIVE')
      `, [hostelId, floorId, roomNumStr, ROOM_CAPACITY]);
      const roomId = roomRes.insertId;

      const bedLetters = ['A', 'B', 'C'];
      for (let b = 0; b < ROOM_CAPACITY; b++) {
        const bedNum = `${roomNumStr}-${bedLetters[b]}`;
        const hasStudent = studentIdx < studentList.length;
        const bedStatus = hasStudent ? 'OCCUPIED' : 'AVAILABLE';

        const [bedRes] = await db.pool.query(`
          INSERT INTO beds (room_id, bed_number, status)
          VALUES (?, ?, ?)
        `, [roomId, bedNum, bedStatus]);
        const bedId = bedRes.insertId;

        if (hasStudent) {
          const student = studentList[studentIdx];
          await db.pool.query(`
            UPDATE students 
            SET bed_id = ?, hostel_id = ?
            WHERE id = ?
          `, [bedId, hostelId, student.id]);

          await db.pool.query(`
            INSERT INTO student_allocations (
              student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by
            ) VALUES (?, ?, ?, ?, CURDATE(), 'ACTIVE', 1)
          `, [student.id, hostelId, roomId, bedId]);

          studentIdx++;
        }
      }
    }
    return { roomsCreated: totalRooms, studentsAllocated: studentIdx };
  }

  const boysRes = await allocateCohort(boys, boysHostel.id, 101, (rIndex) => {
    if (rIndex < 20) return 1;
    if (rIndex < 40) return 2;
    return 3;
  });

  const girlsRes = await allocateCohort(girls, girlsHostel.id, 101, () => 4);

  return {
    success: true,
    message: 'Auto-allotment executed successfully.',
    totalHostellers: hostellers.length,
    boys: { allocated: boysRes.studentsAllocated, rooms: boysRes.roomsCreated, hostel: boysHostel.name },
    girls: { allocated: girlsRes.studentsAllocated, rooms: girlsRes.roomsCreated, hostel: girlsHostel.name }
  };
};

module.exports = {
  getAllocations,
  getAllocationById,
  getStudentAllocationHistory,
  getMyAllocation,
  getAvailableBeds,
  allocateStudent,
  transferStudent,
  checkoutStudent,
  getConsistencyReport,
  autoAllotFromReporting
};
