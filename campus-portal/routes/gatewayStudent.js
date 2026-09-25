const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { optionalAuth } = require('../middleware/authGateway');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'srv1334.hstgr.io',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'u847513759_ERP_COLLEGE',
  password: process.env.DB_PASSWORD || 'Ayushtech@26',
  database: process.env.DB_NAME || 'u847513759_ERP_COLLEGE',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

// Helper to fetch student record from Hostinger DB or authentic dataset
async function getStudentProfile(req) {
  const target = req.user?.username || req.user?.rollNo || req.user?.email || req.query?.rollNo || req.query?.id;

  try {
    let rows = [];
    if (target) {
      [rows] = await pool.query(
        'SELECT * FROM students WHERE roll_number = ? OR student_id = ? OR email = ? LIMIT 1',
        [target, target, target]
      );
    }
    if (!rows || rows.length === 0) {
      [rows] = await pool.query('SELECT * FROM students ORDER BY student_id ASC LIMIT 1');
    }

    if (rows && rows.length > 0) {
      const s = rows[0];
      const personal = typeof s.personal_json === 'string' ? JSON.parse(s.personal_json || '{}') : (s.personal_json || {});
      const documents = typeof s.documents_json === 'string' ? JSON.parse(s.documents_json || '{}') : (s.documents_json || {});

      return {
        fullName: s.full_name || personal.fullName || 'Student',
        rollNo: s.roll_number || s.student_id,
        email: s.email || personal.email,
        phone: s.phone || personal.fatherMobile || '+91 9876543210',
        dob: s.dob || personal.dob || '2006-01-01',
        bloodGroup: s.blood_group || personal.bloodGroup || 'B+',
        guardianName: s.father_name || personal.fatherName || 'Guardian',
        guardianPhone: personal.fatherMobile || s.phone || '+91 9876543210',
        address: s.permanent_address || personal.permanentAddress || `${s.district || 'Bhubaneswar'}, ${s.state || 'Odisha'}`,
        branch: s.branch || 'B.Tech',
        semester: `${s.semester || 1}st Semester`,
        status: s.status === 'ACTIVE' ? 'Active Student' : s.status,
        photoUrl: s.photo_url || documents.studentPhoto?.url || '',
        signatureUrl: s.signature_url || documents.studentSignature?.url || '',
        gender: s.gender || 'MALE',
        hostelRequired: s.hostel_required || 'No',
        tuitionFee: s.tuition_fee || '0',
        tuitionReceiptNo: s.tuition_receipt_no || 'N/A'
      };
    }
  } catch (err) {
    console.warn('[gatewayStudent DB notice]:', err.message);
  }

  // Fallback to 1st authentic student from students1stYear.js
  try {
    const filePath = path.join(__dirname, '../../BEC-ATTENDANCCE-SYSTEM/src/data/students1stYear.js');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const jsonStr = raw.replace(/^export const FIRST_YEAR_STUDENTS =\s*/, '').replace(/;\s*$/, '');
      const list = JSON.parse(jsonStr);
      const s = (target ? list.find(item => item.rollNo === target || item.email === target) : null) || list[0];
      if (s) {
        return {
          fullName: s.name,
          rollNo: s.rollNo,
          email: s.email,
          phone: s.phone || s.studentMobile || '+91 9876543210',
          dob: s.dob,
          bloodGroup: s.bloodGroup || 'B+',
          guardianName: s.fatherName || 'Guardian',
          guardianPhone: s.fatherMobile || '+91 9876543210',
          address: s.permanentAddress || `${s.district || 'Bhubaneswar'}, ${s.state || 'Odisha'}`,
          branch: s.rawBranch || s.branch,
          semester: `${s.semester || 1}st Semester`,
          status: 'Active Student',
          photoUrl: s.studentPhotoUrl || '',
          signatureUrl: s.studentSignatureUrl || '',
          gender: s.gender || 'Male',
          hostelRequired: s.hostelRequired || 'No',
          tuitionFee: s.tuitionFee || '0',
          tuitionReceiptNo: s.tuitionReceiptNo || 'N/A'
        };
      }
    }
  } catch (e) {
    console.warn('[gatewayStudent file notice]:', e.message);
  }

  return null;
}

// In-memory notices and service requests (dynamic)
let campusNotices = [
  {
    id: 1,
    title: "Odd Semester Academic Calendar 2026",
    category: "Academic",
    desc: "Commencement of classes and examination schedule published.",
    date: "25 Sep 2026",
    urgent: true
  },
  {
    id: 2,
    title: "Hostel Fee Payment & Room Verification",
    category: "Hostel",
    desc: "All hostel residents must verify their room allotment details on the portal.",
    date: "24 Sep 2026",
    urgent: false
  },
  {
    id: 3,
    title: "Central Library Extended Hours",
    category: "Academic",
    desc: "Library facilities are open until 10:00 PM on weekdays.",
    date: "22 Sep 2026",
    urgent: false
  }
];

