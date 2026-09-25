const db = require('../config/db');
const emailService = require('./emailService');
const vapiService = require('./vapiService');

/**
 * Automation Service

 * Triggers: LEAD_CREATED, LEAD_STATUS_CHANGED, FOLLOWUP_CREATED, FOLLOWUP_MISSED, LEAD_UNRESPONSIVE
 */
const trigger = async (event, payload) => {
  console.log(`[Automation] Triggering event: ${event}`);
  
  try {
    // 1. Fetch active rules for this event
    const rules = await db.query(
      'SELECT * FROM automation_rules WHERE trigger_event = $1 AND is_active = true',
      [event]
    );

    for (const rule of rules.rows) {
      await executeRule(rule, payload);
    }
  } catch (error) {
    console.error(`[Automation] Error triggering rules for ${event}:`, error.message);
  }
};

const executeRule = async (rule, payload) => {
  const { id: ruleId, action_type, action_config } = rule;
  const leadId = payload.leadId || payload.id || payload.lead_id;

  if (!leadId) {
    console.error(`[Automation] Missing leadId in payload for rule ${ruleId}`);
    return;
  }

  console.log(`[Automation] Executing rule ${ruleId} (${action_type}) for lead ${leadId}`);

  try {
    let result = '';
    
    switch (action_type) {
      case 'CREATE_ACTIVITY':
        const description = action_config.template || `Automation triggered: ${rule.name}`;
        await db.query(
          'INSERT INTO activities (lead_id, activity_type, description) VALUES ($1, $2, $3)',
          [leadId, 'AUTOMATION', description]
        );
        result = 'Activity created';
        break;

      case 'AUTO_ASSIGN':
        if (!action_config.status || payload.status === action_config.status) {
          const admins = await db.query("SELECT id FROM users WHERE role IN ('ADMIN', 'MANAGER') LIMIT 1");
          if (admins.rows.length > 0) {
            await db.query('UPDATE leads SET counselor_id = $1 WHERE id = $2', [admins.rows[0].id, leadId]);
            result = `Auto-assigned to Manager (ID: ${admins.rows[0].id})`;
          } else {
            result = 'No admin/manager available for auto-assignment';
          }
        } else {
          result = 'Skipped: status mismatch';
        }
        break;

      case 'CHANGE_STATUS':
        if (!action_config.new_status) {
          result = 'No new status defined in config';
          break;
        }
        await db.query('UPDATE leads SET status = $1 WHERE id = $2', [action_config.new_status, leadId]);
        result = `Status changed to ${action_config.new_status}`;
        break;

      case 'SEND_EMAIL':
        if (!action_config.template) {
          result = 'No email template defined in config';
          break;
        }
        const toEmail = action_config.to_admin ? process.env.GMAIL_USER : null;
        try {
          const emailResult = await emailService.sendEmail(leadId, action_config.template, toEmail);
          result = emailResult.success ? `Email sent (${action_config.template})` : `Email failed: ${emailResult.error}`;
        } catch (emailErr) {
          result = `Email execution error: ${emailErr.message}`;
        }
        break;

      case 'ENQUEUE_CALL':
        if (action_config.status && payload.status !== action_config.status) {
          result = 'Skipped: status mismatch';
          break;
        }
        const priority = action_config.priority || 1;
        
        // Prevent duplicate queueing
        const existingQueue = await db.query('SELECT id FROM call_queue WHERE lead_id = $1 AND call_status IN ($2, $3)', [leadId, 'PENDING', 'IN_PROGRESS']);
        if (existingQueue.rows.length > 0) {
          result = 'Skipped: already in call queue';
          break;
        }

        // Fetch lead details for Vapi
        const leadRes = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);
        const leadDetails = leadRes.rows[0];

        if (!leadDetails || !leadDetails.phone) {
          result = 'Failed: Lead has no phone number';
          break;
        }

        // Add to Queue in DB
        await db.query(
          'INSERT INTO call_queue (lead_id, priority, call_status) VALUES ($1, $2, $3)',
          [leadId, priority, 'IN_PROGRESS'] // Set to IN_PROGRESS since Vapi handles it immediately
        );

        // Trigger Vapi Call
        try {
          await vapiService.makeOutboundCall(leadDetails);
          result = `Lead enqueued & AI Call initiated (Priority: ${priority})`;
        } catch (vapiErr) {
          console.error('[Automation] Vapi call failed:', vapiErr.message);
          await db.query('UPDATE call_queue SET call_status = $1 WHERE lead_id = $2', ['FAILED', leadId]);
          result = `AI Call failed to initiate: ${vapiErr.message}`;
        }
        break;

      default:
        result = `Action type '${action_type}' not supported`;
    }

    // Log execution
    await db.query(
      'INSERT INTO automation_logs (lead_id, trigger_event, action_type, execution_status, execution_result) VALUES ($1, $2, $3, $4, $5)',
      [leadId, rule.trigger_event, action_type, 'SUCCESS', result]
    );

  } catch (error) {
    console.error(`[Automation] Rule ${ruleId} failed:`, error.message);
    await db.query(
      'INSERT INTO automation_logs (lead_id, trigger_event, action_type, execution_status, execution_result) VALUES ($1, $2, $3, $4, $5)',
      [leadId, rule.trigger_event, action_type, 'FAILED', error.message]
    );
  }
};

const getAllRules = async () => {
  const result = await db.query('SELECT * FROM automation_rules ORDER BY created_at DESC');
  return result.rows;
};

const toggleRule = async (id, isActive) => {
  const result = await db.query(
    'UPDATE automation_rules SET is_active = $1 WHERE id = $2 RETURNING *',
    [isActive, id]
  );
  return result.rows[0];
};

const getLogs = async (limit = 50) => {
  const result = await db.query(
    'SELECT al.*, l.full_name as lead_name FROM automation_logs al LEFT JOIN leads l ON al.lead_id = l.id ORDER BY al.created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
};

const createRule = async (ruleData) => {
  const { name, trigger_event, condition_json, action_type, action_config, is_active } = ruleData;
  const result = await db.query(
    'INSERT INTO automation_rules (name, trigger_event, condition_json, action_type, action_config, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [name, trigger_event, condition_json || {}, action_type, action_config || {}, is_active !== false]
  );
  return result.rows[0];
};

module.exports = {
  trigger,
  getAllRules,
  toggleRule,
  getLogs,
  createRule
};
