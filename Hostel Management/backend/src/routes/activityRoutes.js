const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'SUPERINTENDENT'));

router.get('/', activityController.getActivities);
router.get('/stats', activityController.getActivityStats);
router.get('/:id', activityController.getActivityById);

module.exports = router;
