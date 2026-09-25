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

if (missingEnvVars.length > 0) {
  console.warn('[Hostel Config Notice]: Missing env vars, using production fallbacks for:', missingEnvVars.join(', '));
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    host: process.env.DB_HOST || 'srv1334.hstgr.io',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'u847513759_ERP_COLLEGE',
    password: process.env.DB_PASSWORD || 'ayusHtechnologies@2026',
    name: process.env.DB_NAME || 'u847513759_ERP_COLLEGE'
  },
  JWT: {
    secret: process.env.JWT_SECRET || 'super_secret_genz_university_jwt_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  CLOUDINARY: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'demo_cloud',
    apiKey: process.env.CLOUDINARY_API_KEY || '123456789',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'secret'
  }
};
