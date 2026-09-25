const express = require('express');
const router = express.Router();
const MessController = require('../controllers/messController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Menu endpoints
router.get('/menu', MessController.getMenus);
router.get('/menu/today', MessController.getTodayMenu);
router.get('/menu/weekly', MessController.getWeeklyMenu);

router.post('/menu', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), MessController.createMenuItem);
router.post('/menu/copy', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), MessController.copyDayMenu);
router.put('/menu/:id', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), MessController.updateMenuItem);
router.delete('/menu/:id', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), MessController.deleteMenuItem);

// Meal participation endpoints
router.post('/participation', MessController.setMealParticipation);
router.get('/participation/me', requireRole(['STUDENT']), MessController.getMyParticipation);
router.get('/participation', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), MessController.getParticipation);

// Summary & Analytics
router.get('/summary', MessController.getMessSummary);
router.get('/analytics', requireRole(['SUPER_ADMIN', 'SUPERINTENDENT']), MessController.getMessAnalytics);

module.exports = router;
