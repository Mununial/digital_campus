const visitorService = require('../services/visitorService');

exports.getVisits = async (req, res, next) => {
  try {
    const result = await visitorService.getVisits(req.query, req.user);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getVisitById = async (req, res, next) => {
  try {
    const visit = await visitorService.getVisitById(req.params.id, req.user);
    return res.status(200).json({ success: true, data: visit });
  } catch (error) {
    next(error);
  }
};

exports.createVisit = async (req, res, next) => {
  try {
    const visit = await visitorService.createVisit(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Visitor visit registered successfully',
      data: visit
    });
  } catch (error) {
    next(error);
  }
};

exports.approveVisit = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const visit = await visitorService.approveVisit(req.params.id, req.user, comment);
    return res.status(200).json({
      success: true,
      message: 'Visitor request approved successfully',
      data: visit
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectVisit = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const visit = await visitorService.rejectVisit(req.params.id, req.user, comment);
    return res.status(200).json({
      success: true,
      message: 'Visitor request rejected successfully',
      data: visit
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelVisit = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const visit = await visitorService.cancelVisit(req.params.id, req.user, comment);
    return res.status(200).json({
      success: true,
      message: 'Visit cancelled successfully',
      data: visit
    });
  } catch (error) {
    next(error);
  }
};

exports.checkInVisit = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const visit = await visitorService.checkInVisit(req.params.id, req.user, comment);
    return res.status(200).json({
      success: true,
      message: 'Visitor checked in successfully',
      data: visit
    });
  } catch (error) {
    next(error);
  }
};

exports.checkOutVisit = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const visit = await visitorService.checkOutVisit(req.params.id, req.user, comment);
    return res.status(200).json({
      success: true,
      message: 'Visitor checked out successfully',
      data: visit
    });
  } catch (error) {
    next(error);
  }
};

exports.getVisitorSummary = async (req, res, next) => {
  try {
    const summary = await visitorService.getVisitorSummary(req.user);
    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentVisitors = async (req, res, next) => {
  try {
    const result = await visitorService.getVisits({ ...req.query, is_current: true }, req.user);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
