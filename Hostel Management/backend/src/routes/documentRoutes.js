const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { requireAuth } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Document statistics
router.get('/stats', documentController.getDocumentStats);

// Submit new document request (Student)
router.post('/', documentController.requestDocument);

// Get list of document requests (Filterable, Role Scoped)
router.get('/', documentController.getDocumentRequests);

// Get single document request details
router.get('/:id', documentController.getDocumentRequestById);

// Approve & Issue document / certificate (Staff)
router.put('/:id/issue', documentController.approveAndIssueDocument);

// Reject document request (Staff)
router.put('/:id/reject', documentController.rejectDocumentRequest);

// Cancel document request (Student)
router.put('/:id/cancel', documentController.cancelDocumentRequest);

module.exports = router;
