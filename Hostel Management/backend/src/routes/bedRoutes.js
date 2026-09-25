const express = require('express');
const router = express.Router();
const bedController = require('../controllers/bedController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, bedController.getAllBeds);
router.get('/:id', requireAuth, bedController.getBedById);
router.post('/', requireAuth, bedController.createBed);
router.put('/:id', requireAuth, bedController.updateBed);
router.delete('/:id', requireAuth, bedController.deleteBed);

module.exports = router;
