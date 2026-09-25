const leaveService = require('../services/leaveService');

async function applyForLeave(req, res, next) {
  try {
    const leave = await leaveService.applyForLeave(req.user, req.body);
    res.status(201).json({
      success: true,
      message: 'Leave Application submitted successfully!',
      data: leave
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getLeaveApplications(req, res, next) {
  try {
    const result = await leaveService.getLeaveApplications(req.user, req.query);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getLeaveApplicationById(req, res, next) {
  try {
    const leave = await leaveService.getLeaveApplicationById(req.user, req.params.id);
    res.json({
      success: true,
      data: leave
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
}

async function approveRejectLeave(req, res, next) {
  try {
    const leave = await leaveService.approveRejectLeave(req.user, req.params.id, req.body);
    res.json({
      success: true,
      message: `Leave Application successfully ${leave.status.toLowerCase()}!`,
      data: leave
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cancelLeaveApplication(req, res, next) {
  try {
    const leave = await leaveService.cancelLeaveApplication(req.user, req.params.id);
    res.json({
      success: true,
      message: 'Leave Application cancelled successfully.',
      data: leave
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getLeaveStats(req, res, next) {
  try {
    const stats = await leaveService.getLeaveStats(req.user);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  applyForLeave,
  getLeaveApplications,
  getLeaveApplicationById,
  approveRejectLeave,
  cancelLeaveApplication,
  getLeaveStats
};
