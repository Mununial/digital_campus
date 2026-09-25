const userService = require('../services/userService');
const securityService = require('../services/securityService');

const getContext = (req) => ({
  ip_address: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  user_agent: req.headers['user-agent']
});

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, role, status, search } = req.query;
    const result = await userService.getUsers({ page, limit, role, status, search });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== targetId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot view another user profile.' });
    }
    const user = await userService.getUserById(targetId);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const result = await userService.createUser(req.body, req.user, getContext(req));
    return res.status(201).json({ success: true, user: result, message: 'User account created successfully.' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { status } = req.body;
    const result = await userService.updateUserStatus(targetId, status, req.user, getContext(req));
    return res.status(200).json({ success: true, ...result, message: `Account status updated to ${status}.` });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { role } = req.body;
    const result = await userService.updateUserRole(targetId, role, req.user, getContext(req));
    return res.status(200).json({ success: true, ...result, message: `User role updated to ${role}.` });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const adminResetPassword = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { new_password } = req.body;
    if (!new_password) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }
    const result = await userService.adminResetPassword(targetId, new_password, req.user, getContext(req));
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const updateSuperintendentHostels = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { hostel_ids } = req.body;
    const result = await userService.updateSuperintendentHostels(targetId, hostel_ids, req.user, getContext(req));
    return res.status(200).json({ success: true, ...result, message: 'Hostel assignments updated successfully.' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const updateSelfProfile = async (req, res, next) => {
  try {
    const result = await userService.updateSelfProfile(req.user.id, req.body, getContext(req));
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, action, user_id, startDate, endDate } = req.query;
    const result = await securityService.getAuditLogs({ page, limit, action, user_id, startDate, endDate });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUserStatus,
  updateUserRole,
  adminResetPassword,
  updateSuperintendentHostels,
  updateSelfProfile,
  getAuditLogs
};
