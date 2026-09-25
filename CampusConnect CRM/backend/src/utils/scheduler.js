const cron = require('node-cron');
const db = require('../config/db');
const automationService = require('../services/automationService');

/**
 * Scheduled Tasks
 * Runs every 15 minutes
 */
const init = () => {
  console.log('[Scheduler] Initializing automation jobs...');

  // 1. Check for missed followups (Every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Checking for missed followups...');
    try {
      const missed = await db.query(`
        SELECT id, lead_id FROM followups 
        WHERE followup_date < NOW() 
        AND status = 'PENDING'
      `);

      for (const followup of missed.rows) {
        // Trigger automation
        await automationService.trigger('FOLLOWUP_MISSED', { id: followup.lead_id, followupId: followup.id });
        
        // Update followup status so we don't trigger it again
        await db.query("UPDATE followups SET status = 'MISSED' WHERE id = $1", [followup.id]);
      }
    } catch (error) {
      console.error('[Scheduler] Error checking missed followups:', error.message);
    }
  });

  // 2. Detect Stale Leads (Every 1 hour)
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Checking for stale leads...');
    try {
      const staleLeads = await db.query(`
        SELECT id FROM leads 
        WHERE status = 'NEW' 
        AND updated_at < NOW() - INTERVAL '7 days'
      `);

      for (const lead of staleLeads.rows) {
        await automationService.trigger('LEAD_UNRESPONSIVE', { id: lead.id });
      }
    } catch (error) {
      console.error('[Scheduler] Error checking stale leads:', error.message);
    }
  });
};

module.exports = { init };
