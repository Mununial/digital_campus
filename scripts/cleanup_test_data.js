const mysql = require('../campus-portal/node_modules/mysql2/promise');

async function inspectAndClean() {
  const conn = await mysql.createConnection({
    host: 'srv1334.hstgr.io',
    port: 3306,
    user: 'u847513759_ERP_COLLEGE',
    password: 'Ayushtech@26',
    database: 'u847513759_ERP_COLLEGE'
  });

  console.log('Connected to Hostinger DB');

  // Find any test records in students
  const [testStudents] = await conn.query(
    "SELECT student_id, full_name, email FROM students WHERE LOWER(full_name) LIKE '%test%' OR LOWER(email) LIKE '%test%' OR LOWER(student_id) LIKE '%test%'"
  );
  console.log('Test students found in DB:', testStudents);

  // Find any test records in users
  const [testUsers] = await conn.query(
    "SELECT id, username, email, full_name FROM users WHERE LOWER(full_name) LIKE '%test%' OR LOWER(email) LIKE '%test%' OR LOWER(username) LIKE '%test%'"
  );
  console.log('Test users found in DB:', testUsers);

  // Find any John Doe, Jane Smith
  const [fakeNames] = await conn.query(
    "SELECT student_id, full_name, email FROM students WHERE full_name IN ('John Doe', 'Jane Smith', 'Rohan Kumar', 'Rahul Sharma')"
  );
  console.log('Fake names found in students:', fakeNames);

  // If test records exist in DB, remove them
  if (testStudents.length > 0) {
    for (const ts of testStudents) {
      console.log(`Removing test student ${ts.student_id} (${ts.full_name})...`);
      await conn.query("DELETE FROM students WHERE student_id = ?", [ts.student_id]);
      await conn.query("DELETE FROM users WHERE username = ? OR email = ?", [ts.student_id, ts.email]);
    }
  }

  // Count remaining clean authentic records
  const [cleanStudents] = await conn.query("SELECT COUNT(*) as count FROM students");
  const [cleanUsers] = await conn.query("SELECT COUNT(*) as count FROM users");
  console.log('Clean Authentic Students in DB:', cleanStudents[0].count);
  console.log('Clean Authentic Users in DB:', cleanUsers[0].count);

  await conn.end();
}

inspectAndClean().catch(console.error);
