const gatePassService = require('../services/gatePassService');

async function requestGatePass(req, res, next) {
  try {
    const pass = await gatePassService.requestGatePass(req.user, req.body);
    res.status(201).json({
      success: true,
      message: 'Gate Pass request submitted successfully!',
      data: pass
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getGatePasses(req, res, next) {
  try {
    const result = await gatePassService.getGatePasses(req.user, req.query);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getGatePassById(req, res, next) {
  try {
    const pass = await gatePassService.getGatePassById(req.user, req.params.id);
    res.json({
      success: true,
      data: pass
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
}

async function approveRejectGatePass(req, res, next) {
  try {
    const pass = await gatePassService.approveRejectGatePass(req.user, req.params.id, req.body);
    res.json({
      success: true,
      message: `Gate Pass successfully ${pass.status.toLowerCase()}!`,
      data: pass
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cancelGatePass(req, res, next) {
  try {
    const pass = await gatePassService.cancelGatePass(req.user, req.params.id);
    res.json({
      success: true,
      message: 'Gate Pass cancelled successfully.',
      data: pass
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function securityGateAction(req, res, next) {
  try {
    const pass = await gatePassService.securityGateAction(req.user, req.body);
    res.json({
      success: true,
      message: `Security action '${req.body.action}' recorded successfully!`,
      data: pass
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getGatePassStats(req, res, next) {
  try {
    const stats = await gatePassService.getGatePassStats(req.user);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  requestGatePass,
  getGatePasses,
  getGatePassById,
  approveRejectGatePass,
  cancelGatePass,
  securityGateAction,
  getGatePassStats
};
