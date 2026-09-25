const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspectionController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'SUPERINTENDENT'));

router.post('/', inspectionController.createInspection);
router.get('/', inspectionController.getInspections);
router.get('/:id', inspectionController.getInspectionById);
router.get('/room/:roomId/history', inspectionController.getRoomHistory);

module.exports = router;
