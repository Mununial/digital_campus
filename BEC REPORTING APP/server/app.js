import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generatePdfFromTemplate } from './services/pdfGenerator.js';
import pool, { initDb } from './db.js';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_college_erp_jwt_key_2026';

// Initialize Hostinger MySQL Database Schema on startup
initDb().catch(err => console.error('[MySQL Init Error]:', err));

const envOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
  : [];

const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
  ...envOrigins
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
      return callback(null, true);
    }
    return callback(null, true); // Allow for mobile / dynamic origins
  },
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));

// Dynamic Client Configuration Endpoints (exposes non-secret frontend configs)
app.get('/api/config', (req, res) => {
  res.json({
    databaseType: 'mysql',
    officialAdminEmails: (process.env.OFFICIAL_ADMIN_EMAILS || 'admin@college.ac.in,becreportingapp@gmail.com').split(',').map(e => e.trim()).filter(Boolean),
    allowedAdminDomains: (process.env.ALLOWED_ADMIN_DOMAINS || '@college.ac.in,@becbbsr.ac.in,@becbbsr.in,@bec.edu.in').split(',').map(d => d.trim()).filter(Boolean),
    institutionName: process.env.INSTITUTION_NAME || 'College ERP System',
    institutionCode: process.env.INSTITUTION_CODE || 'ERP',
    apiBaseUrl: process.env.API_BASE_URL || ''
  });
});

app.get('/api/config.js', (req, res) => {
  res.type('application/javascript');
  const config = {
    databaseType: 'mysql',
    officialAdminEmails: (process.env.OFFICIAL_ADMIN_EMAILS || 'admin@college.ac.in,becreportingapp@gmail.com').split(',').map(e => e.trim()).filter(Boolean),
    allowedAdminDomains: (process.env.ALLOWED_ADMIN_DOMAINS || '@college.ac.in,@becbbsr.ac.in,@becbbsr.in,@bec.edu.in').split(',').map(d => d.trim()).filter(Boolean),
    institutionName: process.env.INSTITUTION_NAME || 'College ERP System',
    institutionCode: process.env.INSTITUTION_CODE || 'ERP',
    apiBaseUrl: process.env.API_BASE_URL || ''
  };
  res.send(`window.APP_CONFIG = ${JSON.stringify(config)};`);
});

// Strict Anti-Caching & Security Headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// Serve static frontend assets and pages
const clientDir = path.join(__dirname, '../client');
app.use(express.static(clientDir));
app.use('/pages', express.static(path.join(clientDir, 'pages')));
app.use('/css', express.static(path.join(clientDir, 'css')));
app.use('/js', express.static(path.join(clientDir, 'js')));
app.use('/assets', express.static(path.join(clientDir, 'assets')));

