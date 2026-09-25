const noticeService = require('../services/noticeService');

/**
 * GET /api/notices
 */
async function getNotices(req, res, next) {
  try {
    const result = await noticeService.getNotices(req.query, req.user);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notices/unread-count
 */
async function getUnreadCount(req, res, next) {
  try {
    const count = await noticeService.getUnreadCount(req.user);
    res.json({
      success: true,
      unreadCount: count
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notices/:id
 */
async function getNoticeById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notice ID' });
    }

    const notice = await noticeService.getNoticeById(id, req.user);
    res.json({
      success: true,
      notice
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notices
 */
async function createNotice(req, res, next) {
  try {
    const { title, description, priority, target, hostel_id, status, expires_at } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Notice title is required' });
    }
    if (title.trim().length > 150) {
      return res.status(400).json({ success: false, message: 'Notice title cannot exceed 150 characters' });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Notice description is required' });
    }
    if (priority && !['GENERAL', 'IMPORTANT', 'URGENT'].includes(priority.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Priority must be GENERAL, IMPORTANT, or URGENT' });
    }
    if (status && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Status must be DRAFT, PUBLISHED, or ARCHIVED' });
    }

    const notice = await noticeService.createNotice({
      title: title.trim(),
      description: description.trim(),
      priority: priority ? priority.toUpperCase() : 'GENERAL',
      target,
      hostel_id,
      status: status ? status.toUpperCase() : 'DRAFT',
      expires_at
    }, req.user);

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      notice
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/notices/:id
 */
async function updateNotice(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notice ID' });
    }

    const { title, description, priority, target, hostel_id, status, expires_at } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Title cannot be empty' });
      }
      if (title.trim().length > 150) {
        return res.status(400).json({ success: false, message: 'Title cannot exceed 150 characters' });
      }
    }
    if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
      return res.status(400).json({ success: false, message: 'Description cannot be empty' });
    }
    if (priority && !['GENERAL', 'IMPORTANT', 'URGENT'].includes(priority.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Priority must be GENERAL, IMPORTANT, or URGENT' });
    }
    if (status && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Status must be DRAFT, PUBLISHED, or ARCHIVED' });
    }

    const notice = await noticeService.updateNotice(id, {
      title: title ? title.trim() : undefined,
      description: description ? description.trim() : undefined,
      priority: priority ? priority.toUpperCase() : undefined,
      target,
      hostel_id,
      status: status ? status.toUpperCase() : undefined,
      expires_at
    }, req.user);

    res.json({
      success: true,
      message: 'Notice updated successfully',
      notice
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notices/:id/status
 */
async function updateNoticeStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notice ID' });
    }

    const { status } = req.body;
    if (!status || !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Status must be DRAFT, PUBLISHED, or ARCHIVED' });
    }

    const notice = await noticeService.updateNoticeStatus(id, status.toUpperCase(), req.user);
    res.json({
      success: true,
      message: `Notice status updated to ${status.toUpperCase()}`,
      notice
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notices/:id/read
 */
async function markNoticeRead(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notice ID' });
    }

    await noticeService.markNoticeRead(id, req.user.id);
    res.json({
      success: true,
      message: 'Notice marked as read'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/notices/:id
 */
async function deleteNotice(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notice ID' });
    }

    await noticeService.deleteNotice(id, req.user);
    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotices,
  getUnreadCount,
  getNoticeById,
  createNotice,
  updateNotice,
  updateNoticeStatus,
  markNoticeRead,
  deleteNotice
};
