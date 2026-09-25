const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All fee endpoints require authentication
router.use(requireAuth);

// Summary & Aggregates
router.get('/summary', feeController.getFeeSummary);

// Student Self-Service (IDOR-safe)
router.get('/me', feeController.getMyFees);

// Fee Structures Management
router.get('/structures', feeController.getFeeStructures);
router.post('/structures', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), feeController.createFeeStructure);
router.put('/structures/:id', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), feeController.updateFeeStructure);
router.patch('/structures/:id/status', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), feeController.toggleStructureStatus);

// Payment Records & Receipts (MUST be declared before /:id parameter route)
router.get('/payments', feeController.getPayments);
router.post('/payments', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), feeController.recordPayment);
router.get('/payments/:paymentId', feeController.getPaymentReceipt);
router.get('/receipts/:paymentId', feeController.getPaymentReceipt);

// Student Fee Assignments & List
router.get('/', feeController.getStudentFees);
router.post('/assign', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), feeController.assignStudentFee);
router.patch('/:id/waive', requireRole('SUPER_ADMIN'), feeController.waiveStudentFee);
router.get('/:id', feeController.getStudentFeeById);

module.exports = router;
