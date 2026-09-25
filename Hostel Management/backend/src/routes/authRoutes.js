const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginRateLimiter, authController.login);
router.post('/logout', authController.logout);

router.get('/me', requireAuth, authController.getMe);
router.post('/change-password', requireAuth, authController.changePassword);

// 1-Click Student Impersonation (Super Admin & Superintendent)
router.post('/impersonate-student/:studentId', requireAuth, authController.impersonateStudent);
router.post('/exit-impersonation', requireAuth, authController.exitImpersonation);

module.exports = router;
