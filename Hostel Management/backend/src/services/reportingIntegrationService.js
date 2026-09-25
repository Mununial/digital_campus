const path = require('path');
const fs = require('fs');
const db = require('../config/db');

/**
 * Normalizes any gender variation into standardized uppercase: 'MALE', 'FEMALE', or 'OTHER'
 */
function normalizeGender(raw) {
  if (!raw) return 'MALE';
  const s = String(raw).trim().toUpperCase();
  if (s.startsWith('F') || s.includes('GIRL') || s.includes('WOMAN')) {
    return 'FEMALE';
  }
  if (s.startsWith('M') || s.includes('BOY') || s.includes('MAN')) {
    return 'MALE';
  }
  if (s.includes('OTHER')) {
    return 'OTHER';
  }
  return 'MALE';
}

/**
 * Reads Master Student Catalog from Reporting module
 */
function getReportingMasterList() {
  const masterList = [];

  // 1. Module A / Reporting 183 authentic admitted student master
  try {
    const studentFile = path.join(__dirname, '../../../../BEC-ATTENDANCCE-SYSTEM/src/data/students1stYear.js');
    if (fs.existsSync(studentFile)) {
      const raw = fs.readFileSync(studentFile, 'utf8');
      const jsonStr = raw.replace(/^export const FIRST_YEAR_STUDENTS =\s*/, '').replace(/;\s*$/, '');
      const parsed = JSON.parse(jsonStr);
      parsed.forEach(s => {
        masterList.push({
          id: s.uid || s.rollNo,
          student_id: s.regNo || s.tempId || s.rollNo,
          roll_number: s.rollNo,
          full_name: s.name,
          gender: s.gender || 'Male',
          normalized_gender: normalizeGender(s.gender || 'Male'),
          branch: s.rawBranch || s.branch || 'CSE',
          course: 'B.Tech',
          year: parseInt(s.year, 10) || 1,
          semester: parseInt(s.semester, 10) || 1,
          email: s.email || `${(s.rollNo || '').toLowerCase()}@becbbsr.ac.in`,
          phone: s.phone || '9876543210',
          status: 'ACTIVE'
        });
      });
    }
  } catch (err) {
    console.warn('[ReportingIntegrationService Warning]: Failed reading students1stYear:', err.message);
  }

  // 2. Reporting Core Seed Students (Rahul, Priya, Swati, Rohan, Ankit)
  const coreSeeds = [
    { roll_number: '26CSE01', full_name: 'Rahul Sharma', gender: 'Male', branch: 'Computer Science & Engineering', year: 1, email: 'rahul.sharma@gmail.com', phone: '9876543210' },
    { roll_number: '26CSE02', full_name: 'Priya Dash', gender: 'Female', branch: 'Computer Science & Engineering', year: 1, email: 'priya.dash@gmail.com', phone: '9876543211' },
    { roll_number: '26CSE03', full_name: 'Ankit Mohanty', gender: 'Male', branch: 'Computer Science & Engineering', year: 1, email: 'ankit.mohanty@gmail.com', phone: '9876543212' },
    { roll_number: '26CSE04', full_name: 'Swati Behera', gender: 'Female', branch: 'Computer Science & Engineering', year: 1, email: 'swati.behera@gmail.com', phone: '9876543213' },
    { roll_number: '26CSE05', full_name: 'Rohan Kumar Nayak', gender: 'Male', branch: 'Computer Science & Engineering', year: 1, email: 'rohan.nayak@gmail.com', phone: '9876543214' },
    { roll_number: 'CSE-2026-089', full_name: 'John Doe', gender: 'Male', branch: 'Computer Science', year: 3, email: 'student@hostel.com', phone: '9876543210' },
    { roll_number: 'CSE-2026-090', full_name: 'Jane Smith', gender: 'Female', branch: 'Computer Science', year: 3, email: 'student2@hostel.com', phone: '9876543211' }
  ];

  coreSeeds.forEach(seed => {
    const existing = masterList.find(s => s.roll_number.toLowerCase() === seed.roll_number.toLowerCase());
    if (!existing) {
      masterList.push({
        id: seed.roll_number,
        student_id: seed.roll_number,
        roll_number: seed.roll_number,
        full_name: seed.full_name,
        gender: seed.gender,
        normalized_gender: normalizeGender(seed.gender),
        branch: seed.branch,
        course: 'B.Tech',
        year: seed.year,
        semester: seed.year * 2 - 1,
        email: seed.email,
        phone: seed.phone,
        status: 'ACTIVE'
      });
    }
  });

  return masterList;
}

