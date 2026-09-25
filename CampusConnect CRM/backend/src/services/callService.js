const db = require('../config/db');

const enqueueCall = async (leadId, priority = 1, scheduledAt = new Date()) => {
  const query = `
    INSERT INTO call_queue (lead_id, priority, scheduled_at, call_status)
    VALUES ($1, $2, $3, 'PENDING')
    RETURNING *
  `;
  const result = await db.query(query, [leadId, priority, scheduledAt]);
  return result.rows[0];
};

const getCallQueue = async () => {
  const query = `
    SELECT cq.*, l.full_name, l.phone, l.course_interested
    FROM call_queue cq
    JOIN leads l ON cq.lead_id = l.id
    WHERE cq.call_status IN ('PENDING', 'IN_PROGRESS')
    ORDER BY cq.priority DESC, cq.scheduled_at ASC
  `;
  const result = await db.query(query);
  return result.rows;
};

const updateCallStatus = async (queueId, status) => {
  const query = 'UPDATE call_queue SET call_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
  const result = await db.query(query, [status, queueId]);
  return result.rows[0];
};

const cancelCall = async (queueId) => {
  return updateCallStatus(queueId, 'CANCELLED');
};

const getCallLogs = async () => {
  const query = `
    SELECT cl.*, l.full_name, l.phone
    FROM call_logs cl
    LEFT JOIN leads l ON cl.lead_id = l.id
    ORDER BY cl.created_at DESC
  `;
  const result = await db.query(query);
  return result.rows;
};

const getCallLogById = async (id) => {
  const query = `
    SELECT cl.*, l.full_name, l.phone, l.email
    FROM call_logs cl
    LEFT JOIN leads l ON cl.lead_id = l.id
    WHERE cl.id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0];
};

const getVoiceSettings = async () => {
  const result = await db.query('SELECT * FROM voice_settings LIMIT 1');
  return result.rows[0];
};

const updateVoiceSettings = async (settings) => {
  const { providerName, voiceLanguage, retryEnabled, maxRetries, callTimeoutSeconds } = settings;
  const query = `
    UPDATE voice_settings SET
      provider_name = $1,
      voice_language = $2,
      retry_enabled = $3,
      max_retries = $4,
      call_timeout_seconds = $5
    WHERE id = (SELECT id FROM voice_settings LIMIT 1)
    RETURNING *
  `;
  const values = [providerName, voiceLanguage, retryEnabled, maxRetries, callTimeoutSeconds];
  const result = await db.query(query, values);
  return result.rows[0];
};

module.exports = {
  enqueueCall,
  getCallQueue,
  updateCallStatus,
  cancelCall,
  getCallLogs,
  getCallLogById,
  getVoiceSettings,
  updateVoiceSettings
};
