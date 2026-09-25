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
  console.error('\x1b[31m%s\x1b[0m', '==================================================');
  console.error('\x1b[31m%s\x1b[0m', 'CRITICAL SERVER CONFIGURATION ERROR:');
  console.error('\x1b[31m%s\x1b[0m', `Missing required environment variables:`);
  missingEnvVars.forEach((v) => console.error(`  - ${v}`));
  console.error('\x1b[31m%s\x1b[0m', 'Please create/configure your .env file correctly.');
  console.error('\x1b[31m%s\x1b[0m', '==================================================');
  process.exit(1);
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
