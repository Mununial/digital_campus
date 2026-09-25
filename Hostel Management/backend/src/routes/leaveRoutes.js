const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { requireAuth } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Leave statistics
router.get('/stats', leaveController.getLeaveStats);

// Submit new leave application (Student)
router.post('/', leaveController.applyForLeave);

// Get list of leave applications (Filterable, Role Scoped)
router.get('/', leaveController.getLeaveApplications);

// Get single leave application details
router.get('/:id', leaveController.getLeaveApplicationById);

// Approve or Reject leave application (Staff)
router.put('/:id/approve', leaveController.approveRejectLeave);

// Cancel leave application (Student)
router.put('/:id/cancel', leaveController.cancelLeaveApplication);

module.exports = router;
