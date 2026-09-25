const operationsService = require('../services/operationsService');

const getSummary = async (req, res, next) => {
  try {
    const summary = await operationsService.getOperationsSummary(req.user);
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary
};