app.get('/', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// Helper JWT Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

// -------------------------------------------------------------------
// MySQL AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        const officialAdmins = (process.env.OFFICIAL_ADMIN_EMAILS || 'admin@college.ac.in,becreportingapp@gmail.com').split(',').map(e => e.trim().toLowerCase());
        const allowedDomains = (process.env.ALLOWED_ADMIN_DOMAINS || '@college.ac.in,@becbbsr.ac.in').split(',').map(d => d.trim().toLowerCase());

        const isSuperAdmin = officialAdmins.includes(cleanEmail);
        const isDomainAdmin = allowedDomains.some(d => cleanEmail.endsWith(d)) || cleanEmail.includes('subadmin');
        const isAdmin = isSuperAdmin || isDomainAdmin;

        const role = isAdmin ? 'admin' : 'student';
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = 'USR_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

        await pool.query(
            `INSERT INTO users (id, email, password_hash, display_name, role, user_role, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, cleanEmail, passwordHash, fullName || cleanEmail.split('@')[0], role, role, isAdmin ? 1 : 0]
        );

        if (isAdmin) {
            await pool.query(
                `INSERT INTO admins (id, uid, email, display_name, role, user_role, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`,
                [userId, userId, cleanEmail, fullName || cleanEmail.split('@')[0], role, role, 1]
            );
        } else {
            await pool.query(
                `INSERT INTO students (id, user_id, status) VALUES (?, ?, 'IN_PROGRESS')
                 ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
                [userId, userId]
            );
        }

        const token = jwt.sign({ id: userId, uid: userId, email: cleanEmail, role, isAdmin }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            token,
            user: {
                id: userId,
                uid: userId,
                email: cleanEmail,
                displayName: fullName || cleanEmail.split('@')[0],
                role,
                userRole: role,
                isAdmin
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Failed to register account', details: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        if (user.is_blocked) {
            return res.status(403).json({ error: 'Your account has been blocked by Administrator' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        const isAdmin = user.is_admin === 1 || user.role === 'admin' || user.user_role === 'admin';
        const token = jwt.sign({ id: user.id, uid: user.id, email: user.email, role: user.role, isAdmin }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                uid: user.id,
                email: user.email,
                displayName: user.display_name,
                role: user.role,
                userRole: user.user_role,
                isAdmin
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to login', details: err.message });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, email, display_name, role, user_role, is_admin, is_blocked FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = users[0];
        res.json({
            id: user.id,
            uid: user.id,
            email: user.email,
            displayName: user.display_name,
            role: user.role,
            userRole: user.user_role,
            isAdmin: user.is_admin === 1
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// -------------------------------------------------------------------
// MySQL STUDENT DATA CRUD ENDPOINTS
// -------------------------------------------------------------------

app.get('/api/students', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;
        const search = req.query.search ? `%${req.query.search.trim()}%` : null;

        let query = 'SELECT * FROM students';
        let params = [];

        if (search) {
            query += ' WHERE registration_number LIKE ? OR id LIKE ? OR personal_json LIKE ?';
            params.push(search, search, search);
        }

        query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await pool.query(query, params);
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM students');

        const students = rows.map(r => ({
            id: r.id,
            registrationNumber: r.registration_number,
            enrollmentNumber: r.enrollment_number,
            rollNumber: r.roll_number,
            section: r.section,
            status: r.status,
            verified: r.verified === 1,
            idCardGenerated: r.id_card_generated === 1,
            remarks: r.remarks,
            personal: typeof r.personal_json === 'string' ? JSON.parse(r.personal_json || '{}') : (r.personal_json || {}),
            reporting: typeof r.reporting_json === 'string' ? JSON.parse(r.reporting_json || '{}') : (r.reporting_json || {}),
            facilities: typeof r.facilities_json === 'string' ? JSON.parse(r.facilities_json || '{}') : (r.facilities_json || {}),
            fees: typeof r.fees_json === 'string' ? JSON.parse(r.fees_json || '{}') : (r.fees_json || {}),
            documents: typeof r.documents_json === 'string' ? JSON.parse(r.documents_json || '{}') : (r.documents_json || {}),
            hostel: typeof r.hostel_json === 'string' ? JSON.parse(r.hostel_json || '{}') : (r.hostel_json || {}),
            transport: typeof r.transport_json === 'string' ? JSON.parse(r.transport_json || '{}') : (r.transport_json || {}),
            antiragging: typeof r.antiragging_json === 'string' ? JSON.parse(r.antiragging_json || '{}') : (r.antiragging_json || {}),
            admin: typeof r.admin_json === 'string' ? JSON.parse(r.admin_json || '{}') : (r.admin_json || {}),
            updatedAt: r.updated_at
        }));

        res.json({
            students,
            total: countResult[0].total,
            limit,
            offset
        });
    } catch (err) {
        console.error('Fetch students error:', err);
        res.status(500).json({ error: 'Failed to fetch student records' });
    }
});

app.get('/api/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [studentId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Student record not found' });

        const r = rows[0];
        res.json({
            id: r.id,
            registrationNumber: r.registration_number,
            enrollmentNumber: r.enrollment_number,
            rollNumber: r.roll_number,
            section: r.section,
            status: r.status,
            verified: r.verified === 1,
            idCardGenerated: r.id_card_generated === 1,
            remarks: r.remarks,
            personal: typeof r.personal_json === 'string' ? JSON.parse(r.personal_json || '{}') : (r.personal_json || {}),
            reporting: typeof r.reporting_json === 'string' ? JSON.parse(r.reporting_json || '{}') : (r.reporting_json || {}),
            facilities: typeof r.facilities_json === 'string' ? JSON.parse(r.facilities_json || '{}') : (r.facilities_json || {}),
            fees: typeof r.fees_json === 'string' ? JSON.parse(r.fees_json || '{}') : (r.fees_json || {}),
            documents: typeof r.documents_json === 'string' ? JSON.parse(r.documents_json || '{}') : (r.documents_json || {}),
            hostel: typeof r.hostel_json === 'string' ? JSON.parse(r.hostel_json || '{}') : (r.hostel_json || {}),
            transport: typeof r.transport_json === 'string' ? JSON.parse(r.transport_json || '{}') : (r.transport_json || {}),
            antiragging: typeof r.antiragging_json === 'string' ? JSON.parse(r.antiragging_json || '{}') : (r.antiragging_json || {}),
            admin: typeof r.admin_json === 'string' ? JSON.parse(r.admin_json || '{}') : (r.admin_json || {}),
            updatedAt: r.updated_at
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch student record' });
    }
});

app.post('/api/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const data = req.body || {};

        const adminObj = data.admin || {};
        const regNo = adminObj.registrationNumber || data.registrationNumber || null;
        const enrNo = adminObj.enrollmentNumber || data.enrollmentNumber || null;
        const rollNo = adminObj.rollNumber || data.rollNumber || null;
        const section = adminObj.section || data.section || null;
        const status = adminObj.status || data.status || 'IN_PROGRESS';
        const verified = adminObj.verified === true || data.verified === true ? 1 : 0;
        const idCardGenerated = adminObj.idCardGenerated === true || data.idCardGenerated === true ? 1 : 0;
        const remarks = adminObj.remarks || data.remarks || null;

        await pool.query(
            `INSERT INTO students (
                id, user_id, registration_number, enrollment_number, roll_number, section, status, verified, id_card_generated, remarks,
                personal_json, reporting_json, facilities_json, fees_json, documents_json, hostel_json, transport_json, antiragging_json, admin_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                registration_number = VALUES(registration_number),
                enrollment_number = VALUES(enrollment_number),
                roll_number = VALUES(roll_number),
                section = VALUES(section),
                status = VALUES(status),
                verified = VALUES(verified),
                id_card_generated = VALUES(id_card_generated),
                remarks = VALUES(remarks),
                personal_json = VALUES(personal_json),
                reporting_json = VALUES(reporting_json),
                facilities_json = VALUES(facilities_json),
                fees_json = VALUES(fees_json),
                documents_json = VALUES(documents_json),
                hostel_json = VALUES(hostel_json),
                transport_json = VALUES(transport_json),
                antiragging_json = VALUES(antiragging_json),
                admin_json = VALUES(admin_json)`,
            [
                studentId, studentId, regNo, enrNo, rollNo, section, status, verified, idCardGenerated, remarks,
                JSON.stringify(data.personal || {}),
                JSON.stringify(data.reporting || data.academic || {}),
                JSON.stringify(data.facilities || {}),
                JSON.stringify(data.fees || {}),
                JSON.stringify(data.documents || {}),
                JSON.stringify(data.hostel || {}),
                JSON.stringify(data.transport || {}),
                JSON.stringify(data.antiragging || {}),
                JSON.stringify(data.admin || {})
            ]
        );

        res.json({ success: true, message: 'Student record saved successfully to MySQL', studentId });
    } catch (err) {
        console.error('Save student error:', err);
        res.status(500).json({ error: 'Failed to save student record to database' });
    }
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
        await pool.query('DELETE FROM users WHERE id = ?', [studentId]);
        res.json({ success: true, message: 'Student record deleted successfully from MySQL' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete student record' });
    }
});

// Puppeteer Native A4 PDF Generation Endpoint
app.post(['/api/pdf/generate', '/pdf/generate'], async (req, res) => {
  try {
    const { templateType = 'reporting', data = {} } = req.body || {};
    let baseUrl;
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
      baseUrl = `${proto}://${host}`;
    }

    console.log(`[PDF Generator] Generating native Puppeteer A4 PDF for template: ${templateType} (BaseURL: ${baseUrl})`);
    const pdfBuffer = await generatePdfFromTemplate(templateType, data, baseUrl);

    const buffer = Buffer.from(pdfBuffer);
    const headerStr = buffer.slice(0, 5).toString('utf8');
    const isValidPdf = buffer.length > 0 && headerStr === '%PDF-';

    console.log(`[PDF Verification 1] Buffer Length: ${buffer.length} bytes`);
    console.log(`[PDF Verification 2] Header Magic Bytes: "${headerStr}" (Valid PDF: ${isValidPdf})`);

    const nameRaw = (data && data.personal && data.personal.studentFullName) ? data.personal.studentFullName : 'STUDENT';
    const nameSlug = nameRaw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const filename = `${nameSlug}_${templateType.toUpperCase()}.pdf`;

    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (err) {
    console.error('[PDF Generator Error]:', err);
    res.status(500).json({ error: 'Failed to generate PDF document via Puppeteer', details: err.message });
  }
});

// Cloudinary Signature Endpoint
app.post('/api/sign-upload', (req, res) => {
  try {
    const { timestamp, folder } = req.body;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiSecret || !apiKey || !cloudName) {
      return res.status(500).json({ error: 'Cloudinary configuration missing in server environment (.env)' });
    }
    
    const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(strToSign).digest('hex');
    
    res.json({ signature, api_key: apiKey, cloud_name: cloudName });
  } catch (err) {
    console.error('Signature generation error:', err);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
});

// Cloudinary Student Data Deletion Endpoint
app.post('/api/delete-student-cloudinary', async (req, res) => {
  try {
    const { studentId, publicIds = [] } = req.body;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiSecret || !apiKey || !cloudName) {
      return res.status(500).json({ error: 'Cloudinary configuration missing in server environment (.env)' });
    }

    console.log(`[Cloudinary Cleanup] Request to delete assets for student ID: ${studentId}`, publicIds);
    const deleteResults = [];

    for (const pid of publicIds) {
      if (!pid) continue;
      const timestamp = Math.floor(Date.now() / 1000);
      
      for (const resourceType of ['image', 'raw', 'video']) {
        try {
          const strToSign = `public_id=${pid}&timestamp=${timestamp}${apiSecret}`;
          const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

          const formData = new URLSearchParams();
          formData.append('public_id', pid);
          formData.append('api_key', apiKey);
          formData.append('timestamp', timestamp.toString());
          formData.append('signature', signature);

          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
            method: 'POST',
            body: formData
          });
          const resData = await response.json();
          if (resData.result === 'ok') {
            console.log(`[Cloudinary Cleanup] Successfully deleted ${pid} (${resourceType})`);
            deleteResults.push({ public_id: pid, resourceType, status: 'ok' });
            break;
          }
        } catch (e) {
          console.warn(`[Cloudinary Cleanup] Destroy attempt error for ${pid}:`, e.message);
        }
      }
    }

    res.json({ success: true, message: 'Cloudinary data deletion completed', results: deleteResults });
  } catch (err) {
    console.error('Cloudinary deletion endpoint error:', err);
    res.status(500).json({ error: 'Failed to delete Cloudinary assets' });
  }
});

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    database: 'MySQL',
    message: 'College ERP Backend Server Running.',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0-prod'
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

export default app;

