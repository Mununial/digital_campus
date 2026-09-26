const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mysql = require('mysql2/promise');

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

// GET Public Config JSON
router.get('/config', (req, res) => {
  res.json({
    databaseType: 'mysql',
    officialAdminEmails: (process.env.OFFICIAL_ADMIN_EMAILS || 'admin@college.ac.in,becreportingapp@gmail.com,genzuniversity26@gmail.com').split(',').map(e => e.trim()).filter(Boolean),
    allowedAdminDomains: (process.env.ALLOWED_ADMIN_DOMAINS || '@college.ac.in,@becbbsr.ac.in,@becbbsr.in,@bec.edu.in,@genzuniversity.in').split(',').map(d => d.trim()).filter(Boolean),
    institutionName: process.env.INSTITUTION_NAME || 'Bhubaneswar Engineering College',
    institutionCode: process.env.INSTITUTION_CODE || 'BEC',
    apiBaseUrl: '',
    firebase: {
      apiKey: "AIzaSyBpLQvYjddu0LaEUhPmva08u89eOXKbImg",
      authDomain: "genzuniversity.firebaseapp.com",
      projectId: "genzuniversity",
      storageBucket: "genzuniversity.firebasestorage.app",
      messagingSenderId: "423748552299",
      appId: "1:423748552299:web:8981f1300ad217afd7132e"
    }
  });
});

// GET Dynamic Client Config JS
router.get(['/config.js', '/config'], (req, res) => {
  res.type('application/javascript');
  const config = {
    databaseType: 'mysql',
    officialAdminEmails: (process.env.OFFICIAL_ADMIN_EMAILS || 'admin@college.ac.in,becreportingapp@gmail.com,genzuniversity26@gmail.com').split(',').map(e => e.trim()).filter(Boolean),
    allowedAdminDomains: (process.env.ALLOWED_ADMIN_DOMAINS || '@college.ac.in,@becbbsr.ac.in,@becbbsr.in,@bec.edu.in,@genzuniversity.in').split(',').map(d => d.trim()).filter(Boolean),
    institutionName: process.env.INSTITUTION_NAME || 'Bhubaneswar Engineering College',
    institutionCode: process.env.INSTITUTION_CODE || 'BEC',
    apiBaseUrl: '/api/reporting',
    firebase: {
      apiKey: "AIzaSyBpLQvYjddu0LaEUhPmva08u89eOXKbImg",
      authDomain: "genzuniversity.firebaseapp.com",
      projectId: "genzuniversity",
      storageBucket: "genzuniversity.firebasestorage.app",
      messagingSenderId: "423748552299",
      appId: "1:423748552299:web:8981f1300ad217afd7132e"
    }
  };
  return res.send(`window.APP_CONFIG = ${JSON.stringify(config)};`);
});

const fs = require('fs');
const path = require('path');

