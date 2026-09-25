const db = require('../config/db');
const { getAssignedHostels } = require('../utils/authorization');

/**
 * Build dashboard overview aggregation based on user role.
 *
 * Formulas:
 *   Present  = active students with PRESENT attendance today
 *   Absent   = active students with ABSENT attendance today
 *   NotMarked = active students - students with ANY attendance record today
 *   Attendance % = Present / (Present + Absent) * 100  [0 if none marked]
 *
 *   Occupied        = beds with status OCCUPIED
 *   Available       = beds with status AVAILABLE
 *   Maintenance     = beds with status MAINTENANCE
 *   Usable Beds     = Occupied + Available
 *   Occupancy %     = Occupied / Usable Beds * 100      [0 if usable = 0]
 *
 * Percentages are rounded to 2 decimal places.
 *
 * Returns { overall: {...}, hostels: [{...}] }
 */
async function getDashboardOverview(user) {
  if (!user) throw new Error('Unauthenticated');

  // ── Role scope resolution ──────────────────────────────────────────────────
  let allowedHostelIds = null; // null = all hostels (SUPER_ADMIN)
  if (user.role === 'SUPERINTENDENT') {
    const assigned = await getAssignedHostels(user.id);
    allowedHostelIds = assigned.length ? assigned : [];
  } else if (user.role === 'STUDENT') {
    const [rows] = await db.pool.query(
      `SELECT r.hostel_id FROM students s
       JOIN beds b ON s.bed_id = b.id
       JOIN rooms r ON b.room_id = r.id
       WHERE s.user_id = ? OR s.id = ?`,
      [user.id, user.student_id || user.id]
    );
    allowedHostelIds = (rows && rows.length && rows[0].hostel_id) ? [rows[0].hostel_id] : [];
  } else if (user.role !== 'SUPER_ADMIN') {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  // ── Today's date string ───────────────────────────────────────────────────
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // ── Hostel IN clause helper ───────────────────────────────────────────────
  const buildHostelWhere = (alias = 'r') => {
    if (allowedHostelIds === null) return { clause: '', params: [] };
    if (allowedHostelIds.length === 0) return { clause: ` AND 1=0`, params: [] };
    const ph = allowedHostelIds.map(() => '?').join(',');
    return { clause: ` AND ${alias}.hostel_id IN (${ph})`, params: allowedHostelIds };
  };

  // ── Overall aggregations (all in parallel) ────────────────────────────────
  const hostelWhere = buildHostelWhere('r');

  // For SUPER_ADMIN: total hostels is all hostels.
  // For SUPERINTENDENT/STUDENT: total hostels is assigned count.
  const hostelCountSql = allowedHostelIds === null
    ? `SELECT COUNT(*) AS totalHostels FROM hostels WHERE status = 'ACTIVE'`
    : `SELECT COUNT(*) AS totalHostels FROM hostels WHERE status = 'ACTIVE' AND id IN (${allowedHostelIds.length ? allowedHostelIds.map(() => '?').join(',') : 'NULL'})`;
  const hostelCountParams = allowedHostelIds === null ? [] : allowedHostelIds;

  // Students, rooms, beds — scoped by hostel assignment
  const studentSql = allowedHostelIds === null
    ? `SELECT COUNT(*) AS totalStudents FROM students s WHERE s.status = 'ACTIVE'`
    : `SELECT COUNT(*) AS totalStudents FROM students s
       JOIN beds b ON s.bed_id = b.id
       JOIN rooms r ON b.room_id = r.id
       WHERE s.status = 'ACTIVE'${hostelWhere.clause}`;

  const roomSql = allowedHostelIds === null
    ? `SELECT COUNT(*) AS totalRooms FROM rooms`
    : `SELECT COUNT(*) AS totalRooms FROM rooms r WHERE 1=1${hostelWhere.clause}`;

  const bedSql = allowedHostelIds === null
    ? `SELECT
         COUNT(*) AS totalBeds,
         SUM(status = 'OCCUPIED') AS occupiedBeds,
         SUM(status = 'AVAILABLE') AS availableBeds,
         SUM(status = 'MAINTENANCE') AS maintenanceBeds
       FROM beds`
    : `SELECT
         COUNT(*) AS totalBeds,
         SUM(b.status = 'OCCUPIED') AS occupiedBeds,
         SUM(b.status = 'AVAILABLE') AS availableBeds,
         SUM(b.status = 'MAINTENANCE') AS maintenanceBeds
       FROM beds b
       JOIN rooms r ON b.room_id = r.id
       WHERE 1=1${hostelWhere.clause}`;

  const [
    [hostelCountRows],
    [studentCountRows],
    [roomCountRows],
    [bedCounts]
  ] = await Promise.all([
    db.pool.query(hostelCountSql, hostelCountParams),
    db.pool.query(studentSql, hostelWhere.params),
    db.pool.query(roomSql, hostelWhere.params),
    db.pool.query(bedSql, hostelWhere.params),
  ]);

  // ── Attendance (scoped) ───────────────────────────────────────────────────
  // Get active student IDs in scope
  const [scopedStudents] = await db.pool.query(studentSql + ' -- ids', hostelWhere.params);
  // Re-run with IDs instead
  let activeStudentIds = [];
  if (allowedHostelIds === null) {
    const [rows] = await db.pool.query(`SELECT id FROM students WHERE status = 'ACTIVE'`);
    activeStudentIds = rows.map(r => r.id);
  } else if (allowedHostelIds.length > 0) {
    const ph = allowedHostelIds.map(() => '?').join(',');
    const [rows] = await db.pool.query(
      `SELECT s.id FROM students s
       JOIN beds b ON s.bed_id = b.id
       JOIN rooms r ON b.room_id = r.id
       WHERE s.status = 'ACTIVE' AND r.hostel_id IN (${ph})`,
      allowedHostelIds
    );
    activeStudentIds = rows.map(r => r.id);
  }

  let present = 0, absent = 0, notMarked = 0;

  if (activeStudentIds.length > 0) {
    const idPh = activeStudentIds.map(() => '?').join(',');
    const [[attCounts]] = await db.pool.query(
      `SELECT
         SUM(status = 'PRESENT') AS present,
         SUM(status = 'ABSENT') AS absent,
         COUNT(DISTINCT student_id) AS markedCount
       FROM attendance
       WHERE attendance_date = ? AND student_id IN (${idPh})`,
      [todayStr, ...activeStudentIds]
    );
    present = Number(attCounts?.present) || 0;
    absent = Number(attCounts?.absent) || 0;
    notMarked = activeStudentIds.length - (Number(attCounts?.markedCount) || 0);
  }

  const totalMarked = present + absent;
  const attendancePercentage = totalMarked > 0 ? parseFloat(((present / totalMarked) * 100).toFixed(2)) : 0;

  const occupiedBeds = Number(bedCounts?.[0]?.occupiedBeds) || 0;
  const availableBeds = Number(bedCounts?.[0]?.availableBeds) || 0;
  const maintenanceBeds = Number(bedCounts?.[0]?.maintenanceBeds) || 0;
  const usableBeds = occupiedBeds + availableBeds;
  const occupancyPercentage = usableBeds > 0 ? parseFloat(((occupiedBeds / usableBeds) * 100).toFixed(2)) : 0;

  const overall = {
    totalHostels: Number(hostelCountRows?.[0]?.totalHostels) || 0,
    totalStudents: Number(studentCountRows?.[0]?.totalStudents) || 0,
    totalRooms: Number(roomCountRows?.[0]?.totalRooms) || 0,
    totalBeds: Number(bedCounts?.[0]?.totalBeds) || 0,
    occupiedBeds,
    availableBeds,
    maintenanceBeds,
    present,
    absent,
    notMarked,
    attendancePercentage,
    occupancyPercentage,
  };

  // ── Per-hostel aggregation (single efficient query per hostel) ────────────
  const hostelListSql = allowedHostelIds === null
    ? `SELECT id, name FROM hostels WHERE status = 'ACTIVE' ORDER BY name`
    : `SELECT id, name FROM hostels WHERE status = 'ACTIVE' AND id IN (${allowedHostelIds.length ? allowedHostelIds.map(() => '?').join(',') : 'NULL'}) ORDER BY name`;
  const hostelListParams = allowedHostelIds === null ? [] : allowedHostelIds;
  const [hostelRows] = await db.pool.query(hostelListSql, hostelListParams);

  const hostels = await Promise.all(hostelRows.map(async (h) => {
    const hostelId = h.id;

    const [
      [stuRows],
      [attRows],
      [bRows],
    ] = await Promise.all([
      // Students
      db.pool.query(
        `SELECT COUNT(*) AS totalStudents FROM students s
         JOIN beds b ON s.bed_id = b.id
         JOIN rooms r ON b.room_id = r.id
         WHERE s.status = 'ACTIVE' AND r.hostel_id = ?`,
        [hostelId]
      ),
      // Attendance today
      db.pool.query(
        `SELECT
           SUM(a.status = 'PRESENT') AS present,
           SUM(a.status = 'ABSENT') AS absent,
           COUNT(DISTINCT a.student_id) AS markedCount
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         JOIN beds b ON s.bed_id = b.id
         JOIN rooms r ON b.room_id = r.id
         WHERE a.attendance_date = ? AND r.hostel_id = ? AND s.status = 'ACTIVE'`,
        [todayStr, hostelId]
      ),
      // Beds
      db.pool.query(
        `SELECT
           COUNT(*) AS totalBeds,
           SUM(b.status = 'OCCUPIED') AS occupiedBeds,
           SUM(b.status = 'AVAILABLE') AS availableBeds,
           SUM(b.status = 'MAINTENANCE') AS maintenanceBeds,
           COUNT(DISTINCT r.id) AS totalRooms
         FROM beds b
         JOIN rooms r ON b.room_id = r.id
         WHERE r.hostel_id = ?`,
        [hostelId]
      ),
    ]);

    const hTotalStudents = Number(stuRows?.[0]?.totalStudents) || 0;
    const hPresent = Number(attRows?.[0]?.present) || 0;
    const hAbsent = Number(attRows?.[0]?.absent) || 0;
    const hMarked = Number(attRows?.[0]?.markedCount) || 0;
    const hNotMarked = hTotalStudents - hMarked;
    const hTotalMarked = hPresent + hAbsent;
    const hAttPct = hTotalMarked > 0 ? parseFloat(((hPresent / hTotalMarked) * 100).toFixed(2)) : 0;

    const hOccupied = Number(bRows?.[0]?.occupiedBeds) || 0;
    const hAvailable = Number(bRows?.[0]?.availableBeds) || 0;
    const hMaintenance = Number(bRows?.[0]?.maintenanceBeds) || 0;
    const hUsable = hOccupied + hAvailable;
    const hOccPct = hUsable > 0 ? parseFloat(((hOccupied / hUsable) * 100).toFixed(2)) : 0;

    return {
      hostelId,
      name: h.name,
      totalStudents: hTotalStudents,
      present: hPresent,
      absent: hAbsent,
      notMarked: hNotMarked,
      attendancePercentage: hAttPct,
      totalRooms: Number(bRows?.[0]?.totalRooms) || 0,
      totalBeds: Number(bRows?.[0]?.totalBeds) || 0,
      occupiedBeds: hOccupied,
      availableBeds: hAvailable,
      maintenanceBeds: hMaintenance,
      occupancyPercentage: hOccPct,
    };
  }));

  const noticeService = require('./noticeService');
  const FeeService = require('./feeService');

  let recentNotices = [];
  try {
    recentNotices = await noticeService.getRecentNotices(user, 5);
  } catch (err) {
    console.warn('Dashboard notice aggregation fallback:', err.message);
    recentNotices = [];
  }

  let feeSummary = null;
  try {
    if (user.role === 'STUDENT') {
      const [st] = await db.pool.query('SELECT id FROM students WHERE user_id = ?', [user.id]);
      if (st.length > 0) {
        feeSummary = await FeeService.getStudentFeeSummary(st[0].id);
      }
    } else {
      const targetHostel = (allowedHostelIds && allowedHostelIds.length === 1) ? allowedHostelIds[0] : null;
      feeSummary = await FeeService.getFeeSummary(targetHostel);
    }
  } catch (err) {
    console.warn('Dashboard fee summary aggregation fallback:', err.message);
  }

  return { overall, hostels, recentNotices, feeSummary };
}

module.exports = { getDashboardOverview };
