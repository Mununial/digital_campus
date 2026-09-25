const express = require('express');
const router = express.Router();
const vapiController = require('../controllers/vapiController');

// Webhook for Vapi (Must not require authentication)
router.post('/webhook', vapiController.handleWebhook);

module.exports = router;
