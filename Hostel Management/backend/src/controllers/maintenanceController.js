const maintenanceService = require('../services/maintenanceService');
const technicianService = require('../services/technicianService');

const createRequest = async (req, res, next) => {
  try {
    const record = await maintenanceService.createMaintenanceRequest(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Maintenance request submitted successfully.',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const getRequests = async (req, res, next) => {
  try {
    const result = await maintenanceService.getMaintenanceRequests(req.query, req.user);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const checkDuplicates = async (req, res, next) => {
  try {
    const duplicates = await maintenanceService.checkDuplicateRequests(req.query, req.user);
    res.json({
      success: true,
      data: duplicates
    });
  } catch (error) {
    next(error);
  }
};

const upvoteRequest = async (req, res, next) => {
  try {
    const record = await maintenanceService.upvoteMaintenanceRequest(req.user, req.params.id);
    res.json({
      success: true,
      message: 'Upvoted maintenance request successfully.',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const assignTechnician = async (req, res, next) => {
  try {
    const { technician_id } = req.body;
    if (!technician_id) {
      return res.status(400).json({ success: false, message: 'technician_id is required.' });
    }
    const record = await maintenanceService.assignTechnicianToRequest(req.user, req.params.id, technician_id);
    res.json({
      success: true,
      message: 'Technician assigned successfully.',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await maintenanceService.getMaintenanceAnalytics(req.query, req.user);
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

const getRequestById = async (req, res, next) => {
  try {
    const record = await maintenanceService.getMaintenanceById(req.params.id, req.user);
    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, resolutionNote } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status field is required.' });
    }
    const record = await maintenanceService.updateMaintenanceStatus(req.params.id, status, resolutionNote, req.user);
    res.json({
      success: true,
      message: `Maintenance request status updated to ${status}.`,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const assignStaff = async (req, res, next) => {
  try {
    const { assigned_to } = req.body;
    if (!assigned_to) {
      return res.status(400).json({ success: false, message: 'assigned_to user ID is required.' });
    }
    const record = await maintenanceService.assignMaintenance(req.params.id, assigned_to, req.user);
    res.json({
      success: true,
      message: 'Maintenance request assigned successfully.',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const updatePriority = async (req, res, next) => {
  try {
    const { priority, reason } = req.body;
    if (!priority) {
      return res.status(400).json({ success: false, message: 'Priority field is required.' });
    }
    const record = await maintenanceService.updateMaintenancePriority(req.params.id, priority, reason, req.user);
    res.json({
      success: true,
      message: 'Maintenance request priority updated successfully.',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const addUpdate = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }
    const record = await maintenanceService.addMaintenanceUpdate(req.params.id, message, req.user);
    res.json({
      success: true,
      message: 'Update note added successfully.',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

// Technician Directory Handlers
const getTechnicians = async (req, res, next) => {
  try {
    const technicians = await technicianService.getTechnicians(req.query);
    res.json({ success: true, data: technicians });
  } catch (error) {
    next(error);
  }
};

const getTechnicianById = async (req, res, next) => {
  try {
    const technician = await technicianService.getTechnicianById(req.params.id);
    if (!technician) {
      return res.status(404).json({ success: false, message: 'Technician not found.' });
    }
    res.json({ success: true, data: technician });
  } catch (error) {
    next(error);
  }
};

const createTechnician = async (req, res, next) => {
  try {
    const technician = await technicianService.createTechnician(req.user, req.body);
    res.status(201).json({ success: true, message: 'Technician created successfully.', data: technician });
  } catch (error) {
    next(error);
  }
};

const updateTechnician = async (req, res, next) => {
  try {
    const technician = await technicianService.updateTechnician(req.user, req.params.id, req.body);
    res.json({ success: true, message: 'Technician updated successfully.', data: technician });
  } catch (error) {
    next(error);
  }
};

const deleteTechnician = async (req, res, next) => {
  try {
    const result = await technicianService.deleteTechnician(req.user, req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  getRequests,
  checkDuplicates,
  upvoteRequest,
  assignTechnician,
  getAnalytics,
  getRequestById,
  updateStatus,
  assignStaff,
  updatePriority,
  addUpdate,
  getTechnicians,
  getTechnicianById,
  createTechnician,
  updateTechnician,
  deleteTechnician
};

