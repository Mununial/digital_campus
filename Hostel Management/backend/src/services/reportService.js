const db = require('../config/db');
const { getAssignedHostels } = require('../utils/authorization');

/**
 * Helper: Validate and sanitize date ranges.
 * Defaults: date_from = 30 days ago, date_to = today.
 * Max range: 365 days.
 */
function validateDateRange(dateFromStr, dateToStr) {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const formatDate = (d) => d.toISOString().split('T')[0];

  const date_from = dateFromStr || formatDate(thirtyDaysAgo);
  const date_to = dateToStr || formatDate(today);

  // Validate YYYY-MM-DD regex
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date_from) || !dateRegex.test(date_to)) {
    const err = new Error('Invalid date format. Expected YYYY-MM-DD.');
    err.status = 400;
    throw err;
  }

  const dFrom = new Date(date_from);
  const dTo = new Date(date_to);

  if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) {
    const err = new Error('Invalid calendar date provided.');
    err.status = 400;
    throw err;
  }

  if (dFrom > dTo) {
    const err = new Error('date_from cannot be greater than date_to.');
    err.status = 400;
    throw err;
  }

  const diffDays = Math.ceil((dTo - dFrom) / (1000 * 60 * 60 * 24));
  if (diffDays > 365) {
    const err = new Error('Date range cannot exceed 365 days.');
    err.status = 400;
    throw err;
  }

  return { date_from, date_to, diffDays };
}

/**
 * Helper: Determine allowed hostel IDs based on user role and optional filter.
 */
async function resolveHostelScope(user, requestedHostelId = null) {
  if (user.role === 'SUPER_ADMIN') {
    if (requestedHostelId && requestedHostelId !== 'all') {
      return [Number(requestedHostelId)];
    }
    return null; // null = all hostels
  }

  if (user.role === 'SUPERINTENDENT') {
    const assigned = await getAssignedHostels(user.id);
    if (!assigned || assigned.length === 0) {
      return []; // No access
    }
    if (requestedHostelId && requestedHostelId !== 'all') {
      const requestedId = Number(requestedHostelId);
      if (!assigned.includes(requestedId)) {
        const err = new Error('Forbidden: You are not authorized to view reports for this hostel.');
        err.status = 403;
        throw err;
      }
      return [requestedId];
    }
    return assigned;
  }

  const err = new Error('Forbidden: Access denied.');
  err.status = 403;
  throw err;
}

/**
 * Helper to build SQL WHERE clause snippet for hostel scoping.
 */
