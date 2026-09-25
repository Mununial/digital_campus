const path = require('path');
const fs = require('fs');
const XLSX = require(path.resolve(__dirname, '../Hostel Management/frontend/node_modules/xlsx'));

const excelPath = 'C:/Users/munun/Downloads/COLLEGE ERP/BEC_Complete_Student_Report_2026-09-24.xlsx';
if (!fs.existsSync(excelPath)) {
  console.error('Excel file not found at:', excelPath);
  process.exit(1);
}

const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const excelRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

const studentFile = path.resolve(__dirname, '../BEC-ATTENDANCCE-SYSTEM/src/data/students1stYear.js');
const raw = fs.readFileSync(studentFile, 'utf8');
const jsonStr = raw.replace(/^export const FIRST_YEAR_STUDENTS =\s*/, '').replace(/;\s*$/, '');
const existing183 = JSON.parse(jsonStr);

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const mergedMap = new Map();
const existingNameMap = new Map();

existing183.forEach(s => {
  mergedMap.set(s.rollNo, { ...s });
  existingNameMap.set(norm(s.name), s.rollNo);
});

let maxRollNum = 183;
existing183.forEach(s => {
  const m = s.rollNo.match(/^BEC26(\d+)$/);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num > maxRollNum) maxRollNum = num;
  }
});

let matchedCount = 0;
let newCount = 0;

excelRows.forEach(r => {
  const name = String(r['Student Full Name'] || '').trim();
  if (!name) return;
  const nKey = norm(name);

  let targetRoll = existingNameMap.get(nKey);
  let studentObj;

  if (targetRoll && mergedMap.has(targetRoll)) {
    studentObj = mergedMap.get(targetRoll);
    matchedCount++;
  } else {
    maxRollNum++;
    targetRoll = 'BEC26' + String(maxRollNum).padStart(3, '0');
    newCount++;
    existingNameMap.set(nKey, targetRoll);

    let rawBranch = String(r['Branch / Stream'] || 'Computer Science Engineering').trim();
    let branch = 'CSE';
    const bLower = rawBranch.toLowerCase();
    if (bLower.includes('data science')) branch = 'Data Science';
    else if (bLower.includes('computer')) branch = 'CSE';
    else if (bLower.includes('civil')) branch = 'Civil';
    else if (bLower.includes('mechanical mecha')) branch = 'Mechatronics';
    else if (bLower.includes('mechanical')) branch = 'Mechanical';
    else if (bLower.includes('agriculture')) branch = 'Agriculture';
    else if (bLower.includes('aeronautical')) branch = 'Aeronautical';
    else if (bLower.includes('aircraft')) branch = 'AME';
    else if (bLower.includes('electrical')) branch = 'Electrical';
    else if (bLower.includes('food')) branch = 'Food Tech';
    else if (bLower.includes('finance') || bLower.includes('market') || bLower.includes('resource') || bLower.includes('business')) branch = 'MBA';

    const rawDob = String(r['DOB'] || '').trim();
    const cleanDob = /^\d{4}-\d{2}-\d{2}$/.test(rawDob) ? rawDob : '2006-01-01';

    studentObj = {
      uid: String(r['Student ID'] || '').trim() || ('stud_1y_' + targetRoll),
      name: name,
      email: (norm(name) || targetRoll.toLowerCase()) + '@bec.ac.in',
      password: cleanDob,
      dob: cleanDob,
      gender: String(r['Gender'] || 'Male').trim() === 'Female' ? 'Female' : 'Male',
      category: String(r['Category'] || 'General').trim(),
      branch: branch,
      rawBranch: rawBranch,
      year: '1st',
      section: maxRollNum % 2 === 0 ? 'A' : 'B',
      semester: '1',
      rollNo: targetRoll,
      tempId: targetRoll,
      regNo: String(r['Registration No'] || '').trim() === 'PENDING' ? '' : String(r['Registration No'] || '').trim(),
      role: 'student',
      status: 'approved',
      createdAt: r['Reporting Date'] && r['Reporting Date'] !== 'N/A' ? r['Reporting Date'] + 'T00:00:00.000Z' : new Date().toISOString()
    };
    mergedMap.set(targetRoll, studentObj);
  }

  // Update / Enrich with full fields from Excel
  if (r['Student ID'] && r['Student ID'] !== 'N/A') studentObj.uid = String(r['Student ID']).trim();
  if (r['Student Email'] && r['Student Email'] !== 'N/A') studentObj.personalEmail = String(r['Student Email']).trim();
  if (r['Student Mobile'] && r['Student Mobile'] !== 'N/A') {
    studentObj.phone = String(r['Student Mobile']).trim();
    studentObj.studentMobile = String(r['Student Mobile']).trim();
  }
  if (r['Student WhatsApp'] && r['Student WhatsApp'] !== 'N/A') studentObj.studentWhatsApp = String(r['Student WhatsApp']).trim();
  if (r['DOB'] && /^\d{4}-\d{2}-\d{2}$/.test(String(r['DOB']).trim())) {
    studentObj.dob = String(r['DOB']).trim();
    studentObj.password = String(r['DOB']).trim();
  }
  if (r['Gender'] && r['Gender'] !== 'N/A') {
    studentObj.gender = String(r['Gender']).trim().toLowerCase().startsWith('f') ? 'Female' : 'Male';
  }
  if (r['Category'] && r['Category'] !== 'N/A') studentObj.category = String(r['Category']).trim();
  if (r['Blood Group'] && r['Blood Group'] !== 'N/A') studentObj.bloodGroup = String(r['Blood Group']).trim();
  if (r['Aadhaar Number'] && r['Aadhaar Number'] !== 'N/A') studentObj.aadhaarNumber = String(r['Aadhaar Number']).trim();
  if (r['PAN Number'] && r['PAN Number'] !== 'N/A') studentObj.panNumber = String(r['PAN Number']).trim();
  if (r['ABC ID'] && r['ABC ID'] !== 'N/A') studentObj.abcId = String(r['ABC ID']).trim();
  if (r['Father Name'] && r['Father Name'] !== 'N/A') studentObj.fatherName = String(r['Father Name']).trim();
  if (r['Father Mobile'] && r['Father Mobile'] !== 'N/A') studentObj.fatherMobile = String(r['Father Mobile']).trim();
  if (r['Mother Name'] && r['Mother Name'] !== 'N/A') studentObj.motherName = String(r['Mother Name']).trim();
  if (r['Mother Mobile'] && r['Mother Mobile'] !== 'N/A') studentObj.motherMobile = String(r['Mother Mobile']).trim();
  if (r['Permanent Address'] && r['Permanent Address'] !== 'N/A') studentObj.permanentAddress = String(r['Permanent Address']).trim();
  if (r['District'] && r['District'] !== 'N/A') studentObj.district = String(r['District']).trim();
  if (r['State'] && r['State'] !== 'N/A') studentObj.state = String(r['State']).trim();
  if (r['Pin Code'] && r['Pin Code'] !== 'N/A') studentObj.pinCode = String(r['Pin Code']).trim();

  // Facilities
  studentObj.hostelRequired = String(r['Hostel Required'] || 'No').trim();
  studentObj.hostelNo = String(r['Hostel No'] || 'N/A').trim();
  studentObj.roomNo = String(r['Room No'] || 'N/A').trim();
  studentObj.transportRequired = String(r['Transport Required'] || 'No').trim();
  studentObj.pickupStoppage = String(r['Pickup Stoppage'] || 'N/A').trim();

  // Fees
  studentObj.tuitionFee = String(r['Tuition Fee (Rs)'] || '0').trim();
  studentObj.tuitionReceiptNo = String(r['Tuition Receipt No'] || '').trim();
  studentObj.tuitionReceiptDate = String(r['Tuition Receipt Date'] || '').trim();

  // Document URLs
  if (r['Student Photo URL'] && r['Student Photo URL'] !== 'N/A') studentObj.studentPhotoUrl = String(r['Student Photo URL']).trim();
  if (r['Student Signature URL'] && r['Student Signature URL'] !== 'N/A') studentObj.studentSignatureUrl = String(r['Student Signature URL']).trim();
  if (r['College Allotment Letter URL'] && r['College Allotment Letter URL'] !== 'N/A') studentObj.allotmentLetterUrl = String(r['College Allotment Letter URL']).trim();
  if (r['Fee Receipt URL'] && r['Fee Receipt URL'] !== 'N/A') studentObj.feeReceiptUrl = String(r['Fee Receipt URL']).trim();
  if (r['10th Marksheet URL'] && r['10th Marksheet URL'] !== 'N/A') studentObj.marksheet10thUrl = String(r['10th Marksheet URL']).trim();
  if (r['12th / Diploma Certificate URL'] && r['12th / Diploma Certificate URL'] !== 'N/A') studentObj.marksheet12thUrl = String(r['12th / Diploma Certificate URL']).trim();
  if (r['TC / CLC Certificate URL'] && r['TC / CLC Certificate URL'] !== 'N/A') studentObj.tcCertificateUrl = String(r['TC / CLC Certificate URL']).trim();
  if (r['Aadhaar Card Document URL'] && r['Aadhaar Card Document URL'] !== 'N/A') studentObj.aadhaarDocumentUrl = String(r['Aadhaar Card Document URL']).trim();
  if (r['Residence Certificate URL'] && r['Residence Certificate URL'] !== 'N/A') studentObj.residenceCertificateUrl = String(r['Residence Certificate URL']).trim();
});