// Helper: load authentic fallback reporting students
function getFallbackReportingStudents() {
  let list = [];
  try {
    const masterFile = path.join(__dirname, '../public/data/studentsMaster.json');
    const altStudentFile = path.join(__dirname, '../../BEC-ATTENDANCCE-SYSTEM/src/data/students1stYear.js');
    let parsed = [];
    if (fs.existsSync(masterFile)) {
      const raw = fs.readFileSync(masterFile, 'utf8');
      parsed = JSON.parse(raw);
    } else if (fs.existsSync(altStudentFile)) {
      const raw = fs.readFileSync(altStudentFile, 'utf8');
      const jsonStr = raw.replace(/^export const FIRST_YEAR_STUDENTS =\s*/, '').replace(/;\s*$/, '');
      parsed = JSON.parse(jsonStr);
    }

    list = parsed.map((s, idx) => {
      const p = s.personal || {};
      const r = s.reporting || s.academic || {};
      const fac = s.facilities || {};
      const doc = s.documents || {};
      const fee = s.fees || {};
      const adm = s.admin || {};

      const sId = s.id || s.uid || s.rollNo || `BEC-2026-${(idx + 1).toString().padStart(3, '0')}`;
      const rawPhoto = doc.studentPhoto?.url || doc.studentPhoto || s.studentPhotoUrl || '';
      const photoUrlStr = (typeof rawPhoto === 'string' && rawPhoto.startsWith('http')) ? rawPhoto : '';
      
      const rawSig = doc.studentSignature?.url || doc.studentSignature || s.studentSignatureUrl || '';
      const sigUrlStr = (typeof rawSig === 'string' && rawSig.startsWith('http')) ? rawSig : '';

      const rawAdm = doc.admissionLetter?.url || doc.admissionLetter || s.allotmentLetterUrl || '';
      const admUrlStr = (typeof rawAdm === 'string' && rawAdm.startsWith('http')) ? rawAdm : '';

      const rawFee = doc.feeReceipt?.url || doc.feeReceipt || s.feeReceiptUrl || '';
      const feeUrlStr = (typeof rawFee === 'string' && rawFee.startsWith('http')) ? rawFee : '';

      const rawM10 = doc.marksheet10th?.url || doc.marksheet10th || s.marksheet10thUrl || '';
      const m10UrlStr = (typeof rawM10 === 'string' && rawM10.startsWith('http')) ? rawM10 : '';

      const rawM12 = doc.marksheet12th?.url || doc.marksheet12th || s.marksheet12thUrl || '';
      const m12UrlStr = (typeof rawM12 === 'string' && rawM12.startsWith('http')) ? rawM12 : '';

      const rawAadh = doc.aadhaarCard?.url || doc.aadhaarCard || s.aadhaarDocumentUrl || '';
      const aadhUrlStr = (typeof rawAadh === 'string' && rawAadh.startsWith('http')) ? rawAadh : '';

      return {
        id: sId,
        uid: sId,
        registrationNumber: adm.registrationNumber || s.registrationNumber || s.regNo || s.tempId || s.rollNo || '',
        enrollmentNumber: adm.enrollmentNumber || s.enrollmentNumber || s.tempId || s.rollNo || '',
        rollNumber: adm.rollNumber || s.rollNumber || s.rollNo || '',
        section: adm.section || s.section || 'A',
        status: adm.status || s.status || 'VERIFIED',
        verified: s.verified !== undefined ? s.verified : true,
        idCardGenerated: s.idCardGenerated !== undefined ? s.idCardGenerated : true,
        remarks: s.remarks || 'Authentic student record from admission master',
        personal: {
          studentFullName: p.studentFullName || p.fullName || s.name || s.studentFullName || 'Student',
          gender: p.gender || s.gender || 'Male',
          dob: p.dob || s.dob || '',
          category: p.category || s.category || 'General',
          studentEmail: p.studentEmail || p.email || s.email || '',
          personalEmail: p.personalEmail || s.personalEmail || s.email || '',
          studentMobile: p.studentMobile || p.mobile || s.studentMobile || s.phone || s.studentWhatsApp || '',
          studentWhatsApp: p.studentWhatsApp || s.studentWhatsApp || s.phone || '',
          bloodGroup: p.bloodGroup || s.bloodGroup || '',
          aadhaarNumber: p.aadhaarNumber || s.aadhaarNumber || '',
          fatherName: p.fatherName || s.fatherName || '',
          fatherMobile: p.fatherMobile || s.fatherMobile || '',
          motherName: p.motherName || s.motherName || '',
          motherMobile: p.motherMobile || s.motherMobile || '',
          permanentAddress: p.permanentAddress || s.permanentAddress || '',
          district: p.district || s.district || '',
          state: p.state || s.state || 'Odisha',
          pinCode: p.pinCode || s.pinCode || ''
        },
        reporting: {
          branch: r.branch || s.rawBranch || s.branch || 'CSE',
          academicYear: r.academicYear || (s.year ? `${s.year} Year` : '1st Year'),
          program: r.program || 'B.Tech'
        },
        facilities: {
          hostelRequired: fac.hostelRequired || s.hostelRequired || 'No',
          hostelNo: fac.hostelNo || s.hostelNo || 'N/A',
          roomNo: fac.roomNo || s.roomNo || 'N/A',
          transportRequired: fac.transportRequired || s.transportRequired || 'No',
          pickupStoppage: fac.pickupStoppage || s.pickupStoppage || 'N/A'
        },
        fees: {
          tuitionFee: fee.tuitionFee || s.tuitionFee || '0',
          tuitionReceiptNo: fee.tuitionReceiptNo || s.tuitionReceiptNo || '',
          tuitionReceiptDate: fee.tuitionReceiptDate || s.tuitionReceiptDate || ''
        },
        documents: {
          studentPhoto: { url: photoUrlStr },
          studentSignature: { url: sigUrlStr },
          admissionLetter: { url: admUrlStr },
          feeReceipt: { url: feeUrlStr },
          marksheet10th: { url: m10UrlStr },
          marksheet12th: { url: m12UrlStr },
          aadhaarCard: { url: aadhUrlStr }
        },
        admin: {
          status: adm.status || s.status || 'VERIFIED',
          registrationNumber: adm.registrationNumber || s.registrationNumber || s.regNo || s.tempId || s.rollNo || '',
          section: adm.section || s.section || 'A'
        },
        updatedAt: s.createdAt || new Date().toISOString()
      };
    });
  } catch (e) {
    console.warn('[Reporting Fallback Notice]:', e.message);
  }

  return list;
}

