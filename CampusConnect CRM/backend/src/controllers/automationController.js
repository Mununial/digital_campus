const automationService = require('../services/automationService');

const getRules = async (req, res) => {
  try {
    const rules = await automationService.getAllRules();
    res.status(200).json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const rule = await automationService.toggleRule(id, isActive);
    res.status(200).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLogs = async (req, res) => {
  try {
    const logs = await automationService.getLogs();
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createRule = async (req, res) => {
  try {
    const rule = await automationService.createRule(req.body);
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRules,
  toggleRule,
  getLogs,
  createRule
};
