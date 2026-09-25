const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { requireAuth } = require('../middleware/authMiddleware');

// All attendance routes require authentication
router.use(requireAuth);

// GET student self attendance history
router.get('/me', attendanceController.getMyAttendance);

// GET multi-day attendance range
router.get('/range', attendanceController.getAttendanceRange);

// GET hostel attendance (list for a date)
router.get('/hostel/:hostelId', attendanceController.getHostelAttendance);

// GET hostel summary
router.get('/hostel/:hostelId/summary', attendanceController.getHostelSummary);

// GET student attendance history by ID
router.get('/student/:studentId', attendanceController.getStudentAttendance);

// POST bulk attendance
router.post('/bulk', attendanceController.bulkMark);

// PUT single attendance record (edit)
router.put('/:id', attendanceController.updateAttendance);

module.exports = router;