function buildHostelClause(allowedHostelIds, tableAlias = 'r') {
  if (allowedHostelIds === null) return { clause: '', params: [] };
  if (allowedHostelIds.length === 0) return { clause: ' AND 1=0', params: [] };
  const ph = allowedHostelIds.map(() => '?').join(',');
  return { clause: ` AND ${tableAlias}.hostel_id IN (${ph})`, params: allowedHostelIds };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OVERVIEW REPORT
// ─────────────────────────────────────────────────────────────────────────────
async function getOverviewReport(user, options = {}) {
  const allowedHostels = await resolveHostelScope(user, options.hostel_id);
  const { date_from, date_to } = validateDateRange(options.date_from, options.date_to);

  const rClause = buildHostelClause(allowedHostels, 'r');

  const hostelCountSql = allowedHostels === null
    ? `SELECT COUNT(*) AS totalHostels FROM hostels WHERE status = 'ACTIVE'`
    : (allowedHostels.length === 0
        ? `SELECT 0 AS totalHostels`
        : `SELECT COUNT(*) AS totalHostels FROM hostels WHERE status = 'ACTIVE' AND id IN (${allowedHostels.map(() => '?').join(',')})`);
  const hostelCountParams = (allowedHostels === null || allowedHostels.length === 0) ? [] : allowedHostels;

  const studentSql = allowedHostels === null
    ? `SELECT COUNT(*) AS totalStudents FROM students s WHERE s.status = 'ACTIVE'`
    : `SELECT COUNT(*) AS totalStudents FROM students s
       JOIN beds b ON s.bed_id = b.id
       JOIN rooms r ON b.room_id = r.id
       WHERE s.status = 'ACTIVE'${rClause.clause}`;

  const roomSql = allowedHostels === null
    ? `SELECT COUNT(*) AS totalRooms FROM rooms`
    : `SELECT COUNT(*) AS totalRooms FROM rooms r WHERE 1=1${rClause.clause}`;

  const bedSql = allowedHostels === null
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
       WHERE 1=1${rClause.clause}`;

  const [
    [hRows], [sRows], [rRows], [bRows]
  ] = await Promise.all([
    db.pool.query(hostelCountSql, hostelCountParams).then(res => res[0]),
    db.pool.query(studentSql, rClause.params).then(res => res[0]),
    db.pool.query(roomSql, rClause.params).then(res => res[0]),
    db.pool.query(bedSql, rClause.params).then(res => res[0])
  ]);

  const occupiedBeds = Number(bRows?.[0]?.occupiedBeds) || 0;
  const availableBeds = Number(bRows?.[0]?.availableBeds) || 0;
  const maintenanceBeds = Number(bRows?.[0]?.maintenanceBeds) || 0;
  const usableBeds = occupiedBeds + availableBeds;
  const occupancyPercentage = usableBeds > 0 ? parseFloat(((occupiedBeds / usableBeds) * 100).toFixed(2)) : 0;

  // 2. Today's Attendance
  const today = new Date().toISOString().split('T')[0];
  let present = 0, absent = 0, notMarked = 0;

  const stSql = allowedHostels === null
    ? `SELECT s.id FROM students s WHERE s.status = 'ACTIVE'`
    : `SELECT s.id FROM students s
       JOIN beds b ON s.bed_id = b.id
       JOIN rooms r ON b.room_id = r.id
       WHERE s.status = 'ACTIVE'${rClause.clause}`;

  const [stRows] = await db.pool.query(stSql, rClause.params);
  const activeStudentIds = stRows.map(r => r.id);

  if (activeStudentIds.length > 0) {
    const idPh = activeStudentIds.map(() => '?').join(',');
    const [[attCounts]] = await db.pool.query(
      `SELECT
         SUM(status = 'PRESENT') AS present,
         SUM(status = 'ABSENT') AS absent,
         COUNT(DISTINCT student_id) AS markedCount
       FROM attendance
       WHERE attendance_date = ? AND student_id IN (${idPh})`,
      [today, ...activeStudentIds]
    );
    present = Number(attCounts?.present) || 0;
    absent = Number(attCounts?.absent) || 0;
    notMarked = Math.max(0, activeStudentIds.length - (Number(attCounts?.markedCount) || 0));
  }
  const totalMarked = present + absent;
  const attendancePercentage = totalMarked > 0 ? parseFloat(((present / totalMarked) * 100).toFixed(2)) : 0;

  // 3. Complaints Overview
  const cClause = buildHostelClause(allowedHostels, 'c');
  const [[cRows]] = await db.pool.query(
    `SELECT
       COUNT(*) AS totalComplaints,
       SUM(status IN ('OPEN', 'REOPENED')) AS openComplaints,
       SUM(status = 'IN_PROGRESS') AS inProgressComplaints,
       SUM(status IN ('RESOLVED', 'CLOSED')) AS resolvedComplaints,
       SUM(priority = 'URGENT' AND status IN ('OPEN', 'IN_PROGRESS', 'REOPENED')) AS urgentComplaints
     FROM complaints c WHERE 1=1${cClause.clause}`,
    cClause.params
  );

  // 4. Visitors Overview
  const vClause = buildHostelClause(allowedHostels, 'v');
  const [[vRows]] = await db.pool.query(
    `SELECT
       COUNT(*) AS totalVisits,
       SUM(status = 'CHECKED_IN') AS currentVisitors,
       SUM(status = 'CHECKED_IN' AND expected_check_out < NOW()) AS overdueVisitors
     FROM visits v WHERE 1=1${vClause.clause}`,
    vClause.params
  );

  // 5. Fee Financial Overview
  const sfClause = buildHostelClause(allowedHostels, 'sf');
  const [[fRows]] = await db.pool.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS totalExpected,
       COALESCE(SUM(paid_amount), 0) AS totalCollected,
       COALESCE(SUM(amount - paid_amount), 0) AS totalPending,
       COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN (amount - paid_amount) ELSE 0 END), 0) AS totalOverdue
     FROM student_fees sf WHERE status != 'WAIVED'${sfClause.clause}`,
    sfClause.params
  );

  const totalExpected = parseFloat(fRows?.totalExpected) || 0;
  const totalCollected = parseFloat(fRows?.totalCollected) || 0;
  const collectionRate = totalExpected > 0 ? parseFloat(((totalCollected / totalExpected) * 100).toFixed(2)) : 0;

  return {
    infrastructure: {
      totalHostels: Number(hRows?.totalHostels ?? hRows?.[0]?.totalHostels) || 0,
      totalStudents: Number(sRows?.totalStudents ?? sRows?.[0]?.totalStudents) || 0,
      totalRooms: Number(rRows?.totalRooms ?? rRows?.[0]?.totalRooms) || 0,
      totalBeds: Number(bRows?.totalBeds ?? bRows?.[0]?.totalBeds) || 0,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      occupancyPercentage
    },
    attendance: {
      presentToday: present,
      absentToday: absent,
      notMarkedToday: notMarked,
      attendancePercentage
    },
    complaints: {
      totalComplaints: Number(cRows?.totalComplaints) || 0,
      openComplaints: Number(cRows?.openComplaints) || 0,
      inProgressComplaints: Number(cRows?.inProgressComplaints) || 0,
      resolvedComplaints: Number(cRows?.resolvedComplaints) || 0,
      urgentComplaints: Number(cRows?.urgentComplaints) || 0
    },
    visitors: {
      totalVisits: Number(vRows?.totalVisits) || 0,
      currentVisitors: Number(vRows?.currentVisitors) || 0,
      overdueVisitors: Number(vRows?.overdueVisitors) || 0
    },
    fees: {
      totalExpected,
      totalCollected,
      totalPending: parseFloat(fRows?.totalPending) || 0,
      totalOverdue: parseFloat(fRows?.totalOverdue) || 0,
      collectionRate
    },
    date_range: { date_from, date_to }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STUDENT REPORT
// ─────────────────────────────────────────────────────────────────────────────
async function getStudentReport(user, options = {}) {
  const allowedHostels = await resolveHostelScope(user, options.hostel_id);
  const rClause = buildHostelClause(allowedHostels, 'r');

  const studentJoin = allowedHostels === null
    ? `FROM students s WHERE s.status = 'ACTIVE'`
    : `FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.status = 'ACTIVE'${rClause.clause}`;

  const studentParams = allowedHostels === null ? [] : rClause.params;

  // Overall count
  const [[totalRows]] = await db.pool.query(
    `SELECT COUNT(*) as total ${studentJoin}`,
    studentParams
  );

  // Breakdown by Branch
  const [branchRows] = await db.pool.query(
    `SELECT COALESCE(s.branch, 'Unspecified') AS branch, COUNT(*) AS count ${studentJoin} GROUP BY s.branch ORDER BY count DESC`,
    studentParams
  );

  // Breakdown by Course
  const [courseRows] = await db.pool.query(
    `SELECT COALESCE(s.course, 'Unspecified') AS course, COUNT(*) AS count ${studentJoin} GROUP BY s.course ORDER BY count DESC`,
    studentParams
  );

  // Breakdown by Year
  const [yearRows] = await db.pool.query(
    `SELECT COALESCE(s.year, '1') AS year, COUNT(*) AS count ${studentJoin} GROUP BY s.year ORDER BY s.year ASC`,
    studentParams
  );

  // Breakdown by Hostel
  const hostelSql = allowedHostels === null
    ? `SELECT h.id AS hostel_id, h.name AS hostel_name, COUNT(s.id) AS student_count
       FROM hostels h
       LEFT JOIN rooms r ON r.hostel_id = h.id
       LEFT JOIN beds b ON b.room_id = r.id
       LEFT JOIN students s ON s.bed_id = b.id AND s.status = 'ACTIVE'
       WHERE h.status = 'ACTIVE'
       GROUP BY h.id, h.name ORDER BY h.name`
    : (allowedHostels.length === 0
        ? `SELECT 1 AS hostel_id, '' AS hostel_name, 0 AS student_count WHERE 1=0`
        : `SELECT h.id AS hostel_id, h.name AS hostel_name, COUNT(s.id) AS student_count
           FROM hostels h
           LEFT JOIN rooms r ON r.hostel_id = h.id
           LEFT JOIN beds b ON b.room_id = r.id
           LEFT JOIN students s ON s.bed_id = b.id AND s.status = 'ACTIVE'
           WHERE h.status = 'ACTIVE' AND h.id IN (${allowedHostels.map(() => '?').join(',')})
           GROUP BY h.id, h.name ORDER BY h.name`);
  const hostelParams = (allowedHostels === null || allowedHostels.length === 0) ? [] : allowedHostels;
  const [hostelRows] = await db.pool.query(hostelSql, hostelParams);

  return {
    totalStudents: Number(totalRows?.total) || 0,
    byBranch: branchRows.map(r => ({ branch: r.branch, count: Number(r.count) })),
    byCourse: courseRows.map(r => ({ course: r.course, count: Number(r.count) })),
    byYear: yearRows.map(r => ({ year: r.year, count: Number(r.count) })),
    byHostel: hostelRows.map(r => ({ hostel_id: r.hostel_id, hostel_name: r.hostel_name, student_count: Number(r.student_count) }))
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ATTENDANCE REPORT
// ─────────────────────────────────────────────────────────────────────────────
async function getAttendanceReport(user, options = {}) {
  const allowedHostels = await resolveHostelScope(user, options.hostel_id);
  const { date_from, date_to } = validateDateRange(options.date_from, options.date_to);

  const rClause = buildHostelClause(allowedHostels, 'r');
  const aClause = buildHostelClause(allowedHostels, 'a');

  // Today's snapshot
  const today = new Date().toISOString().split('T')[0];

  const stSql = allowedHostels === null
    ? `SELECT s.id FROM students s WHERE s.status = 'ACTIVE'`
    : `SELECT s.id FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.status = 'ACTIVE'${rClause.clause}`;

  const [stRows] = await db.pool.query(stSql, rClause.params);
  const activeStudentIds = stRows.map(r => r.id);

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
      [today, ...activeStudentIds]
    );
    present = Number(attCounts?.present) || 0;
    absent = Number(attCounts?.absent) || 0;
    notMarked = Math.max(0, activeStudentIds.length - (Number(attCounts?.markedCount) || 0));
  }
  const totalMarked = present + absent;
  const attendancePercentage = totalMarked > 0 ? parseFloat(((present / totalMarked) * 100).toFixed(2)) : 0;

  // Daily attendance trend over range
  let trendSql = `SELECT
                    attendance_date,
                    SUM(status = 'PRESENT') AS present,
                    SUM(status = 'ABSENT') AS absent
                  FROM attendance a
                  WHERE a.attendance_date BETWEEN ? AND ?${aClause.clause}
                  GROUP BY attendance_date ORDER BY attendance_date ASC`;
  const [trendRows] = await db.pool.query(trendSql, [date_from, date_to, ...aClause.params]);

  const dailyTrend = trendRows.map(r => {
    const p = Number(r.present) || 0;
    const a = Number(r.absent) || 0;
    const tot = p + a;
    const pct = tot > 0 ? parseFloat(((p / tot) * 100).toFixed(2)) : 0;
    return {
      date: r.attendance_date instanceof Date ? r.attendance_date.toISOString().split('T')[0] : String(r.attendance_date).substring(0, 10),
      present: p,
      absent: a,
      attendancePercentage: pct
    };
  });

  // Cross-Hostel Comparison Breakdown
  const hostelSql = allowedHostels === null
    ? `SELECT id, name FROM hostels WHERE status = 'ACTIVE' ORDER BY name`
    : (allowedHostels.length === 0
        ? `SELECT id, name FROM hostels WHERE 1=0`
        : `SELECT id, name FROM hostels WHERE status = 'ACTIVE' AND id IN (${allowedHostels.map(() => '?').join(',')}) ORDER BY name`);
  const hostelParams = (allowedHostels === null || allowedHostels.length === 0) ? [] : allowedHostels;
  const [hostelRows] = await db.pool.query(hostelSql, hostelParams);

  const hostelComparison = await Promise.all(hostelRows.map(async (h) => {
    const [stuRows] = await db.pool.query(
      `SELECT COUNT(*) AS total FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.status = 'ACTIVE' AND r.hostel_id = ?`,
      [h.id]
    );
    const totalStu = Number(stuRows?.[0]?.total) || 0;

    const [[aRows]] = await db.pool.query(
      `SELECT
         SUM(status = 'PRESENT') AS present,
         SUM(status = 'ABSENT') AS absent,
         COUNT(DISTINCT student_id) AS markedCount
       FROM attendance
       WHERE attendance_date = ? AND hostel_id = ?`,
      [today, h.id]
    );

    const hP = Number(aRows?.present) || 0;
    const hA = Number(aRows?.absent) || 0;
    const hM = Number(aRows?.markedCount) || 0;
    const hNM = Math.max(0, totalStu - hM);
    const hTot = hP + hA;
    const hPct = hTot > 0 ? parseFloat(((hP / hTot) * 100).toFixed(2)) : 0;

    return {
      hostel_id: h.id,
      hostel_name: h.name,
      totalStudents: totalStu,
      present: hP,
      absent: hA,
      notMarked: hNM,
      attendancePercentage: hPct
    };
  }));

  return {
    summary: {
      totalStudents: activeStudentIds.length,
      present,
      absent,
      notMarked,
      attendancePercentage
    },
    dailyTrend,
    hostelComparison,
    date_range: { date_from, date_to }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. OCCUPANCY REPORT
// ─────────────────────────────────────────────────────────────────────────────
async function getOccupancyReport(user, options = {}) {
  const allowedHostels = await resolveHostelScope(user, options.hostel_id);
  const rClause = buildHostelClause(allowedHostels, 'r');

  const bedSql = allowedHostels === null
    ? `SELECT
         COUNT(*) AS totalBeds,
         SUM(status = 'OCCUPIED') AS occupied,
         SUM(status = 'AVAILABLE') AS available,
         SUM(status = 'MAINTENANCE') AS maintenance
       FROM beds`
    : `SELECT
         COUNT(*) AS totalBeds,
         SUM(b.status = 'OCCUPIED') AS occupied,
         SUM(b.status = 'AVAILABLE') AS available,
         SUM(b.status = 'MAINTENANCE') AS maintenance
       FROM beds b
       JOIN rooms r ON b.room_id = r.id
       WHERE 1=1${rClause.clause}`;

  const [[bRows]] = await db.pool.query(bedSql, rClause.params);

  const occupied = Number(bRows?.occupied) || 0;
  const available = Number(bRows?.available) || 0;
  const maintenance = Number(bRows?.maintenance) || 0;
  const usable = occupied + available;
  const occupancyPercentage = usable > 0 ? parseFloat(((occupied / usable) * 100).toFixed(2)) : 0;

  // Hostel Breakdown
  const hostelSql = allowedHostels === null
    ? `SELECT h.id AS hostel_id, h.name AS hostel_name,
              COUNT(b.id) AS totalBeds,
              SUM(b.status = 'OCCUPIED') AS occupied,
              SUM(b.status = 'AVAILABLE') AS available,
              SUM(b.status = 'MAINTENANCE') AS maintenance
       FROM hostels h
       JOIN rooms r ON r.hostel_id = h.id
       JOIN beds b ON b.room_id = r.id
       WHERE h.status = 'ACTIVE'
       GROUP BY h.id, h.name ORDER BY h.name`
    : (allowedHostels.length === 0
        ? `SELECT 1 AS hostel_id, '' AS hostel_name, 0 AS totalBeds, 0 AS occupied, 0 AS available, 0 AS maintenance WHERE 1=0`
        : `SELECT h.id AS hostel_id, h.name AS hostel_name,
              COUNT(b.id) AS totalBeds,
              SUM(b.status = 'OCCUPIED') AS occupied,
              SUM(b.status = 'AVAILABLE') AS available,
              SUM(b.status = 'MAINTENANCE') AS maintenance
       FROM hostels h
       JOIN rooms r ON r.hostel_id = h.id
       JOIN beds b ON b.room_id = r.id
       WHERE h.status = 'ACTIVE' AND h.id IN (${allowedHostels.map(() => '?').join(',')})
       GROUP BY h.id, h.name ORDER BY h.name`);
  const hostelParams = (allowedHostels === null || allowedHostels.length === 0) ? [] : allowedHostels;
  const [hostelRows] = await db.pool.query(hostelSql, hostelParams);

  const byHostel = hostelRows.map(r => {
    const o = Number(r.occupied) || 0;
    const a = Number(r.available) || 0;
    const u = o + a;
    const pct = u > 0 ? parseFloat(((o / u) * 100).toFixed(2)) : 0;
    return {
      hostel_id: r.hostel_id,
      hostel_name: r.hostel_name,
      totalBeds: Number(r.totalBeds) || 0,
      occupied: o,
      available: a,
      maintenance: Number(r.maintenance) || 0,
      occupancyPercentage: pct
    };
  });

  return {
    overall: {
      totalBeds: Number(bRows?.totalBeds) || 0,
      occupied,
      available,
      maintenance,
      occupancyPercentage
    },
    byHostel
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COMPLAINT REPORT
// ─────────────────────────────────────────────────────────────────────────────
async function getComplaintReport(user, options = {}) {
  const allowedHostels = await resolveHostelScope(user, options.hostel_id);
  const { date_from, date_to } = validateDateRange(options.date_from, options.date_to);

  const cClause = buildHostelClause(allowedHostels, 'c');
  const paramsWithDates = [date_from, date_to, ...cClause.params];

  const [[summaryRows]] = await db.pool.query(
    `SELECT
       COUNT(*) AS totalComplaints,
       SUM(status = 'OPEN') AS open,
       SUM(status = 'IN_PROGRESS') AS inProgress,
       SUM(status = 'RESOLVED') AS resolved,
       SUM(status = 'CLOSED') AS closed,
       SUM(status = 'REOPENED') AS reopened,
       SUM(priority = 'URGENT') AS urgent
     FROM complaints c
     WHERE DATE(created_at) BETWEEN ? AND ?${cClause.clause}`,
    paramsWithDates
  );

  const totalComplaints = Number(summaryRows?.totalComplaints) || 0;
  const resolvedCount = (Number(summaryRows?.resolved) || 0) + (Number(summaryRows?.closed) || 0);
  const resolutionRate = totalComplaints > 0 ? parseFloat(((resolvedCount / totalComplaints) * 100).toFixed(2)) : 0;

  // Breakdown by Category
  const [catRows] = await db.pool.query(
    `SELECT category, COUNT(*) AS count
     FROM complaints c
     WHERE DATE(created_at) BETWEEN ? AND ?${cClause.clause}
     GROUP BY category ORDER BY count DESC`,
    paramsWithDates
  );

  // Breakdown by Priority
  const [priRows] = await db.pool.query(
    `SELECT priority, COUNT(*) AS count
     FROM complaints c
     WHERE DATE(created_at) BETWEEN ? AND ?${cClause.clause}
     GROUP BY priority ORDER BY count DESC`,
    paramsWithDates
  );

  // Daily Complaint Trend
  const [trendRows] = await db.pool.query(
    `SELECT DATE(created_at) AS complaint_date, COUNT(*) AS count
     FROM complaints c
     WHERE DATE(created_at) BETWEEN ? AND ?${cClause.clause}
     GROUP BY DATE(created_at) ORDER BY complaint_date ASC`,
    paramsWithDates
  );

  return {
    summary: {
      totalComplaints,
      open: Number(summaryRows?.open) || 0,
      inProgress: Number(summaryRows?.inProgress) || 0,
      resolved: Number(summaryRows?.resolved) || 0,
      closed: Number(summaryRows?.closed) || 0,
      reopened: Number(summaryRows?.reopened) || 0,
      urgent: Number(summaryRows?.urgent) || 0,
      resolutionRate
    },
    byCategory: catRows.map(r => ({ category: r.category, count: Number(r.count) })),
    byPriority: priRows.map(r => ({ priority: r.priority, count: Number(r.count) })),
    trend: trendRows.map(r => ({
      date: r.complaint_date instanceof Date ? r.complaint_date.toISOString().split('T')[0] : String(r.complaint_date).substring(0, 10),
      count: Number(r.count)
    })),
    date_range: { date_from, date_to }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. VISITOR REPORT
// ─────────────────────────────────────────────────────────────────────────────
async function getVisitorReport(user, options = {}) {
  const allowedHostels = await resolveHostelScope(user, options.hostel_id);
  const { date_from, date_to } = validateDateRange(options.date_from, options.date_to);

  const vClause = buildHostelClause(allowedHostels, 'v');
  const paramsWithDates = [date_from, date_to, ...vClause.params];

  const [[summaryRows]] = await db.pool.query(
    `SELECT
       COUNT(*) AS totalVisits,
       SUM(status = 'REQUESTED') AS requested,
       SUM(status = 'APPROVED') AS approved,
       SUM(status = 'CHECKED_IN') AS checkedIn,
       SUM(status = 'CHECKED_OUT') AS checkedOut,
       SUM(status = 'REJECTED') AS rejected,
       SUM(status = 'CANCELLED') AS cancelled,
       SUM(status = 'CHECKED_IN') AS currentVisitors,
       SUM(status = 'CHECKED_IN' AND expected_check_out < NOW()) AS overdueVisitors
     FROM visits v
     WHERE visit_date BETWEEN ? AND ?${vClause.clause}`,
    paramsWithDates
  );

  // Breakdown by Visitor Type
  const [typeRows] = await db.pool.query(
    `SELECT COALESCE(visitor_type, 'OTHER') AS relation, COUNT(*) AS count
     FROM visits v
     WHERE visit_date BETWEEN ? AND ?${vClause.clause}
     GROUP BY visitor_type ORDER BY count DESC`,
    paramsWithDates
  );

  // Daily Visitors Trend
  const [trendRows] = await db.pool.query(
    `SELECT visit_date, COUNT(*) AS count
     FROM visits v
     WHERE visit_date BETWEEN ? AND ?${vClause.clause}
     GROUP BY visit_date ORDER BY visit_date ASC`,
    paramsWithDates
  );

  return {
    summary: {
      totalVisits: Number(summaryRows?.totalVisits) || 0,
      requested: Number(summaryRows?.requested) || 0,
      approved: Number(summaryRows?.approved) || 0,
      checkedIn: Number(summaryRows?.checkedIn) || 0,
      checkedOut: Number(summaryRows?.checkedOut) || 0,
      rejected: Number(summaryRows?.rejected) || 0,
      cancelled: Number(summaryRows?.cancelled) || 0,
      currentVisitors: Number(summaryRows?.currentVisitors) || 0,
      overdueVisitors: Number(summaryRows?.overdueVisitors) || 0
    },
    byVisitorType: typeRows.map(r => ({ relation: r.relation, count: Number(r.count) })),
    trend: trendRows.map(r => ({
      date: r.visit_date instanceof Date ? r.visit_date.toISOString().split('T')[0] : String(r.visit_date).substring(0, 10),
      count: Number(r.count)
    })),
    date_range: { date_from, date_to }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MESS REPORT
// ─────────────────────────────────────────────────────────────────────────────
async function getMessReport(user, options = {}) {
  const allowedHostels = await resolveHostelScope(user, options.hostel_id);
  const { date_from, date_to } = validateDateRange(options.date_from, options.date_to);

  const maClause = buildHostelClause(allowedHostels, 'ma');
  const paramsWithDates = [date_from, date_to, ...maClause.params];

  const [mealRows] = await db.pool.query(
    `SELECT
       ma.meal_type,
       SUM(ma.status = 'TAKING') AS takingCount,
       SUM(ma.status = 'NOT_TAKING') AS notTakingCount,
       COUNT(*) AS totalResponses
     FROM meal_attendance ma
     WHERE ma.meal_date BETWEEN ? AND ?${maClause.clause}
     GROUP BY ma.meal_type`,
    paramsWithDates
  );

  let overallTaking = 0;
  let overallTotal = 0;

  const byMealType = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'].map(mt => {
    const found = mealRows.find(r => r.meal_type === mt);
    const taking = Number(found?.takingCount) || 0;
    const notTaking = Number(found?.notTakingCount) || 0;
    const total = Number(found?.totalResponses) || 0;
    const pct = total > 0 ? parseFloat(((taking / total) * 100).toFixed(2)) : 0;

    overallTaking += taking;
    overallTotal += total;

    return {
      meal_type: mt,
      taking,
      notTaking,
      totalResponses: total,
      participationPercentage: pct
    };
  });

  const overallParticipationPercentage = overallTotal > 0 ? parseFloat(((overallTaking / overallTotal) * 100).toFixed(2)) : 0;

  return {
    summary: {
      overallTaking,
      overallTotal,
      overallParticipationPercentage
    },
    byMealType,
    date_range: { date_from, date_to }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. FEE REPORT
// ─────────────────────────────────────────────────────────────────────────────
async function getFeeReport(user, options = {}) {
  const allowedHostels = await resolveHostelScope(user, options.hostel_id);
  const { date_from, date_to } = validateDateRange(options.date_from, options.date_to);

  const sfClause = buildHostelClause(allowedHostels, 'sf');

  // Overall Financial Aggregation
  const [[fRows]] = await db.pool.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS totalExpected,
       COALESCE(SUM(paid_amount), 0) AS totalCollected,
       COALESCE(SUM(amount - paid_amount), 0) AS totalPending,
       COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN (amount - paid_amount) ELSE 0 END), 0) AS totalOverdue,
       COALESCE(SUM(CASE WHEN status = 'WAIVED' THEN amount ELSE 0 END), 0) AS totalWaived
     FROM student_fees sf WHERE 1=1${sfClause.clause}`,
    sfClause.params
  );

  const totalExpected = parseFloat(fRows?.totalExpected) || 0;
  const totalCollected = parseFloat(fRows?.totalCollected) || 0;
  const totalPending = parseFloat(fRows?.totalPending) || 0;
  const totalOverdue = parseFloat(fRows?.totalOverdue) || 0;
  const totalWaived = parseFloat(fRows?.totalWaived) || 0;

  const collectionRate = totalExpected > 0 ? parseFloat(((totalCollected / totalExpected) * 100).toFixed(2)) : 0;

  // Breakdown by Fee Type
  const [typeRows] = await db.pool.query(
    `SELECT
       COALESCE(fs.fee_type, 'HOSTEL_FEE') AS fee_type,
       COALESCE(SUM(sf.amount), 0) AS expected,
       COALESCE(SUM(sf.paid_amount), 0) AS collected
     FROM student_fees sf
     LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
     WHERE 1=1${sfClause.clause}
     GROUP BY COALESCE(fs.fee_type, 'HOSTEL_FEE')`,
    sfClause.params
  );

  // Daily Collection Trend over date range
  const [trendRows] = await db.pool.query(
    `SELECT
       fp.payment_date,
       COALESCE(SUM(fp.amount), 0) AS total_collected,
       COUNT(fp.id) AS transaction_count
     FROM fee_payments fp
     JOIN student_fees sf ON fp.student_fee_id = sf.id
     WHERE fp.payment_date BETWEEN ? AND ?${sfClause.clause}
     GROUP BY fp.payment_date ORDER BY fp.payment_date ASC`,
    [date_from, date_to, ...sfClause.params]
  );

  return {
    summary: {
      totalExpected,
      totalCollected,
      totalPending,
      totalOverdue,
      totalWaived,
      collectionRate
    },
    byFeeType: typeRows.map(r => {
      const exp = parseFloat(r.expected) || 0;
      const col = parseFloat(r.collected) || 0;
      const rate = exp > 0 ? parseFloat(((col / exp) * 100).toFixed(2)) : 0;
      return {
        fee_type: r.fee_type,
        expected: exp,
        collected: col,
        collectionRate: rate
      };
    }),
    dailyCollectionTrend: trendRows.map(r => ({
      date: r.payment_date instanceof Date ? r.payment_date.toISOString().split('T')[0] : String(r.payment_date).substring(0, 10),
      totalCollected: parseFloat(r.total_collected) || 0,
      transactionCount: Number(r.transaction_count) || 0
    })),
    date_range: { date_from, date_to }
  };
}

module.exports = {
  validateDateRange,
  resolveHostelScope,
  getOverviewReport,
  getStudentReport,
  getAttendanceReport,
  getOccupancyReport,
  getComplaintReport,
  getVisitorReport,
  getMessReport,
  getFeeReport
};
