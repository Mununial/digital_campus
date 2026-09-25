const fs = require('fs');
const path = require('path');

const studentFile = path.join(__dirname, '../BEC-ATTENDANCCE-SYSTEM/src/data/students1stYear.js');
const raw = fs.readFileSync(studentFile, 'utf8');
const jsonStr = raw.replace(/^export const FIRST_YEAR_STUDENTS =\s*/, '').replace(/;\s*$/, '');
const students = JSON.parse(jsonStr);

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

let sql = `-- ==============================================================================
-- DATABASE: u847513759_ERP_COLLEGE
-- Generated for Hostinger MySQL / phpMyAdmin Direct Import
-- Compatible with MySQL 5.7 / 8.0+
-- Contains All Schema Tables + 352 Authentic Student Records + Super Admin Accounts
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+05:30";

-- -------------------------------------------------------------
-- 1. BASE ROLES TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`roles\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(50) NOT NULL UNIQUE,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO \`roles\` (\`id\`, \`name\`) VALUES
(1, 'SUPER_ADMIN'),
(2, 'SUPERINTENDENT'),
(3, 'STUDENT');

-- -------------------------------------------------------------
-- 2. UNIFIED USERS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`role_id\` INT DEFAULT 3,
    \`username\` VARCHAR(100) NOT NULL UNIQUE,
    \`email\` VARCHAR(150) NOT NULL UNIQUE,
    \`full_name\` VARCHAR(150) DEFAULT NULL,
    \`display_name\` VARCHAR(150) DEFAULT NULL,
    \`gender\` ENUM('MALE', 'FEMALE', 'OTHER') DEFAULT NULL,
    \`phone\` VARCHAR(25) DEFAULT NULL,
    \`photo_url\` TEXT DEFAULT NULL,
    \`password_hash\` VARCHAR(255) NOT NULL,
    \`role\` VARCHAR(50) DEFAULT 'student',
    \`user_role\` VARCHAR(50) DEFAULT 'student',
    \`is_admin\` TINYINT(1) DEFAULT 0,
    \`is_blocked\` TINYINT(1) DEFAULT 0,
    \`status\` VARCHAR(50) DEFAULT 'ACTIVE',
    \`must_change_password\` TINYINT(1) DEFAULT 0,
    \`last_login\` DATETIME DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY \`idx_users_role_id\` (\`role_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin & Staff Users
INSERT INTO \`users\` (\`id\`, \`role_id\`, \`username\`, \`email\`, \`full_name\`, \`display_name\`, \`gender\`, \`phone\`, \`password_hash\`, \`role\`, \`user_role\`, \`is_admin\`, \`status\`)
VALUES
(1, 1, 'admin', 'admin@bec.ac.in', 'BEC System Administrator', 'BEC Admin', 'MALE', '9876543210', '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', 'admin', 'ADMIN', 1, 'ACTIVE'),
(2, 1, 'genzuniversity26', 'genzuniversity26@gmail.com', 'GenZ University Super Admin', 'GenZ Admin', 'FEMALE', '9876543211', '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', 'admin', 'SUPER_ADMIN', 1, 'ACTIVE'),
(3, 2, 'teacher', 'teacher@bec.ac.in', 'Dr. Rajesh Sharma', 'Dr. Rajesh Sharma', 'MALE', '9876543212', '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', 'faculty', 'SUPERINTENDENT', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE \`email\` = VALUES(\`email\`), \`full_name\` = VALUES(\`full_name\`);

-- -------------------------------------------------------------
-- 3. REPORTING & MASTER STUDENTS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`students\` (
    \`id\` VARCHAR(100) PRIMARY KEY,
    \`user_id\` INT DEFAULT NULL,
    \`student_id\` VARCHAR(100) DEFAULT NULL,
    \`registration_number\` VARCHAR(100) DEFAULT NULL,
    \`enrollment_number\` VARCHAR(100) DEFAULT NULL,
    \`roll_number\` VARCHAR(100) DEFAULT NULL,
    \`full_name\` VARCHAR(150) DEFAULT NULL,
    \`email\` VARCHAR(150) DEFAULT NULL,
    \`phone\` VARCHAR(25) DEFAULT NULL,
    \`gender\` VARCHAR(20) DEFAULT NULL,
    \`category\` VARCHAR(50) DEFAULT NULL,
    \`branch\` VARCHAR(100) DEFAULT NULL,
    \`course\` VARCHAR(50) DEFAULT 'B.Tech',
    \`year\` INT DEFAULT 1,
    \`section\` VARCHAR(20) DEFAULT 'A',
    \`semester\` INT DEFAULT 1,
    \`dob\` VARCHAR(30) DEFAULT NULL,
    \`blood_group\` VARCHAR(10) DEFAULT NULL,
    \`father_name\` VARCHAR(150) DEFAULT NULL,
    \`mother_name\` VARCHAR(150) DEFAULT NULL,
    \`permanent_address\` TEXT DEFAULT NULL,
    \`district\` VARCHAR(100) DEFAULT NULL,
    \`state\` VARCHAR(100) DEFAULT NULL,
    \`pincode\` VARCHAR(20) DEFAULT NULL,
    \`photo_url\` TEXT DEFAULT NULL,
    \`signature_url\` TEXT DEFAULT NULL,
    \`allotment_letter_url\` TEXT DEFAULT NULL,
    \`fee_receipt_url\` TEXT DEFAULT NULL,
    \`marksheet_10th_url\` TEXT DEFAULT NULL,
    \`marksheet_12th_url\` TEXT DEFAULT NULL,
    \`tc_certificate_url\` TEXT DEFAULT NULL,
    \`aadhaar_doc_url\` TEXT DEFAULT NULL,
    \`residence_cert_url\` TEXT DEFAULT NULL,
    \`tuition_fee\` VARCHAR(50) DEFAULT NULL,
    \`tuition_receipt_no\` VARCHAR(100) DEFAULT NULL,
    \`tuition_receipt_date\` VARCHAR(50) DEFAULT NULL,
    \`hostel_required\` VARCHAR(20) DEFAULT 'No',
    \`hostel_id\` INT DEFAULT NULL,
    \`bed_id\` INT DEFAULT NULL,
    \`status\` VARCHAR(50) DEFAULT 'ACTIVE',
    \`verified\` TINYINT(1) DEFAULT 1,
    \`id_card_generated\` TINYINT(1) DEFAULT 1,
    \`personal_json\` JSON DEFAULT NULL,
    \`reporting_json\` JSON DEFAULT NULL,
    \`documents_json\` JSON DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY \`idx_student_roll\` (\`roll_number\`),
    KEY \`idx_student_email\` (\`email\`),
    KEY \`idx_student_branch\` (\`branch\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. HOSTELS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`hostels\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`name\` VARCHAR(100) NOT NULL UNIQUE,
    \`code\` VARCHAR(10) NOT NULL UNIQUE,
    \`gender\` ENUM('MALE', 'FEMALE', 'COED') NOT NULL,
    \`location\` VARCHAR(255) NOT NULL,
    \`capacity\` INT DEFAULT 200,
    \`status\` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO \`hostels\` (\`id\`, \`name\`, \`code\`, \`gender\`, \`location\`, \`capacity\`) VALUES
(1, 'BEC Boys Hostel Block-A', 'BH-A', 'MALE', 'West Campus', 250),
(2, 'BEC Girls Hostel Block-B', 'GH-B', 'FEMALE', 'East Campus', 200);

-- -------------------------------------------------------------
-- 5. ADMINS & AUDIT LOGS TABLES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`admins\` (
    \`id\` VARCHAR(100) PRIMARY KEY,
    \`email\` VARCHAR(255) NOT NULL UNIQUE,
    \`display_name\` VARCHAR(255),
    \`role\` VARCHAR(50) DEFAULT 'admin',
    \`status\` VARCHAR(50) DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`admins\` (\`id\`, \`email\`, \`display_name\`, \`role\`, \`status\`) VALUES
('adm_01', 'admin@bec.ac.in', 'BEC Administrator', 'admin', 'active'),
('adm_02', 'genzuniversity26@gmail.com', 'GenZ University Super Admin', 'admin', 'active')
ON DUPLICATE KEY UPDATE \`email\` = VALUES(\`email\`);

CREATE TABLE IF NOT EXISTS \`audit_logs\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`action\` VARCHAR(100) NOT NULL,
    \`user_id\` VARCHAR(100),
    \`email\` VARCHAR(255),
    \`role\` VARCHAR(50),
    \`ip_address\` VARCHAR(100),
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
\n`;

