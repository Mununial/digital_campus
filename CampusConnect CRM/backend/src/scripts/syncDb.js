const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const syncDatabase = async () => {
  try {
    console.log('🔄 Starting Database Sync...');
    
    const sqlPath = path.join(__dirname, '../../schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Executing schema.sql on Supabase...');
    await pool.query(sql);
    
    console.log('✅ Database Synced Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync Failed:', error.message);
    process.exit(1);
  }
};

syncDatabase();
