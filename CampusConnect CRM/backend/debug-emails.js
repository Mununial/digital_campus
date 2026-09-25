const emailService = require('./src/services/emailService');

const testLogs = async () => {
  try {
    console.log('🔍 Testing Email Logs Fetch...');
    const logs = await emailService.getEmailLogs();
    console.log('✅ Successfully fetched logs:', logs.length);
  } catch (error) {
    console.error('❌ Error caught in test:', error.message);
  }
};

testLogs();
