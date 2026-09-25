const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All visitor endpoints require authentication
router.use(requireAuth);

// Summary & Aggregates
router.get('/summary', visitorController.getVisitorSummary);
router.get('/current', visitorController.getCurrentVisitors);

// List & Retrieve Visits
router.get('/', visitorController.getVisits);
router.get('/:id', visitorController.getVisitById);

// Create Visit Registration / Request
router.post('/', visitorController.createVisit);

// Actions & Workflow Transitions
router.post('/:id/approve', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), visitorController.approveVisit);
router.post('/:id/reject', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), visitorController.rejectVisit);
router.post('/:id/cancel', visitorController.cancelVisit);
router.post('/:id/check-in', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), visitorController.checkInVisit);
router.post('/:id/check-out', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), visitorController.checkOutVisit);

module.exports = router;
