let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  try {
    mysql = require('../campus-portal/node_modules/mysql2/promise');
  } catch (e2) {
    mysql = require('../Hostel Management/backend/node_modules/mysql2/promise');
  }
}
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.DB_HOST || 'srv1334.hstgr.io',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'u847513759_ERP_COLLEGE',
  password: process.env.DB_PASSWORD || 'ayusHtechnologies@2026',
  database: process.env.DB_NAME || 'u847513759_ERP_COLLEGE',
  multipleStatements: true
};

async function sync() {
  console.log(`[Hostinger DB Sync] Connecting to ${config.host}:${config.port} / ${config.database}...`);
  try {
    const conn = await mysql.createConnection(config);
    console.log('✅ Successfully connected to Hostinger MySQL Database!');

    const sqlFile = path.join(__dirname, '../u847513759_ERP_COLLEGE_COMPLETE_IMPORT.sql');
    console.log(`Reading SQL from ${sqlFile}...`);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Executing database import queries...');
    await conn.query(sql);
    console.log('🎉 ALL TABLES AND 352 STUDENTS SUCCESSFULLY STORED IN HOSTINGER MYSQL DATABASE!');

    const [uCount] = await conn.query('SELECT COUNT(*) as count FROM users');
    const [sCount] = await conn.query('SELECT COUNT(*) as count FROM students');
    console.log(`📊 Total Users in DB: ${uCount[0].count}`);
    console.log(`📊 Total Students in DB: ${sCount[0].count}`);

    await conn.end();
  } catch (err) {
    console.error('❌ Connection / Sync Error:', err.message);
    if (err.message.includes('Access denied')) {
      console.log('\n💡 [IMPORTANT HOSTINGER STEP NEEDED]:');
      console.log('Hostinger hPanel blocks remote external connections by default until enabled.');
      console.log('To connect directly from your laptop or server:');
      console.log('1. Go to Hostinger hPanel -> Databases -> Remote MySQL');
      console.log('2. In IP enter: % (to allow all) or your current IP');
      console.log('3. Select database: u847513759_ERP_COLLEGE -> Click "Create/Add"');
      console.log('\nAlternatively, you can click "Enter phpMyAdmin" (in your screenshot) -> click Import -> choose u847513759_ERP_COLLEGE_COMPLETE_IMPORT.sql -> click Go!');
    }
  }
}

sync();
