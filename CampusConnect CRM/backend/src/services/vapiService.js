const axios = require('axios');
const db = require('../config/db');

const makeOutboundCall = async (lead) => {
  try {
    console.log(`[VAPI] Initiating outbound call to ${lead.full_name} (${lead.phone})`);
    
    // Convert to E.164 format if not already (basic check)
    let phoneNumber = lead.phone;
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+91' + phoneNumber; // Assuming India default if no plus
    }

    const payload = {
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      assistantId: process.env.VAPI_ASSISTANT_ID,
      customer: {
        number: phoneNumber,
        name: lead.full_name
      },
      assistantOverrides: {
        variableValues: {
          name: lead.full_name,
          course: lead.course_interested || "the course you inquired about"
        }
      }
    };

    const response = await axios.post('https://api.vapi.ai/call/phone', payload, {
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[VAPI] Call queued successfully. Vapi Call ID: ${response.data.id}`);
    
    // Log the initial attempt in the database
    const logQuery = `
      INSERT INTO call_logs (lead_id, provider_name, provider_call_id, call_status)
      VALUES ($1, 'VAPI', $2, 'INITIATED')
      RETURNING *
    `;
    await db.query(logQuery, [lead.id, response.data.id]);

    return response.data;
  } catch (error) {
    console.error('[VAPI] Error making outbound call:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  makeOutboundCall
};
