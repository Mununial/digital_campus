const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'MANAGER']));

router.get('/rules', automationController.getRules);
router.post('/rules', automationController.createRule);
router.patch('/rules/:id/toggle', automationController.toggleRule);
router.get('/logs', automationController.getLogs);

module.exports = router;
