const { Pool } = require('pg');
require('dotenv').config();

const isLocal = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  console.log('Testing database connection...');
  console.log('Connection String (masked):', process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));
  
  try {
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Database Info:', res.rows[0]);
    
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in public schema:', tables.rows.map(t => t.table_name));
    
    client.release();
  } catch (err) {
    console.error('❌ Connection failed!');
    console.error('Error details:', err.message);
    if (err.code) console.error('Error Code:', err.code);
  } finally {
    await pool.end();
  }
}

testConnection();
