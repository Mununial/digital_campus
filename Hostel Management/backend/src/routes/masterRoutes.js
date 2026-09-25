const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.get('/summary', requireAuth, masterController.getMasterSummary);
router.get('/data-integrity', requireAuth, requireRole('SUPER_ADMIN'), masterController.runIntegrityCheck);
router.get('/data-integrity/summary', requireAuth, requireRole('SUPER_ADMIN'), masterController.runIntegrityCheck);
router.get('/', requireAuth, requireRole('SUPER_ADMIN'), masterController.runIntegrityCheck);
router.post('/data-integrity/repair', requireAuth, requireRole('SUPER_ADMIN'), masterController.repairIntegrityIssue);
router.post('/repair', requireAuth, requireRole('SUPER_ADMIN'), masterController.repairIntegrityIssue);

module.exports = router;
