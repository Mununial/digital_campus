const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file (first try the parent workspace dir, then backend)
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config(); // fallback to default local directory

const requiredEnvVars = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missingEnvVars = [];

requiredEnvVars.forEach((varName) => {
  if (process.env[varName] === undefined || process.env[varName] === null) {
    missingEnvVars.push(varName);
  }
});

const defaultEnvVars = {
  DB_HOST: process.env.DB_HOST || 'srv1334.hstgr.io',
  DB_PORT: process.env.DB_PORT || '3306',
  DB_USER: process.env.DB_USER || 'u847513759_ERP_COLLEGE',
  DB_PASSWORD: process.env.DB_PASSWORD || 'Ayushtech@26',
  DB_NAME: process.env.DB_NAME || 'u847513759_ERP_COLLEGE',
  JWT_SECRET: 'dev_jwt_secret_key_12345',
  CLOUDINARY_CLOUD_NAME: 'demo',
  CLOUDINARY_API_KEY: '1234567890',
  CLOUDINARY_API_SECRET: 'secret'
};

if (missingEnvVars.length > 0) {
  console.log('[Hostel Config Notice]: Missing env vars, using production fallbacks for:', missingEnvVars.join(', '));
  missingEnvVars.forEach((v) => {
    process.env[v] = process.env[v] || defaultEnvVars[v] || 'dev_fallback';
  });
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME
  },
  JWT: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  CLOUDINARY: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  }
};
