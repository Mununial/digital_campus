const leadService = require('../services/leadService');

const getAllLeads = async (req, res) => {
  try {
    const leads = await leadService.getAllLeads(req.user);
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLeadDetails = async (req, res) => {
  try {
    const lead = await leadService.getLeadById(req.params.id, req.user);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    
    const followups = await leadService.getFollowupsByLeadId(req.params.id);
    const activities = await leadService.getActivitiesByLeadId(req.params.id);
    const callLogs = await leadService.getCallLogsByLeadId(req.params.id);
    
    res.status(200).json({ ...lead, followups, activities, callLogs });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
};

const createLead = async (req, res) => {
  try {
    const lead = await leadService.createLead(req.body, req.user);
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateLead = async (req, res) => {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body, req.user);
    res.status(200).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteLead = async (req, res) => {
  try {
    const result = await leadService.deleteLead(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createFollowup = async (req, res) => {
  try {
    const followup = await leadService.createFollowup({ ...req.body, leadId: req.params.id }, req.user);
    res.status(201).json(followup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const importLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    const result = await leadService.importLeads(leads, req.user);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllLeads,
  getLeadDetails,
  createLead,
  updateLead,
  deleteLead,
  createFollowup,
  importLeads
};

