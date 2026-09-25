const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Notice Listing & Unread Count (All authenticated users - scoped inside service)
router.get('/', noticeController.getNotices);
router.get('/unread-count', noticeController.getUnreadCount);

// Single Notice Detail
router.get('/:id', noticeController.getNoticeById);

// Mark notice as read
router.post('/:id/read', noticeController.markNoticeRead);

// Create Notice (Super Admin or Superintendent)
router.post('/', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), noticeController.createNotice);

// Update Notice (Super Admin or Superintendent)
router.put('/:id', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), noticeController.updateNotice);

// Patch Notice Status (Super Admin or Superintendent)
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), noticeController.updateNoticeStatus);

// Delete Notice (Super Admin only)
router.delete('/:id', requireRole('SUPER_ADMIN'), noticeController.deleteNotice);

module.exports = router;
