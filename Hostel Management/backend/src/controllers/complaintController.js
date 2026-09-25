const complaintService = require('../services/complaintService');

/**
 * GET /api/complaints
 */
exports.getComplaints = async (req, res) => {
  try {
    const result = await complaintService.getComplaints(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: result.complaints,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('getComplaints error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch complaints'
    });
  }
};

/**
 * GET /api/complaints/summary
 */
exports.getComplaintSummary = async (req, res) => {
  try {
    const summary = await complaintService.getComplaintSummary(req.user);
    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('getComplaintSummary error:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch complaint summary'
    });
  }
};

/**
 * GET /api/complaints/:id
 */
exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await complaintService.getComplaintById(id, req.user);
    return res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch complaint details'
    });
  }
};

/**
 * POST /api/complaints
 */
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (title.trim().length > 150) {
      return res.status(400).json({ success: false, message: 'Title must not exceed 150 characters' });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    const complaint = await complaintService.createComplaint(
      { title, description, category, priority },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: complaint
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to create complaint'
    });
  }
};

/**
 * PATCH /api/complaints/:id/status
 */
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment, resolution } = req.body;

    const complaint = await complaintService.updateComplaintStatus(
      id,
      { status, comment, resolution },
      req.user
    );

    return res.status(200).json({
      success: true,
      message: `Complaint status updated to ${complaint.status}`,
      data: complaint
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to update complaint status'
    });
  }
};

/**
 * POST /api/complaints/:id/assign
 */
exports.assignComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const complaint = await complaintService.assignComplaint(id, assignedTo, req.user);

    return res.status(200).json({
      success: true,
      message: 'Complaint assigned successfully',
      data: complaint
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to assign complaint'
    });
  }
};

/**
 * POST /api/complaints/:id/comments
 */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, isInternal } = req.body;

    const complaint = await complaintService.addComment(id, comment, isInternal, req.user);

    return res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: complaint
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to add comment'
    });
  }
};

/**
 * DELETE /api/complaints/:id
 */
exports.deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await complaintService.deleteComplaint(id, req.user);

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to delete complaint'
    });
  }
};
