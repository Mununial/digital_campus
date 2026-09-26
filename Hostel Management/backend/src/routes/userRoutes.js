const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Profile endpoint for authenticated user
router.patch('/profile', requireAuth, userController.updateSelfProfile);

// Audit logs endpoint (SUPER_ADMIN only)
router.get('/security/audit', requireAuth, requireRole('SUPER_ADMIN'), userController.getAuditLogs);

// User Management Endpoints (SUPER_ADMIN only except get single user)
router.get('/', requireAuth, userController.getUsers);
router.post('/', requireAuth, requireRole('SUPER_ADMIN'), userController.createUser);
router.get('/:id', requireAuth, userController.getUserById);
router.patch('/:id/status', requireAuth, requireRole('SUPER_ADMIN'), userController.updateUserStatus);
router.patch('/:id/role', requireAuth, requireRole('SUPER_ADMIN'), userController.updateUserRole);
router.post('/:id/reset-password', requireAuth, requireRole('SUPER_ADMIN'), userController.adminResetPassword);
router.put('/:id/hostels', requireAuth, requireRole('SUPER_ADMIN'), userController.updateSuperintendentHostels);

module.exports = router;
