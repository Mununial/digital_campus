const jwt = require('jsonwebtoken');

const GATEWAY_SECRET = process.env.GATEWAY_JWT_SECRET || 'super_secret_bec_gateway_jwt_key_2026';
const MODULE_C_SECRET = process.env.JWT_SECRET || 'super_secret_genz_university_jwt_key_2026';
const MODULE_B_SECRET = process.env.HOSTEL_JWT_SECRET || 'your_jwt_secret_key_change_me_in_production';

const secrets = [GATEWAY_SECRET, MODULE_C_SECRET, MODULE_B_SECRET];

/**
 * Universal Auth Middleware
 * Verifies JWT tokens from Gateway, Module B, or Module C
 */
function authGateway(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token && req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  }
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.'
    });
  }

  let decodedUser = null;
  let lastError = null;

  for (const secret of secrets) {
    try {
      decodedUser = jwt.verify(token, secret);
      if (decodedUser) break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!decodedUser) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token.',
      error: lastError ? lastError.message : undefined
    });
  }

  // Standardize user object
  const rawRole = (decodedUser.role || decodedUser.userRole || decodedUser.user_role || 'STUDENT').toUpperCase();
  const isAdmin = decodedUser.isAdmin || rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN' || decodedUser.is_admin === 1;

  req.user = {
    id: decodedUser.id || decodedUser.uid || decodedUser.user_id,
    uid: decodedUser.uid || decodedUser.id,
    email: decodedUser.email,
    name: decodedUser.name || decodedUser.display_name || decodedUser.displayName || decodedUser.full_name || (decodedUser.email ? decodedUser.email.split('@')[0] : 'Student'),
    rollNo: decodedUser.rollNo || decodedUser.roll_number || decodedUser.rollNumber || decodedUser.username || '',
    gender: decodedUser.gender || 'FEMALE',
    branch: decodedUser.branch || 'CSE',
    semester: decodedUser.semester || 1,
    role: isAdmin ? 'SUPER_ADMIN' : (rawRole === 'TEACHER' || rawRole === 'SUPERINTENDENT' ? 'SUPERINTENDENT' : 'STUDENT'),
    rawRole: decodedUser.role,
    isAdmin: Boolean(isAdmin),
    token
  };

  next();
}

/**
 * Optional Auth Middleware
 * Populates req.user if a valid token exists, but doesn't block unauthenticated requests
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || (req.cookies && (req.cookies.token || req.cookies.authToken));
  
  if (token) {
    for (const secret of secrets) {
      try {
        const decodedUser = jwt.verify(token, secret);
        if (decodedUser) {
          const rawRole = (decodedUser.role || decodedUser.userRole || 'STUDENT').toUpperCase();
          const isAdmin = decodedUser.isAdmin || rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN' || decodedUser.is_admin === 1;
          req.user = {
            id: decodedUser.id || decodedUser.uid,
            email: decodedUser.email,
            name: decodedUser.name || decodedUser.display_name || decodedUser.full_name || 'User',
            rollNo: decodedUser.rollNo || decodedUser.roll_number || '24CSE018',
            role: isAdmin ? 'SUPER_ADMIN' : 'STUDENT',
            isAdmin: Boolean(isAdmin),
            token
          };
          break;
        }
      } catch (err) {}
    }
  }
  next();
}

module.exports = {
  authGateway,
  optionalAuth
};
