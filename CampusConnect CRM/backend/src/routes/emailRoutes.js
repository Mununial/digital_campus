const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.use(authMiddleware);

// Anyone logged in can send a manual email (for their leads)
router.post('/send', emailController.sendManualEmail);

// Only ADMIN and MANAGER can see full email logs
router.get('/logs', roleMiddleware(['ADMIN', 'MANAGER']), emailController.getLogs);

module.exports = router;
