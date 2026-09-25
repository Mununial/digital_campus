const db = require('../config/db');

const handleWebhook = async (req, res) => {
  try {
    const payload = req.body;
    console.log('[VAPI WEBHOOK] Received event:', payload.message?.type);

    if (payload.message?.type === 'end-of-call-report') {
      const callData = payload.message.call;
      const transcript = payload.message.transcript;
      const summary = payload.message.summary;
      const callId = callData.id;

      console.log(`[VAPI WEBHOOK] Call ${callId} ended. Updating logs...`);

      // Find the existing log entry for this call ID
      const existingLog = await db.query('SELECT * FROM call_logs WHERE provider_call_id = $1', [callId]);
      
      if (existingLog.rows.length > 0) {
        // Update the log with transcript and summary
        await db.query(
          `UPDATE call_logs 
           SET call_status = $1, transcript = $2, ai_summary = $3, end_time = NOW()
           WHERE provider_call_id = $4`,
          ['COMPLETED', transcript, summary, callId]
        );

        // Update the queue status if it exists
        await db.query(
          `UPDATE call_queue SET call_status = 'COMPLETED' WHERE lead_id = $1`,
          [existingLog.rows[0].lead_id]
        );

        console.log(`[VAPI WEBHOOK] Call log updated successfully for lead ${existingLog.rows[0].lead_id}`);
      } else {
        console.warn(`[VAPI WEBHOOK] No existing log found for call ID ${callId}`);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[VAPI WEBHOOK] Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  handleWebhook
};
