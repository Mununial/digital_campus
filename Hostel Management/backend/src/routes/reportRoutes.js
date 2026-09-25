const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All report routes require authentication and SUPER_ADMIN or SUPERINTENDENT role
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']));

router.get('/overview', reportController.getOverviewReport);
router.get('/students', reportController.getStudentReport);
router.get('/attendance', reportController.getAttendanceReport);
router.get('/occupancy', reportController.getOccupancyReport);
router.get('/complaints', reportController.getComplaintReport);
router.get('/visitors', reportController.getVisitorReport);
router.get('/mess', reportController.getMessReport);
router.get('/fees', reportController.getFeeReport);

module.exports = router;
