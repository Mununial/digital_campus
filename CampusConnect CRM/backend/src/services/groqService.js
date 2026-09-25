const Groq = require('groq-sdk');
const db = require('../config/db');
require('dotenv').config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const getCollegeContext = async () => {
  const result = await db.query('SELECT content FROM knowledge_base');
  return result.rows.map(row => row.content).join('\n\n');
};

const chatCompletion = async (leadId, userMessage, history = []) => {
  try {
    const collegeContext = await getCollegeContext();
    
    const systemPrompt = `
      You are an AI Admission Assistant for CampusConnect University.
      Your goal is to help students with their inquiries about admissions, fees, hostel, and placements.
      
      CRITICAL GUIDELINES:
      1. Use ONLY the provided College Context to answer questions.
      2. If the information is NOT in the context, politely say you don't have that specific detail and suggest contacting the admission office at +91 9876543210.
      3. Be professional, friendly, and encouraging.
      4. Do NOT hallucinate or make up facts.
      5. Keep responses concise and structured.

      College Context:
      ${collegeContext}
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1024,
    });

    const responseContent = completion.choices[0].message.content;

    // Detect Intent
    const intent = await detectIntent(userMessage, responseContent);

    return {
      content: responseContent,
      intent: intent,
      usage: completion.usage
    };
  } catch (error) {
    console.error('Groq AI Error:', error.message);
    throw error;
  }
};

const detectIntent = async (userMessage, aiResponse) => {
  try {
    const classificationPrompt = `
      Analyze the following student message and AI response.
      Classify the student's intent into ONE of these categories:
      - INTERESTED: Student shows high interest or asks about joining.
      - FEE_QUERY: Asking about costs, tuition, or payments.
      - HOSTEL_QUERY: Asking about accommodation.
      - DOCUMENT_QUERY: Asking about required papers.
      - CALLBACK_REQUEST: Student wants a phone call or meeting.
      - NOT_INTERESTED: Student explicitly says they are not interested.
      - GENERAL: General questions or greetings.

      Student Message: "${userMessage}"
      AI Response: "${aiResponse}"

      Return ONLY the category name in uppercase.
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: classificationPrompt }],
      model: 'llama-3-8b-8192', // Smaller model for simple classification
      temperature: 0,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    return 'GENERAL';
  }
};

module.exports = {
  chatCompletion,
  detectIntent
};