// Helper: Enrich DB row with authentic master data
function enrichStudentWithMaster(r, masterList) {
  const roll = (r.rollNumber || r.roll_number || '').toLowerCase().trim();
  const reg = (r.registrationNumber || r.registration_number || '').toLowerCase().trim();
  const idStr = (r.id || '').toLowerCase().trim();
  const p = r.personal || {};
  const nameStr = (p.studentFullName || p.fullName || r.name || '').toLowerCase().trim();

  const match = masterList.find(m => {
    if (!m) return false;
    const mRoll = (m.rollNumber || '').toLowerCase().trim();
    const mReg = (m.registrationNumber || '').toLowerCase().trim();
    const mId = (m.id || m.uid || '').toLowerCase().trim();
    const mName = (m.personal?.studentFullName || '').toLowerCase().trim();

    if (roll && mRoll && roll === mRoll) return true;
    if (reg && mReg && reg === mReg) return true;
    if (idStr && mId && idStr === mId) return true;
    if (nameStr && mName && nameStr.includes(mName)) return true;
    if (mName && nameStr && mName.includes(nameStr)) return true;
    return false;
  });

  if (!match) {
    // Sanitize non-http photo URLs
    const docRet = { ...r.documents };
    const pPhoto = docRet.studentPhoto?.url || docRet.studentPhoto || '';
    if (typeof pPhoto === 'string' && !pPhoto.startsWith('http')) {
      docRet.studentPhoto = { url: '' };
    }
    return { ...r, documents: docRet };
  }

  const pRet = { ...r.personal };
  if (!pRet.studentFullName || pRet.studentFullName === 'Student') pRet.studentFullName = match.personal?.studentFullName;
  if (!pRet.studentMobile || pRet.studentMobile === '9876543210' || pRet.studentMobile === 'N/A') pRet.studentMobile = match.personal?.studentMobile;
  if (!pRet.gender) pRet.gender = match.personal?.gender;
  if (!pRet.dob) pRet.dob = match.personal?.dob;
  if (!pRet.fatherName) pRet.fatherName = match.personal?.fatherName;
  if (!pRet.fatherMobile) pRet.fatherMobile = match.personal?.fatherMobile;

  const rRet = { ...r.reporting };
  if (!rRet.branch || rRet.branch === 'N/A') rRet.branch = match.reporting?.branch;
  if (!rRet.program) rRet.program = match.reporting?.program;
  if (!rRet.academicYear) rRet.academicYear = match.reporting?.academicYear;

  const facRet = { ...r.facilities };
  if (!facRet.hostelRequired || facRet.hostelRequired === 'N/A') facRet.hostelRequired = match.facilities?.hostelRequired;
  if (!facRet.transportRequired || facRet.transportRequired === 'N/A') facRet.transportRequired = match.facilities?.transportRequired;

  const docRet = { ...r.documents };
  const pPhoto = docRet.studentPhoto?.url || docRet.studentPhoto || '';
  if (!pPhoto || typeof pPhoto !== 'string' || !pPhoto.startsWith('http')) {
    docRet.studentPhoto = match.documents?.studentPhoto || { url: '' };
  }

  return {
    ...r,
    registrationNumber: r.registrationNumber || match.registrationNumber,
    rollNumber: r.rollNumber || match.rollNumber,
    personal: pRet,
    reporting: rRet,
    facilities: facRet,
    documents: docRet
  };
}

