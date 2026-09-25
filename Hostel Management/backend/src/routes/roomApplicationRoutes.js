const express = require('express');
const router = express.Router();
const roomApplicationController = require('../controllers/roomApplicationController');
const { requireAuth } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Room application summary statistics
router.get('/stats', roomApplicationController.getRoomApplicationStats);

// Submit new room application (Student)
router.post('/', roomApplicationController.applyForRoom);

// Get list of room applications (Filterable, Role Scoped)
router.get('/', roomApplicationController.getRoomApplications);

// Get single room application details
router.get('/:id', roomApplicationController.getRoomApplicationById);

// Approve & Allocate bed for room application (Staff)
router.put('/:id/allocate', roomApplicationController.approveAndAllocateRoom);

// Reject room application (Staff)
router.put('/:id/reject', roomApplicationController.rejectRoomApplication);

// Cancel room application (Student)
router.put('/:id/cancel', roomApplicationController.cancelRoomApplication);

module.exports = router;
