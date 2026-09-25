const express = require('express');
const router = express.Router();
const hostelController = require('../controllers/hostelController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, hostelController.getAllHostels);
router.get('/:id', requireAuth, hostelController.getHostelById);
router.post('/', requireAuth, hostelController.createHostel);
router.put('/:id', requireAuth, hostelController.updateHostel);
router.delete('/:id', requireAuth, hostelController.deleteHostel);
router.get('/:id/summary', requireAuth, hostelController.getHostelSummary);

module.exports = router;
