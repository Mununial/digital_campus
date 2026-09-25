const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');

/**
 * Middleware to authenticate requests via JWT stored in HttpOnly cookies.
 */
const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    
    // Fallback to Authorization Bearer header (for robust cross-domain API calls)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT.secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.'
      });
    }

    // Fetch user and role from database
    const [users] = await db.pool.query(
      `SELECT u.id, u.username, u.email, u.status, u.must_change_password, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (users.length === 0 || users[0].status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive or no longer exists.'
      });
    }

    const user = users[0];
    if (decoded.isImpersonating) {
      user.isImpersonating = true;
      user.originalAdminId = decoded.originalAdminId;
      user.originalAdminUsername = decoded.originalAdminUsername;
      user.originalAdminRole = decoded.originalAdminRole;
    }
    if (user.role === 'SUPERINTENDENT') {
      const [shRows] = await db.pool.query(
        `SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?`,
        [user.id]
      );
      user.assignedHostels = shRows.map(r => r.hostel_id);
    }
    req.user = user;

    // First login password change enforcement
    const allowedAuthPaths = ['/api/auth/change-password', '/api/auth/me', '/api/auth/logout'];
    if (user.must_change_password && !allowedAuthPaths.some(p => req.originalUrl.startsWith(p))) {
      return res.status(403).json({
        success: false,
        must_change_password: true,
        message: 'Password change required before accessing the application.'
      });
    }

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server authentication error.'
    });
  }
};

/**
 * Middleware to restrict access to specific roles.
 * @param {...string} allowedRoles - List of authorized roles (e.g. 'SUPER_ADMIN', 'SUPERINTENDENT')
 */
const requireRole = (...allowedRoles) => {
  const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  authenticate: requireAuth,
  requireRole,
  requireRoles: requireRole
};

