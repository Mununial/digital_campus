/**
 * Role Mapper and Route Protection Guard
 */

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const userRole = req.user.role;
    const isAdmin = req.user.isAdmin;

    // Super admin can access all role-protected endpoints
    if (isAdmin && allowedRoles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()))) {
      return next();
    }

    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
    if (normalizedAllowed.includes(userRole.toUpperCase())) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of [${allowedRoles.join(', ')}] permissions. Current role: ${userRole}`
    });
  };
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to administrators only.'
    });
  }
  next();
}

module.exports = {
  requireRole,
  requireAdmin
};
