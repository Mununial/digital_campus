const roomService = require('../services/roomService');

const getAllRooms = async (req, res, next) => {
  try {
    const result = await roomService.getAllRooms(req.query, req.user);
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

const getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await roomService.getRoomById(id, req.user);
    return res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    next(error);
  }
};

const createRoom = async (req, res, next) => {
  try {
    const room = await roomService.createRoom(req.body, req.user);
    return res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    next(error);
  }
};

const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await roomService.updateRoom(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    next(error);
  }
};

const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    await roomService.deleteRoom(id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Room deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
};
