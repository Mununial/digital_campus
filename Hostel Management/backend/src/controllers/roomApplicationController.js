const roomApplicationService = require('../services/roomApplicationService');

async function applyForRoom(req, res, next) {
  try {
    const app = await roomApplicationService.applyForRoom(req.user, req.body);
    res.status(201).json({
      success: true,
      message: 'Room Allocation Application submitted successfully!',
      data: app
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getRoomApplications(req, res, next) {
  try {
    const result = await roomApplicationService.getRoomApplications(req.user, req.query);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getRoomApplicationById(req, res, next) {
  try {
    const app = await roomApplicationService.getRoomApplicationById(req.user, req.params.id);
    res.json({
      success: true,
      data: app
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
}

async function approveAndAllocateRoom(req, res, next) {
  try {
    const app = await roomApplicationService.approveAndAllocateRoom(req.user, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Bed allocated and Room Application approved successfully!',
      data: app
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function rejectRoomApplication(req, res, next) {
  try {
    const app = await roomApplicationService.rejectRoomApplication(req.user, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Room Application rejected.',
      data: app
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cancelRoomApplication(req, res, next) {
  try {
    const app = await roomApplicationService.cancelRoomApplication(req.user, req.params.id);
    res.json({
      success: true,
      message: 'Room Application cancelled successfully.',
      data: app
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getRoomApplicationStats(req, res, next) {
  try {
    const stats = await roomApplicationService.getRoomApplicationStats(req.user);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  applyForRoom,
  getRoomApplications,
  getRoomApplicationById,
  approveAndAllocateRoom,
  rejectRoomApplication,
  cancelRoomApplication,
  getRoomApplicationStats
};
