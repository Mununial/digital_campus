const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Student personal route
router.get('/me', allocationController.getMyAllocation);

// Staff routes
router.get('/available-beds', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), allocationController.getAvailableBeds);
router.get('/consistency', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), allocationController.getConsistencyReport);
router.get('/', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), allocationController.getAllocations);

// General history & single view (access-checked inside service)
router.get('/student/:studentId/history', allocationController.getStudentAllocationHistory);
router.get('/:id', allocationController.getAllocationById);

// Staff mutation routes (allocate, transfer, checkout)
router.post('/', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), allocationController.allocateStudent);
router.post('/:id/transfer', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), allocationController.transferStudent);
router.post('/:id/checkout', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), allocationController.checkoutStudent);

module.exports = router;
