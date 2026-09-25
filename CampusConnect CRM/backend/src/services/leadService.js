const db = require('../config/db');
const automationService = require('./automationService');

const getAllLeads = async (user) => {

  let query = 'SELECT * FROM leads';
  let params = [];

  // If user is a COUNSELOR, only show assigned leads
  if (user.role === 'COUNSELOR') {
    query += ' WHERE counselor_id = $1';
    params.push(user.id);
  }

  query += ' ORDER BY created_at DESC';
  
  const result = await db.query(query, params);
  return result.rows;
};

const getLeadById = async (id, user) => {
  const result = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
  const lead = result.rows[0];

  if (!lead) return null;

  // Security: Counselors can only view their assigned leads
  if (user.role === 'COUNSELOR' && lead.counselor_id !== user.id) {
    throw new Error('Access denied: You can only view your assigned leads');
  }

  return lead;
};

const createLead = async (leadData, user) => {
  const {
    fullName, phone, email, parentPhone, courseInterested,
    city, state, source, notes, status, assignedCounselor, counselorId
  } = leadData;

  // Auto-assign to current user if they are a COUNSELOR
  const finalCounselorId = user.role === 'COUNSELOR' ? user.id : counselorId;

  const query = `
    INSERT INTO leads (
      full_name, phone, email, parent_phone, course_interested,
      city, state, source, notes, status, assigned_counselor, counselor_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const values = [
    fullName, phone, email, parentPhone, courseInterested,
    city, state, source, notes, status || 'NEW', assignedCounselor, finalCounselorId
  ];

  const result = await db.query(query, values);
  const newLead = result.rows[0];
  
  // Log activity
  await db.query(
    'INSERT INTO activities (lead_id, activity_type, description) VALUES ($1, $2, $3)',
    [newLead.id, 'LEAD_CREATED', `Lead created by ${user.fullName} (${user.role})`]
  );

  // Trigger Automation
  await automationService.trigger('LEAD_CREATED', newLead);

  return newLead;
};

const updateLead = async (id, leadData, user) => {
  const currentLead = await getLeadById(id, user); // Check permission
  if (!currentLead) throw new Error('Lead not found');

  const {
    fullName, phone, email, parentPhone, courseInterested,
    city, state, source, notes, status, assignedCounselor, counselorId
  } = leadData;

  const query = `
    UPDATE leads SET
      full_name = $1, phone = $2, email = $3, parent_phone = $4,
      course_interested = $5, city = $6, state = $7, source = $8,
      notes = $9, status = $10, assigned_counselor = $11, counselor_id = $12
    WHERE id = $13
    RETURNING *
  `;

  const values = [
    fullName, phone, email, parentPhone, courseInterested,
    city, state, source, notes, status, assignedCounselor, counselorId || currentLead.counselor_id, id
  ];

  const result = await db.query(query, values);
  const updatedLead = result.rows[0];

  // Log activity
  await db.query(
    'INSERT INTO activities (lead_id, activity_type, description) VALUES ($1, $2, $3)',
    [id, 'LEAD_UPDATED', `Lead updated by ${user.fullName}`]
  );

  // Trigger Automation (e.g. for status changes)
  if (currentLead.status !== status) {
    await automationService.trigger('LEAD_STATUS_CHANGED', updatedLead);
  }

  return updatedLead;
};

const deleteLead = async (id, user) => {
  // Only ADMIN/MANAGER can delete (already handled by roleMiddleware, but good to have here)
  await db.query('DELETE FROM leads WHERE id = $1', [id]);
  return { message: 'Lead deleted successfully' };
};

const getFollowupsByLeadId = async (leadId) => {
  const result = await db.query('SELECT * FROM followups WHERE lead_id = $1 ORDER BY followup_date ASC', [leadId]);
  return result.rows;
};

const createFollowup = async (followupData, user) => {
  const { leadId, followupDate, remarks, status } = followupData;
  
  // Verify permission
  await getLeadById(leadId, user);

  const result = await db.query(
    'INSERT INTO followups (lead_id, followup_date, remarks, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [leadId, followupDate, remarks, status || 'PENDING']
  );

  await db.query(
    'INSERT INTO activities (lead_id, activity_type, description) VALUES ($1, $2, $3)',
    [leadId, 'FOLLOWUP_CREATED', `Followup scheduled by ${user.fullName}`]
  );

  // Trigger Automation
  await automationService.trigger('FOLLOWUP_CREATED', { leadId, followupDate });

  return result.rows[0];
};

const getActivitiesByLeadId = async (leadId) => {
  const result = await db.query('SELECT * FROM activities WHERE lead_id = $1 ORDER BY created_at DESC', [leadId]);
  return result.rows;
};

const getCallLogsByLeadId = async (leadId) => {
  const result = await db.query('SELECT * FROM call_logs WHERE lead_id = $1 ORDER BY created_at DESC', [leadId]);
  return result.rows;
};

const importLeads = async (leads, user) => {
  let importedCount = 0;
  let skippedCount = 0;

  for (const lead of leads) {
    // Basic deduplication
    const dup = await db.query('SELECT id FROM leads WHERE phone = $1 OR email = $2', [lead.phone, lead.email]);
    
    if (dup.rows.length === 0) {
      const result = await db.query(
        'INSERT INTO leads (full_name, phone, email, course_interested, city, state, source, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [lead.full_name, lead.phone, lead.email, lead.course_interested, lead.city, lead.state, lead.source || 'CSV_IMPORT', 'NEW']
      );
      
      const leadId = result.rows[0].id;
      
      // Log activity
      await db.query(
        'INSERT INTO activities (lead_id, activity_type, description) VALUES ($1, $2, $3)',
        [leadId, 'LEAD_CAPTURED', `Lead imported via CSV by ${user.fullName}`]
      );

      importedCount++;
    } else {
      skippedCount++;
    }
  }

  return { imported: importedCount, skipped: skippedCount };
};

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getFollowupsByLeadId,
  createFollowup,
  getActivitiesByLeadId,
  getCallLogsByLeadId,
  importLeads
};

