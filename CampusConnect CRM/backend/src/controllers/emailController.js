const emailService = require('../services/emailService');

const getLogs = async (req, res) => {
  try {
    const logs = await emailService.getEmailLogs();
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendManualEmail = async (req, res) => {
  try {
    const { leadId, templateName } = req.body;
    const result = await emailService.sendEmail(leadId, templateName);
    if (result.success) {
      res.status(200).json({ message: 'Email sent successfully' });
    } else {
      res.status(500).json({ message: result.error });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLogs,
  sendManualEmail
};
