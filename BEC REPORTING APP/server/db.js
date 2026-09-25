import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
    host: process.env.DB_HOST || 'srv1334.hstgr.io',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'u847513759_ERP_COLLEGE',
    password: process.env.DB_PASSWORD || 'Ayushtech@26',
    database: process.env.DB_NAME || 'u847513759_ERP_COLLEGE',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log(`[MySQL DB] Connecting to MySQL Host: ${dbConfig.host}:${dbConfig.port} (Database: ${dbConfig.database})...`);

const pool = mysql.createPool(dbConfig);

export async function initDb() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ [MySQL DB] Connected successfully to Hostinger MySQL Database!');
        
        // Auto-run schema initialization
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sqlContent = await fs.readFile(schemaPath, 'utf8');
        
        // Split statements by semicolon
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            await connection.query(statement);
        }
        
        console.log('✅ [MySQL DB] All tables verified/initialized in database:', dbConfig.database);
        connection.release();
    } catch (err) {
        console.error('❌ [MySQL DB Connection Error]:', err.message);
    }
}

export default pool;
