const floorService = require('../services/floorService');

const getAllFloors = async (req, res, next) => {
  try {
    const result = await floorService.getAllFloors(req.query, req.user);
    if (result && result.pagination) {
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    }
    return res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getFloorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const floor = await floorService.getFloorById(id, req.user);
    return res.status(200).json({
      success: true,
      data: floor
    });
  } catch (error) {
    next(error);
  }
};

const createFloor = async (req, res, next) => {
  try {
    const floor = await floorService.createFloor(req.body, req.user);
    return res.status(201).json({
      success: true,
      data: floor
    });
  } catch (error) {
    next(error);
  }
};

const updateFloor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const floor = await floorService.updateFloor(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      data: floor
    });
  } catch (error) {
    next(error);
  }
};

const deleteFloor = async (req, res, next) => {
  try {
    const { id } = req.params;
    await floorService.deleteFloor(id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Floor deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllFloors,
  getFloorById,
  createFloor,
  updateFloor,
  deleteFloor
};
