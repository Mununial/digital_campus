const express = require('express');
const router = express.Router();
const floorController = require('../controllers/floorController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, floorController.getAllFloors);
router.get('/:id', requireAuth, floorController.getFloorById);
router.post('/', requireAuth, floorController.createFloor);
router.put('/:id', requireAuth, floorController.updateFloor);
router.delete('/:id', requireAuth, floorController.deleteFloor);

module.exports = router;
