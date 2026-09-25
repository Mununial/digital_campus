const activityService = require('../services/activityService');

const getActivities = async (req, res, next) => {
  try {
    const result = await activityService.getActivities(req.query, req.user);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getActivityById = async (req, res, next) => {
  try {
    const activity = await activityService.getActivityById(req.params.id, req.user);
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

const getActivityStats = async (req, res, next) => {
  try {
    const stats = await activityService.getActivityStats(req.user);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivities,
  getActivityById,
  getActivityStats
};