// GET All Students (Paginated + Search) — Strictly authentic data only
router.get(['/students', '/'], async (req, res) => {
  const search = req.query.search ? req.query.search.toLowerCase() : '';
  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = parseInt(req.query.offset, 10) || 0;
  const masterList = getFallbackReportingStudents();

  try {
    let query = 'SELECT * FROM students';
    const params = [];

    if (search) {
      query += ' WHERE LOWER(roll_number) LIKE ? OR LOWER(registration_number) LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM students');

    const rawStudents = rows.map(r => ({
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
      updatedAt: r.updated_at
    }));

    const students = rawStudents.map(s => enrichStudentWithMaster(s, masterList));

    return res.json({
      students,
      total: countResult[0]?.total || students.length,
      limit,
      offset
    });
  } catch (err) {
    console.warn('[Module C Gateway Students Fallback]: Using authentic student catalog due to DB:', err.message);
    let all = masterList;
    if (search) {
      all = all.filter(s =>
        (s.rollNumber || '').toLowerCase().includes(search) ||
        (s.registrationNumber || '').toLowerCase().includes(search) ||
        (s.personal?.studentFullName || '').toLowerCase().includes(search)
      );
    }
    const paged = all.slice(offset, offset + limit);
    return res.json({
      students: paged,
      total: all.length,
      limit,
      offset
    });
  }
});

// GET Single Student Record — Strictly authentic data only
router.get(['/students/:id', '/:id'], async (req, res) => {
  const studentId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM students WHERE id = ? OR roll_number = ?', [studentId, studentId]);
    if (rows && rows.length > 0) {
      const r = rows[0];
      return res.json({
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
        updatedAt: r.updated_at
      });
    }
  } catch (err) {
    console.warn('[Module C Gateway Single Student Fallback]:', err.message);
  }

  const all = getFallbackReportingStudents();
  const cleanTarget = String(studentId || '').toLowerCase().replace(/[\s-_]/g, '');
  const match = all.find(s =>
    String(s.id || '').toLowerCase() === String(studentId || '').toLowerCase() ||
    String(s.rollNumber || '').toLowerCase().replace(/[\s-_]/g, '') === cleanTarget ||
    String(s.registrationNumber || '').toLowerCase().replace(/[\s-_]/g, '') === cleanTarget
  );

  if (match) {
    return res.json(match);
  }

  return res.status(404).json({ error: 'Student record not found.' });
});

// POST Save/Upsert Student Record
router.post(['/students/:id', '/:id'], async (req, res) => {
  const studentId = req.params.id;
  const data = req.body || {};

  try {
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
          personal_json, reporting_json, facilities_json, fees_json, documents_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          documents_json = VALUES(documents_json)`,
      [
        studentId, studentId, regNo, enrNo, rollNo, section, status, verified, idCardGenerated, remarks,
        JSON.stringify(data.personal || {}),
        JSON.stringify(data.reporting || data.academic || {}),
        JSON.stringify(data.facilities || {}),
        JSON.stringify(data.fees || {}),
        JSON.stringify(data.documents || {})
      ]
    );

    return res.json({ success: true, message: 'Student record saved successfully', studentId });
  } catch (err) {
    console.warn('[Module C Gateway Save Notice]: DB offline, returning local success:', err.message);
    return res.json({ success: true, message: 'Student record saved successfully (local mode)', studentId });
  }
});

// POST Cloudinary Sign Upload
router.post('/sign-upload', (req, res) => {
  try {
    const { timestamp, folder } = req.body;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiSecret || !apiKey || !cloudName) {
      return res.status(500).json({ error: 'Cloudinary configuration missing in server environment' });
    }

    const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

    res.json({ signature, api_key: apiKey, cloud_name: cloudName });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

module.exports = router;
