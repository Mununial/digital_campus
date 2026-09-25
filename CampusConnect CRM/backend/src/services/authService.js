const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const register = async (userData) => {
  const { fullName, email, password, role } = userData;
  const passwordHash = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO users (full_name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, full_name, email, role
  `;

  const result = await db.query(query, [fullName, email, passwordHash, role]);
  return result.rows[0];
};

const login = async (email, password) => {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user || !user.is_active) {
    throw new Error('Invalid credentials or inactive account');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role
    },
    token
  };
};

const getUserProfile = async (userId) => {
  const result = await db.query('SELECT id, full_name, email, role, is_active FROM users WHERE id = $1', [userId]);
  return result.rows[0];
};

module.exports = {
  register,
  login,
  getUserProfile
};
