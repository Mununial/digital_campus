const groqService = require('../services/groqService');
const db = require('../config/db');

const handleChat = async (req, res) => {
  try {
    const { leadId, message, conversationId } = req.body;
    
    // 1. Get or Create Conversation
    let convId = conversationId;
    if (!convId) {
      const convResult = await db.query(
        'INSERT INTO conversations (lead_id) VALUES ($1) RETURNING id',
        [leadId]
      );
      convId = convResult.rows[0].id;
    }

    // 2. Save User Message
    await db.query(
      'INSERT INTO messages (conversation_id, sender_type, message_content) VALUES ($1, $2, $3)',
      [convId, 'STUDENT', message]
    );

    // 3. Get History for Context
    const historyResult = await db.query(
      'SELECT sender_type, message_content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 10',
      [convId]
    );
    const history = historyResult.rows.map(m => ({
      role: m.sender_type === 'STUDENT' ? 'user' : 'assistant',
      content: m.message_content
    }));

    // 4. Get AI Response
    const aiResponse = await groqService.chatCompletion(leadId, message, history);

    // 5. Save AI Message
    await db.query(
      'INSERT INTO messages (conversation_id, sender_type, message_content) VALUES ($1, $2, $3)',
      [convId, 'AI', aiResponse.content]
    );

    // 6. Update Summary & Intent
    await db.query(
      'INSERT INTO conversation_summaries (conversation_id, detected_intent, summary) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [convId, aiResponse.intent, 'Ongoing conversation...']
    );

    // 7. CRM Integration (Auto-update Lead)
    if (aiResponse.intent === 'INTERESTED') {
      await db.query("UPDATE leads SET status = 'INTERESTED' WHERE id = $1", [leadId]);
    } else if (aiResponse.intent === 'CALLBACK_REQUEST') {
      await db.query("UPDATE leads SET status = 'HOT' WHERE id = $1", [leadId]);
      // Create automatic followup
      await db.query(
        "INSERT INTO followups (lead_id, followup_date, remarks) VALUES ($1, NOW() + INTERVAL '1 day', 'AI Detected Callback Request')",
        [leadId]
      );
    } else if (aiResponse.intent === 'NOT_INTERESTED') {
      await db.query("UPDATE leads SET status = 'LOST' WHERE id = $1", [leadId]);
    }

    res.status(200).json({
      conversationId: convId,
      reply: aiResponse.content,
      intent: aiResponse.intent
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await db.query(
      'SELECT c.*, s.detected_intent, s.summary FROM conversations c LEFT JOIN conversation_summaries s ON c.id = s.conversation_id WHERE c.lead_id = $1 ORDER BY c.created_at DESC',
      [leadId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const result = await db.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  handleChat,
  getConversations,
  getMessages
};
