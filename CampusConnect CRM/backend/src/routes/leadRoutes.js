const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// All lead routes require authentication
router.use(authMiddleware);

router.get('/', leadController.getAllLeads);
router.get('/:id', leadController.getLeadDetails);

// Only ADMIN and MANAGER can create/update/delete leads globally
router.post('/', roleMiddleware(['ADMIN', 'MANAGER', 'COUNSELOR']), leadController.createLead);
router.put('/:id', roleMiddleware(['ADMIN', 'MANAGER', 'COUNSELOR']), leadController.updateLead);
router.delete('/:id', roleMiddleware(['ADMIN', 'MANAGER']), leadController.deleteLead);

router.post('/:id/followups', roleMiddleware(['ADMIN', 'MANAGER', 'COUNSELOR']), leadController.createFollowup);
router.post('/import', roleMiddleware(['ADMIN', 'MANAGER']), leadController.importLeads);

module.exports = router;