const finalList = Array.from(mergedMap.values());

// Ensure sorted by roll number
finalList.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true, sensitivity: 'base' }));

console.log(`Successfully merged ${finalList.length} unique authentic students.`);
console.log(`Existing enriched: ${matchedCount}, New added: ${newCount}`);

// 1. Write updated students1stYear.js
const outJs = `export const FIRST_YEAR_STUDENTS = ${JSON.stringify(finalList, null, 2)};\n`;
fs.writeFileSync(studentFile, outJs, 'utf8');
console.log('✅ Updated:', studentFile);

// 2. Write master JSON to campus-portal/data
const portalDataDir = path.resolve(__dirname, '../campus-portal/data');
if (!fs.existsSync(portalDataDir)) fs.mkdirSync(portalDataDir, { recursive: true });
fs.writeFileSync(path.join(portalDataDir, 'studentsMaster.json'), JSON.stringify(finalList, null, 2), 'utf8');
console.log('✅ Created:', path.join(portalDataDir, 'studentsMaster.json'));

// 3. Write master JSON to BEC REPORTING APP
const repDataDir = path.resolve(__dirname, '../BEC REPORTING APP/repoting app data');
if (!fs.existsSync(repDataDir)) fs.mkdirSync(repDataDir, { recursive: true });
fs.writeFileSync(path.join(repDataDir, 'studentsMaster.json'), JSON.stringify(finalList, null, 2), 'utf8');
console.log('✅ Created:', path.join(repDataDir, 'studentsMaster.json'));
