const mysql = require('mysql2/promise');
const env = require('./env');

// Real Production MySQL Connection Pool
const realPool = mysql.createPool({
  host: env.DB.host,
  port: env.DB.port || 3306,
  user: env.DB.user,
  password: env.DB.password,
  database: env.DB.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Strict Real DB Pool Wrapper (ZERO MOCK / ZERO FALLBACK)
const pool = {
  query: async (sql, params) => {
    try {
      return await realPool.query(sql, params);
    } catch (error) {
      console.error('[MySQL Query Error]:', error.message);
      if (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ER_ACCESS_DENIED_ERROR'
      ) {
        const dbErr = new Error('Database unavailable. Please try later.');
        dbErr.status = 503;
        dbErr.code = 'DATABASE_UNAVAILABLE';
        throw dbErr;
      }
      throw error;
    }
  },

  getConnection: async () => {
    try {
      return await realPool.getConnection();
    } catch (error) {
      console.error('[MySQL Connection Error]:', error.message);
      const dbErr = new Error('Database unavailable. Please try later.');
      dbErr.status = 503;
      dbErr.code = 'DATABASE_UNAVAILABLE';
      throw dbErr;
    }
  },

  end: async () => {
    return realPool.end();
  }
};

const testConnection = async () => {
  try {
    const connection = await realPool.getConnection();
    console.log('\x1b[32m%s\x1b[0m', 'MySQL Database connected successfully to ' + env.DB.host);
    connection.release();
    return true;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'MySQL Database connection failed: ' + error.message);
    return false;
  }
};

module.exports = {
  pool,
  testConnection
};
