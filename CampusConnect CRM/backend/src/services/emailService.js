const nodemailer = require('nodemailer');
const db = require('../config/db');
require('dotenv').config();

// Create Transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

const templates = {
  WELCOME_INQUIRY: (data) => ({
    subject: `Thank you for your inquiry, ${data.full_name}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
        <h2 style="color: #2563eb;">Welcome to CampusConnect CRM</h2>
        <p>Dear ${data.full_name},</p>
        <p>Thank you for inquiring about our courses. Our admission team has received your request and will contact you shortly.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">Inquiry Details:</p>
          <p style="margin: 5px 0;">Course: ${data.course_interested || 'Not specified'}</p>
          <p style="margin: 5px 0;">Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <p>If you have any urgent questions, feel free to reply to this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Admission Team | CampusConnect CRM</p>
      </div>
    `
  }),
  BROCHURE_DETAILS: (data) => ({
    subject: `Course Brochure & Fee Structure - CampusConnect`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Admission Brochure</h2>
        <p>Hi ${data.full_name},</p>
        <p>As requested, here are the details for the <strong>${data.course_interested}</strong> course.</p>
        <p>Our program offers world-class curriculum, industry partnerships, and 100% placement support.</p>
        <a href="#" style="display: inline-block; padding: 12px 25px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Download Full Brochure</a>
        <p style="margin-top: 20px;">We'd love to have you on campus for a tour!</p>
        <p>Best regards,<br>Counseling Head</p>
      </div>
    `
  }),
  FOLLOWUP_REMINDER: (data) => ({
    subject: `Friendly Follow-up: Admission Inquiry`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p>Hi ${data.full_name},</p>
        <p>We noticed that we haven't heard back from you regarding your admission inquiry.</p>
        <p>Our upcoming batch is filling up fast! If you're still interested, please let us know so we can reserve a seat for you.</p>
        <p>Call us at: +91 9876543210</p>
      </div>
    `
  }),
  ADMIN_NEW_LEAD: (data) => ({
    subject: `🚨 New Lead Alert: ${data.full_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff1f2; border: 2px solid #be123c; border-radius: 10px; padding: 20px;">
        <h2 style="color: #be123c;">New Admission Inquiry Received!</h2>
        <p>A new student has just inquired via the CRM.</p>
        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #fda4af;">
          <p><strong>Name:</strong> ${data.full_name}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Course:</strong> ${data.course_interested}</p>
          <p><strong>Source:</strong> ${data.source}</p>
        </div>
        <p style="margin-top: 20px;">Please contact the student as soon as possible.</p>
        <a href="http://localhost:5173/leads" style="display: inline-block; padding: 10px 20px; background: #be123c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">View in CRM</a>
      </div>
    `
  })
};


const sendEmail = async (leadId, templateName, toEmail = null) => {
  try {
    // 1. Fetch Lead Details
    const leadResult = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    const lead = leadResult.rows[0];

    if (!lead) {
      console.log(`[Email] Skipping: Lead ${leadId} not found.`);
      return { success: false, error: 'Lead not found' };
    }

    const recipient = toEmail || lead.email;

    if (!recipient) {
      console.log(`[Email] Skipping: No recipient email address.`);
      return { success: false, error: 'No email address' };
    }

    // 2. Generate Template
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const { subject, html } = template(lead);

    // 3. Send via Nodemailer
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: recipient,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);

    // 4. Log to DB
    await db.query(
      'INSERT INTO email_logs (lead_id, recipient_email, template_name, subject, send_status, provider_response) VALUES ($1, $2, $3, $4, $5, $6)',
      [leadId, recipient, templateName, subject, 'SENT', JSON.stringify(info)]
    );

    console.log(`[Email] Successfully sent ${templateName} to ${recipient}`);
    return { success: true, data: info };


  } catch (error) {
    console.error(`[Email Service Error]`, error.message);
    
    // Log failure to DB
    try {
      await db.query(
        'INSERT INTO email_logs (lead_id, recipient_email, template_name, subject, send_status, provider_response) VALUES ($1, $2, $3, $4, $5, $6)',
        [leadId, 'unknown', templateName, 'Error', 'FAILED', error.message]
      );
    } catch (dbErr) {
      console.error('Failed to log email error to DB:', dbErr.message);
    }

    return { success: false, error: error.message };
  }
};

const getEmailLogs = async (limit = 50) => {
  const result = await db.query(
    'SELECT el.*, l.full_name as lead_name FROM email_logs el LEFT JOIN leads l ON el.lead_id = l.id ORDER BY el.created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
};

module.exports = {
  sendEmail,
  getEmailLogs
};
