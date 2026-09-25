const express = require('express');
const router = express.Router();
const gatePassController = require('../controllers/gatePassController');
const { requireAuth } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Pass statistics
router.get('/stats', gatePassController.getGatePassStats);

// Submit new gate pass request (Student)
router.post('/', gatePassController.requestGatePass);

// Get list of gate passes (Filterable, Role Scoped)
router.get('/', gatePassController.getGatePasses);

// Get single gate pass details
router.get('/:id', gatePassController.getGatePassById);

// Approve or Reject gate pass (Staff)
router.put('/:id/approve', gatePassController.approveRejectGatePass);

// Cancel gate pass request (Student)
router.put('/:id/cancel', gatePassController.cancelGatePass);

// Security action: Check-out / Check-in
router.post('/security-action', gatePassController.securityGateAction);

module.exports = router;
