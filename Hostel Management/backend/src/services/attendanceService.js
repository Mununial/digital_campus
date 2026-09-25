const db = require('../config/db');
const { hasHostelAccess, hasStudentAccess } = require('../utils/authorization');
const activityService = require('./activityService');

/**
 * Bulk mark attendance for a given date.
 * @param {string} date - YYYY-MM-DD attendance date.
 * @param {Array<{studentId:number,status:'PRESENT'|'ABSENT'}>} records
 * @param {object} user - Authenticated user { id, role }
 * @param {number|null} targetHostelId - Optional explicit hostel ID from UI
 * @returns {Promise<void>}
 */
async function bulkMark(date, records, user, targetHostelId = null) {
  if (!date || !records || !Array.isArray(records) || records.length === 0) {
    throw new Error('Invalid attendance payload');
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid attendance date format (expected YYYY-MM-DD)');
  }

  // Parse explicit targetHostelId if provided
  const primaryHostelId = targetHostelId ? Number(targetHostelId) : null;
  if (primaryHostelId) {
    const allowed = await hasHostelAccess(user, primaryHostelId);
    if (!allowed) {
      const err = new Error('Unauthorized to mark attendance for this hostel');
      err.status = 403;
      throw err;
    }
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    // Gather student IDs for permission check in bulk
    const studentIds = records.map(r => r.studentId);
    const [students] = await connection.query(
      `SELECT s.id, s.bed_id, b.id AS bedId, r.hostel_id FROM students s
       LEFT JOIN beds b ON s.bed_id = b.id
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE s.id IN (?)`,
      [studentIds]
    );

    // Ensure every student exists and belongs to an authorized hostel
    for (const rec of records) {
      const stu = students.find(s => s.id === rec.studentId);
      if (!stu) {
        throw new Error(`Student with ID ${rec.studentId} not found`);
      }
      const resolvedHostelId = stu.hostel_id || primaryHostelId;
      if (!resolvedHostelId) {
        throw new Error(`Student ${rec.studentId} is not assigned to a hostel room`);
      }
      if (!primaryHostelId) {
        const allowed = await hasHostelAccess(user, resolvedHostelId);
        if (!allowed) {
          throw new Error('Unauthorized to mark attendance for one or more students');
        }
      }
    }

    // Upsert each attendance record using INSERT ... ON DUPLICATE KEY UPDATE
    const insertValues = records.map(rec => {
      const stu = students.find(s => s.id === rec.studentId);
      const resolvedHostelId = (stu && stu.hostel_id) ? stu.hostel_id : primaryHostelId;
      const status = (rec.status || 'PRESENT').toUpperCase();
      return [rec.studentId, resolvedHostelId, date, status, user.id];
    });

    const placeholders = insertValues.map(() => '(?,?,?,?,?)').join(',');
    const flatValues = insertValues.flat();

    const sql = `INSERT INTO attendance (student_id, hostel_id, attendance_date, status, marked_by)
                 VALUES ${placeholders}
                 ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by), marked_at = CURRENT_TIMESTAMP`;

    await connection.query(sql, flatValues);

    const activeHostelId = primaryHostelId || (students[0] ? students[0].hostel_id : null);
    await activityService.logActivity({
      actorId: user.id,
      action: 'ATTENDANCE_MARKED',
      module: 'ATTENDANCE',
      entityType: 'ATTENDANCE',
      hostelId: activeHostelId,
      description: `Marked daily attendance for ${records.length} student(s) on ${date}`,
      metadata: { count: records.length, date }
    }, connection);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Retrieve attendance for a hostel on a specific date.
 * Returns enriched student data with floor and room grouping.
 */
async function getHostelAttendance(hostelId, date, user) {
  if (!await hasHostelAccess(user, hostelId)) {
    const err = new Error('Unauthorized access to hostel attendance');
    err.status = 403;
    throw err;
  }
  const sql = `SELECT a.id AS attendanceId, a.status, a.marked_by, a.marked_at,
                      u.full_name AS marked_by_name,
                      s.id AS studentId, s.full_name, s.photo_url, s.phone,
                      COALESCE(s.roll_number, s.student_id) AS student_code,
                      s.branch, s.course, s.year AS year,
                      r.id AS room_id, r.room_number,
                      b.id AS bed_id, b.bed_number,
                      f.id AS floor_id, f.floor_number, f.floor_name
               FROM students s
               LEFT JOIN beds b ON s.bed_id = b.id
               LEFT JOIN rooms r ON b.room_id = r.id
               LEFT JOIN floors f ON r.floor_id = f.id
               LEFT JOIN attendance a ON s.id = a.student_id AND a.attendance_date = ?
               LEFT JOIN users u ON a.marked_by = u.id
               WHERE r.hostel_id = ?
               ORDER BY f.floor_number ASC, r.room_number ASC, b.bed_number ASC, s.full_name ASC`;
  const [rows] = await db.pool.query(sql, [date, hostelId]);
  return rows;
}

/**
 * Retrieve attendance history for a student by student ID.
 */
async function getStudentAttendance(studentId, user) {
  if (!await hasStudentAccess(user, studentId)) {
    const err = new Error('Unauthorized access to student attendance history');
    err.status = 403;
    throw err;
  }
  const sql = `SELECT a.id, a.attendance_date AS date, a.status, a.marked_by, a.marked_at,
                      u.full_name AS marked_by_name, h.name AS hostel_name
               FROM attendance a
               LEFT JOIN users u ON a.marked_by = u.id
               LEFT JOIN hostels h ON a.hostel_id = h.id
               WHERE a.student_id = ?
               ORDER BY a.attendance_date DESC`;
  const [rows] = await db.pool.query(sql, [studentId]);
  
  const totalMarked = rows.length;
  const present = rows.filter(r => r.status === 'PRESENT').length;
  const absent = rows.filter(r => r.status === 'ABSENT').length;
  const percentage = totalMarked ? Math.round((present / totalMarked) * 100) : 0;
  return { history: rows, summary: { totalMarked, present, absent, percentage } };
}

/**
 * Retrieve self attendance history for logged-in student user.
 */
async function getMyAttendance(user) {
  const [students] = await db.pool.query('SELECT id FROM students WHERE user_id = ?', [user.id]);
  if (students.length === 0) {
    return { history: [], summary: { totalMarked: 0, present: 0, absent: 0, percentage: 0 } };
  }
  const studentId = students[0].id;
  return getStudentAttendance(studentId, user);
}

/**
 * Update a single attendance entry.
 */
async function updateAttendance(id, status, user) {
  const [rows] = await db.pool.query('SELECT * FROM attendance WHERE id = ?', [id]);
  if (rows.length === 0) {
    const err = new Error('Attendance record not found');
    err.status = 404;
    throw err;
  }
  const record = rows[0];
  if (!await hasHostelAccess(user, record.hostel_id)) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
  await db.pool.query('UPDATE attendance SET status = ?, marked_by = ?, marked_at = CURRENT_TIMESTAMP WHERE id = ?', [status, user.id, id]);
}

/**
 * Summary statistics for a hostel on a specific date.
 */
async function getHostelSummary(hostelId, date, user) {
  if (!await hasHostelAccess(user, hostelId)) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
  const sql = `SELECT COUNT(s.id) AS totalStudents,
                      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
                      SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent,
                      SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) AS notMarked
               FROM students s
               LEFT JOIN beds b ON s.bed_id = b.id
               LEFT JOIN rooms r ON b.room_id = r.id
               LEFT JOIN attendance a ON s.id = a.student_id AND a.attendance_date = ?
               WHERE r.hostel_id = ?`;
  const [rows] = await db.pool.query(sql, [date, hostelId]);
  const row = rows[0] || { totalStudents: 0, present: 0, absent: 0, notMarked: 0 };
  const markedTotal = Number(row.present || 0) + Number(row.absent || 0);
  const percentage = markedTotal ? Math.round((Number(row.present || 0) / markedTotal) * 100) : 0;
  return { ...row, percentage };
}

/**
 * Retrieves attendance records for a hostel across a date range.
 */
async function getAttendanceRange(hostelId, dateFrom, dateTo, user) {
  if (!await hasHostelAccess(user, hostelId)) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }

  const sql = `
    SELECT 
      s.id AS studentId,
      s.full_name,
      s.student_id AS student_code,
      s.course,
      s.branch,
      s.year,
      fl.floor_number,
      rm.room_number,
      b.bed_number,
      h.name AS hostel_name,
      h.code AS hostel_code,
      a.attendance_date,
      a.status,
      a.marked_at
    FROM students s
    JOIN beds b ON s.bed_id = b.id
    JOIN rooms rm ON b.room_id = rm.id
    JOIN floors fl ON rm.floor_id = fl.id
    JOIN hostels h ON rm.hostel_id = h.id
    LEFT JOIN attendance a ON s.id = a.student_id AND a.attendance_date BETWEEN ? AND ?
    WHERE rm.hostel_id = ? AND s.status = 'ACTIVE'
    ORDER BY fl.floor_number, rm.room_number, s.full_name, a.attendance_date;
  `;

  const [rows] = await db.pool.query(sql, [dateFrom, dateTo, hostelId]);
  return rows;
}

module.exports = {
  bulkMark,
  getHostelAttendance,
  getStudentAttendance,
  getMyAttendance,
  updateAttendance,
  getHostelSummary,
  getAttendanceRange
};
