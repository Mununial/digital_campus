const masterService = require('../services/masterService');
const integrityService = require('../services/integrityService');

/**
 * Controller for retrieving master data summary dashboard metrics.
 */
async function getMasterSummary(req, res, next) {
  try {
    const summary = await masterService.getMasterSummary(req.user);
    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for running data integrity diagnostics.
 */
async function runIntegrityCheck(req, res, next) {
  try {
    const result = await integrityService.runIntegrityCheck(req.user);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for performing controlled safe repairs.
 */
async function repairIntegrityIssue(req, res, next) {
  try {
    const result = await integrityService.repairIntegrityIssue(req.body, req.user);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMasterSummary,
  runIntegrityCheck,
  repairIntegrityIssue
};