// Populate users and students
sql += `-- =============================================================\n`;
sql += `-- INSERTING 352 AUTHENTIC STUDENT RECORDS INTO USERS & STUDENTS\n`;
sql += `-- =============================================================\n\n`;

const defaultPassHash = '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe'; // demo123

students.forEach((s, idx) => {
  const userId = 100 + idx;
  const username = s.rollNo || s.tempId || `stud_${idx+1}`;
  const email = (s.email || `${username.toLowerCase()}@bec.ac.in`).trim();
  const fullName = s.name || 'Student';
  const gender = String(s.gender || 'Female').toUpperCase().startsWith('F') ? 'FEMALE' : 'MALE';
  const phone = s.phone || s.studentMobile || '9876543210';
  const photoUrl = s.studentPhotoUrl || '';
  
  // User row
  sql += `INSERT INTO \`users\` (\`id\`, \`role_id\`, \`username\`, \`email\`, \`full_name\`, \`display_name\`, \`gender\`, \`phone\`, \`photo_url\`, \`password_hash\`, \`role\`, \`user_role\`, \`is_admin\`, \`status\`) VALUES (${userId}, 3, ${escapeSql(username)}, ${escapeSql(email)}, ${escapeSql(fullName)}, ${escapeSql(fullName)}, '${gender}', ${escapeSql(phone)}, ${escapeSql(photoUrl)}, '${defaultPassHash}', 'student', 'STUDENT', 0, 'ACTIVE') ON DUPLICATE KEY UPDATE \`full_name\` = VALUES(\`full_name\`), \`photo_url\` = VALUES(\`photo_url\`);\n`;

  // Student row
  const studentId = s.uid || `stud_${idx+1}`;
  const rollNo = s.rollNo || s.tempId || '';
  const regNo = s.regNo || '';
  const branch = s.branch || 'CSE';
  const section = s.section || 'A';
  const year = parseInt(s.year, 10) || 1;
  const sem = parseInt(s.semester, 10) || 1;
  const dob = s.dob || '';
  const category = s.category || 'General';
  const bloodGroup = s.bloodGroup || '';
  const fatherName = s.fatherName || '';
  const motherName = s.motherName || '';
  const address = s.permanentAddress || '';
  const district = s.district || '';
  const state = s.state || '';
  const pinCode = s.pinCode || '';
  const tuitionFee = s.tuitionFee || '';
  const tuitionReceiptNo = s.tuitionReceiptNo || '';
  const tuitionReceiptDate = s.tuitionReceiptDate || '';
  const hostelReq = s.hostelRequired || 'No';

  const sigUrl = s.studentSignatureUrl || '';
  const allotUrl = s.allotmentLetterUrl || '';
  const feeUrl = s.feeReceiptUrl || '';
  const m10Url = s.marksheet10thUrl || '';
  const m12Url = s.marksheet12thUrl || '';
  const tcUrl = s.tcCertificateUrl || '';
  const aadhaarUrl = s.aadhaarDocumentUrl || '';
  const resUrl = s.residenceCertificateUrl || '';

  const personalJson = JSON.stringify({
    fullName,
    dob,
    gender,
    category,
    bloodGroup,
    fatherName,
    motherName,
    fatherMobile: s.fatherMobile || '',
    motherMobile: s.motherMobile || '',
    permanentAddress: address,
    district,
    state,
    pinCode
  });

  const docsJson = JSON.stringify({
    studentPhoto: { url: photoUrl },
    studentSignature: { url: sigUrl },
    admissionLetter: { url: allotUrl },
    feeReceipt: { url: feeUrl },
    certificate10th: { url: m10Url },
    certificate12th: { url: m12Url },
    tcMigration: { url: tcUrl },
    aadhaarCard: { url: aadhaarUrl },
    residenceCertificate: { url: resUrl }
  });

  sql += `INSERT INTO \`students\` (\`id\`, \`user_id\`, \`student_id\`, \`registration_number\`, \`enrollment_number\`, \`roll_number\`, \`full_name\`, \`email\`, \`phone\`, \`gender\`, \`category\`, \`branch\`, \`course\`, \`year\`, \`section\`, \`semester\`, \`dob\`, \`blood_group\`, \`father_name\`, \`mother_name\`, \`permanent_address\`, \`district\`, \`state\`, \`pincode\`, \`photo_url\`, \`signature_url\`, \`allotment_letter_url\`, \`fee_receipt_url\`, \`marksheet_10th_url\`, \`marksheet_12th_url\`, \`tc_certificate_url\`, \`aadhaar_doc_url\`, \`residence_cert_url\`, \`tuition_fee\`, \`tuition_receipt_no\`, \`tuition_receipt_date\`, \`hostel_required\`, \`status\`, \`verified\`, \`id_card_generated\`, \`personal_json\`, \`documents_json\`) VALUES (${escapeSql(studentId)}, ${userId}, ${escapeSql(rollNo)}, ${escapeSql(regNo)}, ${escapeSql(rollNo)}, ${escapeSql(rollNo)}, ${escapeSql(fullName)}, ${escapeSql(email)}, ${escapeSql(phone)}, '${gender}', ${escapeSql(category)}, ${escapeSql(branch)}, 'B.Tech', ${year}, ${escapeSql(section)}, ${sem}, ${escapeSql(dob)}, ${escapeSql(bloodGroup)}, ${escapeSql(fatherName)}, ${escapeSql(motherName)}, ${escapeSql(address)}, ${escapeSql(district)}, ${escapeSql(state)}, ${escapeSql(pinCode)}, ${escapeSql(photoUrl)}, ${escapeSql(sigUrl)}, ${escapeSql(allotUrl)}, ${escapeSql(feeUrl)}, ${escapeSql(m10Url)}, ${escapeSql(m12Url)}, ${escapeSql(tcUrl)}, ${escapeSql(aadhaarUrl)}, ${escapeSql(resUrl)}, ${escapeSql(tuitionFee)}, ${escapeSql(tuitionReceiptNo)}, ${escapeSql(tuitionReceiptDate)}, ${escapeSql(hostelReq)}, 'ACTIVE', 1, 1, ${escapeSql(personalJson)}, ${escapeSql(docsJson)}) ON DUPLICATE KEY UPDATE \`full_name\` = VALUES(\`full_name\`), \`photo_url\` = VALUES(\`photo_url\`);\n\n`;
});

sql += `SET FOREIGN_KEY_CHECKS = 1;\n-- Completed successfully!\n`;

const outPath1 = path.join(__dirname, '../../u847513759_ERP_COLLEGE_COMPLETE_IMPORT.sql');
const outPath2 = path.join(__dirname, '../u847513759_ERP_COLLEGE_COMPLETE_IMPORT.sql');
fs.writeFileSync(outPath1, sql, 'utf8');
fs.writeFileSync(outPath2, sql, 'utf8');

console.log(`Generated ${students.length} student records into SQL file:`);
console.log(`1. ${outPath1} (${(sql.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`2. ${outPath2} (${(sql.length / 1024 / 1024).toFixed(2)} MB)`);
