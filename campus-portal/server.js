const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Enable CORS with full credentials support
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));

// Body & Cookie Parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(cookieParser());

// Anti-caching & Security Headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// -------------------------------------------------------------
// 1. REDIRECT ALL OLD LOGIN PAGES TO DOORWAY (Files stay intact)
// -------------------------------------------------------------
app.get('/attendance/login',           (req, res) => res.redirect('/'));
app.get('/attendance/login/*',         (req, res) => res.redirect('/'));
app.get('/reporting/pages/login.html', (req, res) => res.redirect('/'));
app.get('/reporting/login',            (req, res) => res.redirect('/'));
app.get('/login',                      (req, res) => res.redirect('/'));
app.get('/signup',                     (req, res) => res.redirect('/'));

// -------------------------------------------------------------
// 2. UNIFIED GATEWAY & MODULE C (REPORTING) API ROUTES
// -------------------------------------------------------------
const gatewayAuthRoutes = require('./server/authGateway');
const gatewayReportingRoutes = require('./routes/gatewayReporting');

// Central Gateway Endpoints
app.use('/api/gateway', gatewayAuthRoutes);
app.use('/api/auth', gatewayAuthRoutes);

// Reporting System APIs
app.use('/api/reporting', gatewayReportingRoutes);
app.use('/api/config', gatewayReportingRoutes);
app.use('/api/config.js', gatewayReportingRoutes);
app.use('/api/sign-upload', gatewayReportingRoutes);

// -------------------------------------------------------------
// 3. MODULE B (HOSTEL MANAGEMENT) API ROUTES
// -------------------------------------------------------------
try {
  const hostelRoutes = require('../Hostel Management/backend/src/routes/hostelRoutes');
  const complaintRoutes = require('../Hostel Management/backend/src/routes/complaintRoutes');
  const messRoutes = require('../Hostel Management/backend/src/routes/messRoutes');
  const feeRoutes = require('../Hostel Management/backend/src/routes/feeRoutes');
  const gatePassRoutes = require('../Hostel Management/backend/src/routes/gatePassRoutes');
  const leaveRoutes = require('../Hostel Management/backend/src/routes/leaveRoutes');
  const visitorRoutes = require('../Hostel Management/backend/src/routes/visitorRoutes');
  const noticeRoutes = require('../Hostel Management/backend/src/routes/noticeRoutes');
  const activityRoutes = require('../Hostel Management/backend/src/routes/activityRoutes');
  const reportRoutes = require('../Hostel Management/backend/src/routes/reportRoutes');
  const allocationRoutes = require('../Hostel Management/backend/src/routes/allocationRoutes');
  const maintenanceRoutes = require('../Hostel Management/backend/src/routes/maintenanceRoutes');
  const inspectionRoutes = require('../Hostel Management/backend/src/routes/inspectionRoutes');
  const operationsRoutes = require('../Hostel Management/backend/src/routes/operationsRoutes');
  const masterRoutes = require('../Hostel Management/backend/src/routes/masterRoutes');
  const cafeteriaRoutes = require('../Hostel Management/backend/src/routes/cafeteriaRoutes');
  const documentRoutes = require('../Hostel Management/backend/src/routes/documentRoutes');
  const hostelStudentRoutes = require('../Hostel Management/backend/src/routes/studentRoutes');
  const floorRoutes = require('../Hostel Management/backend/src/routes/floorRoutes');
  const roomRoutes = require('../Hostel Management/backend/src/routes/roomRoutes');
  const bedRoutes = require('../Hostel Management/backend/src/routes/bedRoutes');
  const attendanceRoutes = require('../Hostel Management/backend/src/routes/attendanceRoutes');
  const roomApplicationRoutes = require('../Hostel Management/backend/src/routes/roomApplicationRoutes');
  const userRoutes = require('../Hostel Management/backend/src/routes/userRoutes');

  app.use('/api/hostels', hostelRoutes);
  app.use('/api/floors', floorRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/beds', bedRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use('/api/mess', messRoutes);
  app.use('/api/fees', feeRoutes);
  app.use('/api/gate-passes', gatePassRoutes);
  app.use('/api/leaves', leaveRoutes);
  app.use('/api/visitors', visitorRoutes);
  app.use('/api/notices', noticeRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/allocations', allocationRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/inspections', inspectionRoutes);
  app.use('/api/operations', operationsRoutes);
  app.use('/api/master', masterRoutes);
  app.use('/api/data-integrity', masterRoutes);
  app.use('/api/cafeteria', cafeteriaRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/students', hostelStudentRoutes);
  app.use('/api/hostel-students', hostelStudentRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/room-applications', roomApplicationRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api', userRoutes);
  try {
    app.use('/api/dashboard', require('../Hostel Management/backend/src/routes/dashboardRoutes'));
  } catch (dErr) {}

  console.log('✅ [Module B] All Hostel Management routers mounted successfully.');
} catch (err) {
  console.warn('⚠️ [Module B Warning] Direct router mounting notice:', err.message);
}

// -------------------------------------------------------------
// 4. STATIC SERVING & SPA FALLBACKS FOR ORIGINAL MODULES
// -------------------------------------------------------------
const publicDir = path.join(__dirname, 'public');

// Module A: Attendance System
const attendanceDist = fs.existsSync(path.join(__dirname, '../BEC-ATTENDANCCE-SYSTEM/dist'))
  ? path.join(__dirname, '../BEC-ATTENDANCCE-SYSTEM/dist')
  : path.join(publicDir, 'modules/attendance');

app.use('/attendance', express.static(attendanceDist));

// SPA Fallback for Module A (blocks /login and /signup, redirects to doorway /)
app.get(['/attendance', '/attendance/*'], (req, res, next) => {
  if (req.path.includes('/login') || req.path.includes('/signup')) {
    return res.redirect('/');
  }
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(attendanceDist, 'index.html'));
});

// Module B: Hostel Management System
const hostelDist = fs.existsSync(path.join(__dirname, '../Hostel Management/frontend/dist'))
  ? path.join(__dirname, '../Hostel Management/frontend/dist')
  : path.join(publicDir, 'modules/hostel');

app.use('/hostel', express.static(hostelDist));

// SPA Fallback for Module B (Hostel Management) & Deep Links (/admin/*, /superintendent/*, /student/*, /profile)
app.get(['/hostel', '/hostel/*', '/admin/dashboard', '/admin/*', '/superintendent', '/superintendent/*', '/student/*', '/profile'], (req, res, next) => {
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(hostelDist, 'index.html'));
});

