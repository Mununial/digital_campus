const db = require('../config/db');
const env = require('../config/env');

const getHealthStatus = async (req, res) => {
  const dbConnected = await db.testConnection();
  
  const status = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    services: {
      api: {
        status: 'UP'
      },
      database: {
        status: dbConnected ? 'CONNECTED' : 'MOCK_ENGINE_ACTIVE'
      }
    }
  };

  return res.status(200).json(status);
};

module.exports = {
  getHealthStatus
};
