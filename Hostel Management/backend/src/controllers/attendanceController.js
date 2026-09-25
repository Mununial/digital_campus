const attendanceService = require('../services/attendanceService');

/**
 * GET /api/attendance/hostel/:hostelId?date=YYYY-MM-DD
 */
async function getHostelAttendance(req, res) {
  try {
    const hostelId = Number(req.params.hostelId);
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const data = await attendanceService.getHostelAttendance(hostelId, date, req.user);
    const list = Array.isArray(data) ? data : (data.attendance || []);
    const markedRows = list.filter(r => Boolean(r.status));
    const lastMarked = markedRows[markedRows.length - 1];
    const sessionInfo = {
      isLocked: markedRows.length > 0,
      markedBy: lastMarked?.marked_by_name || null,
      markedAt: lastMarked?.marked_at || null,
      markedCount: markedRows.length,
      totalStudents: list.length,
      isComplete: list.length > 0 && markedRows.length === list.length
    };
    res.json({ success: true, attendance: list, sessionInfo });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * GET /api/attendance/me
 */
async function getMyAttendance(req, res) {
  try {
    const data = await attendanceService.getMyAttendance(req.user);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * GET /api/attendance/student/:studentId
 */
async function getStudentAttendance(req, res) {
  try {
    const studentId = Number(req.params.studentId);
    const data = await attendanceService.getStudentAttendance(studentId, req.user);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * POST /api/attendance/bulk
 * Body: { date: 'YYYY-MM-DD', records: [{ studentId, status }] }
 */
async function bulkMark(req, res) {
  try {
    const { date, records, hostelId } = req.body;
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid attendance payload' });
    }
    await attendanceService.bulkMark(date, records, req.user, hostelId);
    res.json({ success: true, message: `Successfully recorded attendance for ${records.length} student(s).` });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * PUT /api/attendance/:id
 */
async function updateAttendance(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['PRESENT', 'ABSENT'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid attendance status' });
    }
    await attendanceService.updateAttendance(id, status, req.user);
    res.json({ success: true, message: 'Attendance record updated' });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * GET /api/attendance/hostel/:hostelId/summary?date=YYYY-MM-DD
 */
async function getHostelSummary(req, res) {
  try {
    const hostelId = Number(req.params.hostelId);
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const data = await attendanceService.getHostelSummary(hostelId, date, req.user);
    res.json({ success: true, summary: data });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * GET /api/attendance/range?hostel_id=X&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 */
async function getAttendanceRange(req, res) {
  try {
    const hostelId = Number(req.query.hostel_id);
    const dateFrom = req.query.date_from || new Date().toISOString().split('T')[0];
    const dateTo = req.query.date_to || new Date().toISOString().split('T')[0];
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'hostel_id parameter is required' });
    }
    const data = await attendanceService.getAttendanceRange(hostelId, dateFrom, dateTo, req.user);
    res.json({ success: true, records: data });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
}

module.exports = {
  getHostelAttendance,
  getMyAttendance,
  getStudentAttendance,
  bulkMark,
  updateAttendance,
  getHostelSummary,
  getAttendanceRange
};
