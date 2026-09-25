const mysql = require('../campus-portal/node_modules/mysql2/promise');
const path = require('path');
require('../campus-portal/node_modules/dotenv').config({ path: path.join(__dirname, '../campus-portal/.env') });

async function analyze() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [genderCounts] = await conn.query("SELECT gender, COUNT(id) as count FROM students WHERE hostel_required = 'Yes' GROUP BY gender");
  console.log('--- HOSTELLERS BY GENDER ---');
  console.log(genderCounts);

  const [branchCounts] = await conn.query("SELECT branch, gender, COUNT(id) as count FROM students WHERE hostel_required = 'Yes' GROUP BY branch, gender ORDER BY branch, gender");
  console.log('--- HOSTELLERS BY BRANCH & GENDER ---');
  console.log(branchCounts);

  const [dayScholarCounts] = await conn.query("SELECT gender, COUNT(id) as count FROM students WHERE hostel_required = 'No' GROUP BY gender");
  console.log('--- DAY SCHOLARS BY GENDER ---');
  console.log(dayScholarCounts);

  // 5 real examples (2 hostellers: 1 boy, 1 girl, 2 day scholars, 1 admin)
  const [hostellerBoy] = await conn.query("SELECT student_id, roll_number, full_name, email, branch, gender, hostel_required, photo_url FROM students WHERE hostel_required = 'Yes' AND gender = 'MALE' LIMIT 1");
  const [hostellerGirl] = await conn.query("SELECT student_id, roll_number, full_name, email, branch, gender, hostel_required, photo_url FROM students WHERE hostel_required = 'Yes' AND gender = 'FEMALE' LIMIT 1");
  const [dayScholarBoy] = await conn.query("SELECT student_id, roll_number, full_name, email, branch, gender, hostel_required, photo_url FROM students WHERE hostel_required = 'No' AND gender = 'MALE' LIMIT 1");
  const [dayScholarGirl] = await conn.query("SELECT student_id, roll_number, full_name, email, branch, gender, hostel_required, photo_url FROM students WHERE hostel_required = 'No' AND gender = 'FEMALE' LIMIT 1");
  const [adminUser] = await conn.query("SELECT email, display_name, role FROM admins LIMIT 1");

  console.log('--- 5 REAL TEST EXAMPLES ---');
  console.log('1. Hosteller Boy:', hostellerBoy[0]);
  console.log('2. Hosteller Girl:', hostellerGirl[0]);
  console.log('3. Day Scholar Boy:', dayScholarBoy[0]);
  console.log('4. Day Scholar Girl:', dayScholarGirl[0]);
  console.log('5. Admin:', adminUser[0]);

  await conn.end();
}
analyze().catch(console.error);
