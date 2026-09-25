const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'SUPERINTENDENT'));

router.get('/summary', operationsController.getSummary);

module.exports = router;
