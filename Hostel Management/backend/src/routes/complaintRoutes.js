const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { requireAuth } = require('../middleware/authMiddleware');

// Protect all routes with authentication
router.use(requireAuth);

router.get('/', complaintController.getComplaints);
router.get('/summary', complaintController.getComplaintSummary);
router.get('/:id', complaintController.getComplaintById);
router.post('/', complaintController.createComplaint);
router.patch('/:id/status', complaintController.updateComplaintStatus);
router.delete('/:id', complaintController.deleteComplaint);
router.post('/:id/assign', complaintController.assignComplaint);
router.post('/:id/comments', complaintController.addComment);

module.exports = router;
