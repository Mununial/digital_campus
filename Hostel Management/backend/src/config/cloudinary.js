const cloudinary = require('cloudinary').v2;
const env = require('./env');

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY.cloudName,
  api_key: env.CLOUDINARY.apiKey,
  api_secret: env.CLOUDINARY.apiSecret,
  secure: true
});

console.log('Cloudinary SDK configured successfully.');

module.exports = cloudinary;
