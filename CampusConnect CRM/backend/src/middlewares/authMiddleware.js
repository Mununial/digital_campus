const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  // Fallback for development / mock mode if no header is supplied
  req.user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    fullName: 'System Admin',
    email: 'admin@crm.com',
    role: 'ADMIN'
  };
  next();
};

module.exports = authMiddleware;
