const reportService = require('../services/reportService');

/**
 * Helper to handle errors safely without exposing raw SQL stack traces.
 */
const handleReportError = (res, err, defaultMsg) => {
  console.error(`Report Controller Error: ${err.message}`, err);
  const status = err.status || 500;
  const message = (status < 500) ? err.message : defaultMsg;
  return res.status(status).json({
    success: false,
    message
  });
};

/**
 * GET /api/reports/overview
 */
exports.getOverviewReport = async (req, res) => {
  try {
    const data = await reportService.getOverviewReport(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleReportError(res, err, 'Unable to generate overview report.');
  }
};

/**
 * GET /api/reports/students
 */
exports.getStudentReport = async (req, res) => {
  try {
    const data = await reportService.getStudentReport(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleReportError(res, err, 'Unable to generate student report.');
  }
};

/**
 * GET /api/reports/attendance
 */
exports.getAttendanceReport = async (req, res) => {
  try {
    const data = await reportService.getAttendanceReport(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleReportError(res, err, 'Unable to generate attendance report.');
  }
};

/**
 * GET /api/reports/occupancy
 */
exports.getOccupancyReport = async (req, res) => {
  try {
    const data = await reportService.getOccupancyReport(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleReportError(res, err, 'Unable to generate occupancy report.');
  }
};

/**
 * GET /api/reports/complaints
 */
exports.getComplaintReport = async (req, res) => {
  try {
    const data = await reportService.getComplaintReport(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleReportError(res, err, 'Unable to generate complaint report.');
  }
};

/**
 * GET /api/reports/visitors
 */
exports.getVisitorReport = async (req, res) => {
  try {
    const data = await reportService.getVisitorReport(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleReportError(res, err, 'Unable to generate visitor report.');
  }
};

/**
 * GET /api/reports/mess
 */
exports.getMessReport = async (req, res) => {
  try {
    const data = await reportService.getMessReport(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleReportError(res, err, 'Unable to generate mess report.');
  }
};

/**
 * GET /api/reports/fees
 */
exports.getFeeReport = async (req, res) => {
  try {
    const data = await reportService.getFeeReport(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return handleReportError(res, err, 'Unable to generate fee report.');
  }
};