let campusRequests = [];
let campusActivities = [
  {
    id: 1,
    type: "System",
    title: "Account profile synced",
    desc: "Admission and photo records verified with college ERP",
    time: "Today",
    icon: "check-circle"
  }
];

// GET Dashboard Aggregation
router.get('/dashboard', optionalAuth, async (req, res) => {
  const profile = await getStudentProfile(req);
  const tuition = parseInt(profile?.tuitionFee, 10) || 45000;
  const isFemale = (profile?.gender || '').toUpperCase() === 'FEMALE';

  res.status(200).json({
    success: true,
    data: {
      profile,
      stats: {
        hostel: {
          room: profile?.hostelRequired === 'Yes' ? 'Room 101' : 'Day Scholar',
          block: profile?.hostelRequired === 'Yes' ? 'Block A' : 'N/A',
          bed: profile?.hostelRequired === 'Yes' ? 'Bed 1' : 'N/A',
          hostelName: profile?.hostelRequired === 'Yes' ? (isFemale ? 'BEC Girls Hostel 1' : 'BEC Boys Hostel 1') : 'N/A'
        },
        attendance: {
          overall: 88.5,
          threshold: 75,
          isAboveLimit: true
        },
        library: {
          issuedBooksCount: 2,
          dueDays: 5
        },
        fees: {
          total: tuition,
          paid: tuition,
          pending: 0
        }
      },
      recentActivity: campusActivities.slice(0, 3)
    }
  });
});

// GET Profile Details
router.get('/profile', optionalAuth, async (req, res) => {
  const profile = await getStudentProfile(req);
  res.status(200).json({
    success: true,
    data: profile
  });
});

// GET Hostel Details
router.get('/hostel', optionalAuth, async (req, res) => {
  const profile = await getStudentProfile(req);
  const isFemale = (profile?.gender || '').toUpperCase() === 'FEMALE';

  res.status(200).json({
    success: true,
    data: {
      hostelInfo: {
        room: profile?.hostelRequired === 'Yes' ? 'Room 101' : 'Day Scholar',
        block: profile?.hostelRequired === 'Yes' ? 'Block A' : 'N/A',
        bed: profile?.hostelRequired === 'Yes' ? 'Bed 1' : 'N/A',
        hostelName: profile?.hostelRequired === 'Yes' ? (isFemale ? 'BEC Girls Hostel 1' : 'BEC Boys Hostel 1') : 'N/A'
      },
      roommates: []
    }
  });
});

// GET Attendance Details
router.get('/attendance', optionalAuth, async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      overall: { overall: 88.5, threshold: 75, isAboveLimit: true },
      subjects: [
        { name: "Engineering Mathematics", code: "BS101", percentage: 92, attended: 23, total: 25 },
        { name: "Basic Electrical Engineering", code: "ES101", percentage: 85, attended: 22, total: 26 },
        { name: "Programming for Problem Solving", code: "ES102", percentage: 90, attended: 27, total: 30 },
        { name: "Engineering Physics", code: "BS102", percentage: 87, attended: 20, total: 23 }
      ]
    }
  });
});

// GET Fees Details
router.get('/fees', optionalAuth, async (req, res) => {
  const profile = await getStudentProfile(req);
  const fee = parseInt(profile?.tuitionFee, 10) || 45000;
  res.status(200).json({
    success: true,
    data: {
      total: fee,
      paid: fee,
      pending: 0,
      receiptNo: profile?.tuitionReceiptNo || 'N/A'
    }
  });
});

// GET Notices
router.get('/notices', optionalAuth, (req, res) => {
  const category = req.query.category;
  let list = campusNotices;
  if (category && category.toLowerCase() !== 'all') {
    list = list.filter(n => n.category.toLowerCase() === category.toLowerCase());
  }
  res.status(200).json({
    success: true,
    data: list
  });
});

// GET Service Requests
router.get('/requests', optionalAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: campusRequests
  });
});

// POST Create New Service Request
router.post('/requests', optionalAuth, async (req, res) => {
  const { title, description, category } = req.body;
  const profile = await getStudentProfile(req);

  const newReq = {
    id: `REQ-${Date.now().toString().slice(-6)}`,
    title: title || 'Campus Service Request',
    student: profile?.fullName || 'Student',
    rollNo: profile?.rollNo || '',
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    status: 'Pending',
    category: category || 'General',
    description: description || ''
  };

  campusRequests.unshift(newReq);
  campusActivities.unshift({
    id: Date.now(),
    type: 'Requests',
    title: `New request submitted: ${title}`,
    desc: description || 'Under review by administration',
    time: 'Just now',
    icon: 'wrench'
  });

  res.status(201).json({
    success: true,
    message: 'Service request submitted successfully',
    data: newReq
  });
});

// GET Activity
router.get('/activity', optionalAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: campusActivities
  });
});

module.exports = router;
