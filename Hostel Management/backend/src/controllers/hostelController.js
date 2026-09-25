const hostelService = require('../services/hostelService');

/**
 * Retrieves all hostels, filtered by user's role and assignments.
 */
const getAllHostels = async (req, res, next) => {
  try {
    const result = await hostelService.getAllHostels(req.query, req.user);
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

/**
 * Retrieves a single hostel by ID.
 */
const getHostelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hostel = await hostelService.getHostelById(id, req.user);
    return res.status(200).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new hostel (Super Admin only).
 */
const createHostel = async (req, res, next) => {
  try {
    const hostel = await hostelService.createHostel(req.body, req.user);
    return res.status(201).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a hostel (Super Admin only).
 */
const updateHostel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hostel = await hostelService.updateHostel(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      data: hostel
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Safely deletes a hostel (Super Admin only).
 */
const deleteHostel = async (req, res, next) => {
  try {
    const { id } = req.params;
    await hostelService.deleteHostel(id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Hostel deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Retrieves summary statistics for a hostel.
 */
const getHostelSummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const summary = await hostelService.getHostelSummary(id, req.user);
    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
  getHostelSummary
};
