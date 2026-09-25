const bedService = require('../services/bedService');

const getAllBeds = async (req, res, next) => {
  try {
    const result = await bedService.getAllBeds(req.query, req.user);
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

const getBedById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bed = await bedService.getBedById(id, req.user);
    return res.status(200).json({
      success: true,
      data: bed
    });
  } catch (error) {
    next(error);
  }
};

const createBed = async (req, res, next) => {
  try {
    const bed = await bedService.createBed(req.body, req.user);
    return res.status(201).json({
      success: true,
      data: bed
    });
  } catch (error) {
    next(error);
  }
};

const updateBed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bed = await bedService.updateBed(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      data: bed
    });
  } catch (error) {
    next(error);
  }
};

const deleteBed = async (req, res, next) => {
  try {
    const { id } = req.params;
    await bedService.deleteBed(id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Bed deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBeds,
  getBedById,
  createBed,
  updateBed,
  deleteBed
};
