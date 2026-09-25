const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/chat', aiController.handleChat);
router.get('/conversations/:leadId', aiController.getConversations);
router.get('/messages/:conversationId', aiController.getMessages);

module.exports = router;
