const inspectionService = require('../services/inspectionService');

const createInspection = async (req, res, next) => {
  try {
    const record = await inspectionService.createInspection(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Room inspection recorded successfully.',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const getInspections = async (req, res, next) => {
  try {
    const result = await inspectionService.getInspections(req.query, req.user);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getInspectionById = async (req, res, next) => {
  try {
    const record = await inspectionService.getInspectionById(req.params.id, req.user);
    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const getRoomHistory = async (req, res, next) => {
  try {
    const result = await inspectionService.getRoomInspectionHistory(req.params.roomId, req.user);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInspection,
  getInspections,
  getInspectionById,
  getRoomHistory
};
