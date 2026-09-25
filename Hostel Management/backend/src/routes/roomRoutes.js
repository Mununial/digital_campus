const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, roomController.getAllRooms);
router.get('/:id', requireAuth, roomController.getRoomById);
router.post('/', requireAuth, roomController.createRoom);
router.put('/:id', requireAuth, roomController.updateRoom);
router.delete('/:id', requireAuth, roomController.deleteRoom);

module.exports = router;