// Module C: Reporting System
const reportingClient = fs.existsSync(path.join(__dirname, '../BEC REPORTING APP/client'))
  ? path.join(__dirname, '../BEC REPORTING APP/client')
  : path.join(publicDir, 'modules/reporting');

app.use('/reporting', express.static(reportingClient));
app.use('/reporting/pages', express.static(path.join(reportingClient, 'pages')));
app.use('/reporting/css', express.static(path.join(reportingClient, 'css')));
app.use('/reporting/js', express.static(path.join(reportingClient, 'js')));
app.use('/reporting/assets', express.static(path.join(reportingClient, 'assets')));

// Default entry point for /reporting -> redirect to dashboard
app.get('/reporting', (req, res) => {
  res.redirect('/reporting/pages/dashboard.html');
});

// -------------------------------------------------------------
// 5. UNIFIED SHELL STATIC DELIVERY & CORE ROUTING
// -------------------------------------------------------------
app.use('/shell', express.static(path.join(publicDir, 'shell')));
app.use('/assets', express.static(path.join(publicDir, 'assets')));
app.use(express.static(publicDir));

// Student Doorway Page (Single Login Screen + Dashboard)
app.get(['/', '/dashboard'], (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Administrator Launcher Hub
app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'BEC Unified Digital Campus Portal',
    version: '1.0.0-PROD',
    timestamp: new Date().toISOString(),
    modules: {
      attendance: fs.existsSync(path.join(attendanceDist, 'index.html')) ? 'ACTIVE' : 'NOT_FOUND',
      hostel: fs.existsSync(path.join(hostelDist, 'index.html')) ? 'ACTIVE' : 'NOT_FOUND',
      reporting: fs.existsSync(path.join(reportingClient, 'index.html')) ? 'ACTIVE' : 'NOT_FOUND'
    }
  });
});

// Global Fallback for unknown /login or /signup
app.use((req, res, next) => {
  if (req.path === '/login' || req.path === '/signup') {
    return res.redirect('/');
  }
  next();
});

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`🚀 [BEC UNIFIED DIGITAL CAMPUS PORTAL RUNNING]`);
  console.log(`📍 Portal Doorway:    http://localhost:${PORT}`);
  console.log(`🛡️ Admin Launcher:    http://localhost:${PORT}/admin`);
  console.log(`📊 Attendance Module: http://localhost:${PORT}/attendance`);
  console.log(`🏢 Hostel Module:     http://localhost:${PORT}/hostel`);
  console.log(`📝 Reporting Module:  http://localhost:${PORT}/reporting`);
  console.log(`🔌 Health Telemetry:  http://localhost:${PORT}/api/health`);
  console.log(`=============================================================\n`);
});

module.exports = app;