/**
 * Finds a student by roll number from Reporting master records
 */
function findReportingStudentByRoll(rollNumber) {
  if (!rollNumber) return null;
  const list = getReportingMasterList();
  const clean = String(rollNumber).trim().toLowerCase().replace(/[\s-_]/g, '');
  return list.find(s => {
    const sRoll = String(s.roll_number || '').trim().toLowerCase().replace(/[\s-_]/g, '');
    const sId = String(s.id || '').trim().toLowerCase().replace(/[\s-_]/g, '');
    const sStudentId = String(s.student_id || '').trim().toLowerCase().replace(/[\s-_]/g, '');
    return sRoll === clean || sId === clean || sStudentId === clean;
  }) || null;
}

/**
 * Ensures student exists in Hostel's students table (JIT Sync).
 * Maintains foreign key relationships for student_allocations, complaints, etc.
 * Returns the local Hostel student object with id, bed_id, roll_number, gender, etc.
 */
async function syncReportingStudentToHostel(reportingStudent, txConnection = null) {
  const conn = txConnection || db.pool;
  const cleanRoll = reportingStudent.roll_number.trim();
  const cleanName = reportingStudent.full_name.trim();
  const normGender = normalizeGender(reportingStudent.gender);
  const cleanEmail = reportingStudent.email || `${cleanRoll.toLowerCase()}@becbbsr.ac.in`;
  const cleanPhone = reportingStudent.phone || '9876543210';
  const cleanBranch = reportingStudent.branch || 'Engineering';
  const cleanCourse = reportingStudent.course || 'B.Tech';
  const yearNum = reportingStudent.year || 1;
  const semNum = reportingStudent.semester || 1;

  // 1. Check if student already exists in Hostel DB by roll_number or email
  const [existingRows] = await conn.query(
    'SELECT s.*, u.gender as user_gender FROM students s JOIN users u ON s.user_id = u.id WHERE s.roll_number = ? OR s.email = ?',
    [cleanRoll, cleanEmail]
  );

  if (existingRows && existingRows.length > 0) {
    const matched = existingRows[0];
    matched.gender = matched.user_gender || normGender;
    matched.normalized_gender = normGender;
    return matched;
  }

  // 2. Student does not exist in Hostel DB yet: insert user & student
  let userId;
  const [userMatch] = await conn.query(
    'SELECT id FROM users WHERE username = ? OR email = ?',
    [cleanRoll, cleanEmail]
  );

  if (userMatch && userMatch.length > 0) {
    userId = userMatch[0].id;
  } else {
    // Default password hash for 'password123'
    const defaultHash = '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe';
    const [uRes] = await conn.query(
      `INSERT INTO users (role_id, username, email, full_name, gender, phone, password_hash, status)
       VALUES (3, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [cleanRoll, cleanEmail, cleanName, normGender, cleanPhone, defaultHash]
    );
    userId = uRes.insertId || Date.now();
  }

  const [sRes] = await conn.query(
    `INSERT INTO students (
      user_id, student_id, roll_number, full_name, phone, email, branch, course, year, semester, admission_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'ACTIVE')`,
    [
      userId,
      reportingStudent.student_id || cleanRoll,
      cleanRoll,
      cleanName,
      cleanPhone,
      cleanEmail,
      cleanBranch,
      cleanCourse,
      yearNum,
      semNum
    ]
  );

  const localStudentId = sRes.insertId || Date.now();

  return {
    id: localStudentId,
    user_id: userId,
    student_id: reportingStudent.student_id || cleanRoll,
    roll_number: cleanRoll,
    full_name: cleanName,
    gender: normGender,
    normalized_gender: normGender,
    branch: cleanBranch,
    year: yearNum,
    bed_id: null,
    status: 'ACTIVE'
  };
}

module.exports = {
  normalizeGender,
  getReportingMasterList,
  findReportingStudentByRoll,
  syncReportingStudentToHostel
};
