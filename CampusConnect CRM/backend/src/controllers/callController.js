const callService = require('../services/callService');

const getQueue = async (req, res) => {
  try {
    const queue = await callService.getCallQueue();
    res.status(200).json(queue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const enqueue = async (req, res) => {
  try {
    const { leadId, priority } = req.body;
    const item = await callService.enqueueCall(leadId, priority);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const cancel = async (req, res) => {
  try {
    const item = await callService.cancelCall(req.params.id);
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLogs = async (req, res) => {
  try {
    const logs = await callService.getCallLogs();
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLogDetail = async (req, res) => {
  try {
    const log = await callService.getCallLogById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.status(200).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const settings = await callService.getVoiceSettings();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const settings = await callService.updateVoiceSettings(req.body);
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getQueue,
  enqueue,
  cancel,
  getLogs,
  getLogDetail,
  getSettings,
  updateSettings
};
