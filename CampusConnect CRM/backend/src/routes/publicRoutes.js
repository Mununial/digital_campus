const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const rateLimit = require('express-rate-limit');

// Rate limiting to prevent spam
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 inquiries per window
  message: { message: 'Too many inquiries from this IP, please try again later.' }
});

router.post('/inquiry', inquiryLimiter, publicController.handlePublicInquiry);
router.post('/webhooks/meta-leads', publicController.handleMetaWebhook);

module.exports = router;
