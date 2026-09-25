const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const db = require('./config/db');

// Import routes
const healthRoutes = require('./routes/healthRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const floorRoutes = require('./routes/floorRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bedRoutes = require('./routes/bedRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://bechostels.web.app',
  'https://bechostels.firebaseapp.com'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or in development
    if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`CORS Error: Origin ${origin} is not allowed`));
    }
  },
  credentials: true
}));

// Body parsing & Cookie parsing middleware (allow photo uploads up to 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(cookieParser());

// Test DB Connection on startup
db.testConnection().then((connected) => {
  if (!connected) {
    console.warn('\x1b[33m%s\x1b[0m', 'Warning: Server started but database is offline/unreachable.');
  }
});

const noticeRoutes = require('./routes/noticeRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const reportRoutes = require('./routes/reportRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const userRoutes = require('./routes/userRoutes');
const activityRoutes = require('./routes/activityRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const inspectionRoutes = require('./routes/inspectionRoutes');
const operationsRoutes = require('./routes/operationsRoutes');
const masterRoutes = require('./routes/masterRoutes');
const messRoutes = require('./routes/messRoutes');
const feeRoutes = require('./routes/feeRoutes');
const gatePassRoutes = require('./routes/gatePassRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const roomApplicationRoutes = require('./routes/roomApplicationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const cafeteriaRoutes = require('./routes/cafeteriaRoutes');

// Mounting API Routes
app.use('/api/health', healthRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notices', noticeRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/gate-passes', gatePassRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/room-applications', roomApplicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/cafeteria', cafeteriaRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/data-integrity', masterRoutes);
app.use('/api', userRoutes);


// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'College Hostel Management System API Server Running',
    version: '1.0.0',
    status: 'RUNNING',
    database: 'Hostinger Production MySQL',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      students: '/api/students',
      hostels: '/api/hostels'
    }
  });
});

// Base route for API documentation / welcome
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the College Hostel Management System API',
    version: '1.0.0',
    status: 'ACTIVE'
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('\x1b[31m%s\x1b[0m', 'Express global error handler caught error:');
  console.error(err.stack || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: (env.NODE_ENV === 'development' || env.NODE_ENV === 'test' || statusCode < 500) ? message : 'An unexpected error occurred.',
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Handle 404 Route Not Found
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.originalUrl}`
  });
});

// Start listening if run directly
if (require.main === module) {
  const server = app.listen(env.PORT, () => {
    console.log(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`Health endpoint available at http://localhost:${env.PORT}/api/health`);
    console.log(`Hostels endpoint available at http://localhost:${env.PORT}/api/hostels`);
    console.log(`Auth endpoints mounted at http://localhost:${env.PORT}/api/auth`);
    console.log(`Students endpoints mounted at http://localhost:${env.PORT}/api/students`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[31mPort ${env.PORT} is already in use by another process. Exiting process...\x1b[0m`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });

  // Graceful shutdown on signals
  const gracefulShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.once('SIGUSR2', gracefulShutdown);
  process.once('SIGINT', gracefulShutdown);
  process.once('SIGTERM', gracefulShutdown);
}

module.exports = app;
