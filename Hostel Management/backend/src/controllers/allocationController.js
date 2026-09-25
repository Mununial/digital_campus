const allocationService = require('../services/allocationService');

const handleAllocationError = (res, err, defaultMsg) => {
  console.error(`Allocation Controller Error: ${err.message}`, err);
  const status = err.status || 500;
  const message = (status < 500) ? err.message : defaultMsg;
  return res.status(status).json({
    success: false,
    message
  });
};

/**
 * GET /api/allocations
 */
exports.getAllocations = async (req, res) => {
  try {
    const data = await allocationService.getAllocations(req.query, req.user);
    return res.json({ success: true, data });
  } catch (err) {
    return handleAllocationError(res, err, 'Unable to fetch allocations.');
  }
};

/**
 * GET /api/allocations/me
 */
exports.getMyAllocation = async (req, res) => {
  try {
    const data = await allocationService.getMyAllocation(req.user);
    return res.json({ success: true, data });
  } catch (err) {
    return handleAllocationError(res, err, 'Unable to fetch personal allocation record.');
  }
};

/**
 * GET /api/allocations/available-beds
 */
exports.getAvailableBeds = async (req, res) => {
  try {
    const { hostel_id, room_id } = req.query;
    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'hostel_id query parameter is required.' });
    }
    const data = await allocationService.getAvailableBeds(hostel_id, room_id, req.user);
    return res.json({ success: true, data });
  } catch (err) {
    return handleAllocationError(res, err, 'Unable to fetch available beds.');
  }
};

/**
 * GET /api/allocations/consistency
 */
exports.getConsistencyReport = async (req, res) => {
  try {
    const data = await allocationService.getConsistencyReport(req.user);
    return res.json({ success: true, data });
  } catch (err) {
    return handleAllocationError(res, err, 'Unable to run allocation consistency report.');
  }
};

/**
 * GET /api/allocations/student/:studentId/history
 */
exports.getStudentAllocationHistory = async (req, res) => {
  try {
    const data = await allocationService.getStudentAllocationHistory(req.params.studentId, req.user);
    return res.json({ success: true, data });
  } catch (err) {
    return handleAllocationError(res, err, 'Unable to fetch student allocation history.');
  }
};

/**
 * GET /api/allocations/:id
 */
exports.getAllocationById = async (req, res) => {
  try {
    const data = await allocationService.getAllocationById(req.params.id, req.user);
    return res.json({ success: true, data });
  } catch (err) {
    return handleAllocationError(res, err, 'Unable to fetch allocation details.');
  }
};

/**
 * POST /api/allocations
 */
exports.allocateStudent = async (req, res) => {
  try {
    const data = await allocationService.allocateStudent(req.body, req.user);
    return res.status(201).json({ success: true, message: 'Student room/bed allocated successfully.', data });
  } catch (err) {
    return handleAllocationError(res, err, 'Failed to allocate room/bed to student.');
  }
};

/**
 * POST /api/allocations/:id/transfer
 */
exports.transferStudent = async (req, res) => {
  try {
    const data = await allocationService.transferStudent(req.params.id, req.body, req.user);
    return res.json({ success: true, message: 'Student accommodation transferred successfully.', data });
  } catch (err) {
    return handleAllocationError(res, err, 'Failed to transfer student accommodation.');
  }
};

/**
 * POST /api/allocations/:id/checkout
 */
exports.checkoutStudent = async (req, res) => {
  try {
    const data = await allocationService.checkoutStudent(req.params.id, req.body, req.user);
    return res.json({ success: true, message: 'Student checked out successfully.', data });
  } catch (err) {
    return handleAllocationError(res, err, 'Failed to checkout student.');
  }
};
