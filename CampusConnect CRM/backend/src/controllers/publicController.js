const db = require('../config/db');
const automationService = require('../services/automationService');

const handlePublicInquiry = async (req, res) => {
  try {
    const { 
      fullName, 
      phone, 
      email, 
      parentPhone, 
      courseInterested, 
      city, 
      state, 
      message 
    } = req.body;

    // 1. Basic Validation
    if (!fullName || !phone || !email) {
      return res.status(400).json({ message: 'Full Name, Phone and Email are required' });
    }

    // 2. Duplicate Check (by Phone or Email)
    const duplicateCheck = await db.query(
      'SELECT id FROM leads WHERE phone = $1 OR email = $2',
      [phone, email]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Inquiry already exists for this contact' });
    }

    // 3. Insert Lead
    const result = await db.query(
      'INSERT INTO leads (full_name, phone, email, parent_phone, course_interested, city, state, notes, source, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
      [fullName, phone, email, parentPhone, courseInterested, city, state, message, 'WEBSITE', 'NEW']
    );

    const leadId = result.rows[0].id;

    // 4. Log Activity
    await db.query(
      'INSERT INTO activities (lead_id, activity_type, description) VALUES ($1, $2, $3)',
      [leadId, 'LEAD_CAPTURED', `Lead captured via Website Inquiry Form`]
    );

    // 5. Trigger Automation
    await automationService.trigger('LEAD_CREATED', { id: leadId, ...req.body });

    res.status(201).json({ message: 'Inquiry submitted successfully', leadId });

  } catch (error) {
    console.error('Public Inquiry Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const handleMetaWebhook = async (req, res) => {
  // Placeholder for Meta Webhook logic
  console.log('Meta Webhook received:', req.body);
  res.status(200).send('EVENT_RECEIVED');
};

module.exports = {
  handlePublicInquiry,
  handleMetaWebhook
};
