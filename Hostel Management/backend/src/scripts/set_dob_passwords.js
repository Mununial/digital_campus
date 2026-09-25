const db = require('../config/db');
const bcrypt = require('bcryptjs');

function formatDobToPassword(dob) {
  if (!dob) return '12032005';
  let yyyy, mm, dd;
  if (dob instanceof Date) {
    // Format to YYYY-MM-DD in IST timezone
    const dateStr = dob.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    [yyyy, mm, dd] = dateStr.split('-');
  } else if (typeof dob === 'string') {
    const clean = dob.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      [yyyy, mm, dd] = clean.split('-');
    }
  }

  if (dd && mm && yyyy) {
    return `${dd.padStart(2, '0')}${mm.padStart(2, '0')}${yyyy}`;
  }
  return '12032005';
}

async function migrateStudentPasswords() {
  const connection = await db.pool.getConnection();
  try {
    console.log(' Starting Student Password Update to DDMMYYYY...');

    const [students] = await connection.query(`
      SELECT s.id as student_id_pk, s.student_id, s.full_name, s.date_of_birth, s.user_id, u.email, u.username
      FROM students s
      JOIN users u ON s.user_id = u.id
    `);

    console.log(` Found ${students.length} student records to process.`);

    let updatedCount = 0;
    for (const student of students) {
      const rawPassword = formatDobToPassword(student.date_of_birth);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);

      await connection.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [hashedPassword, student.user_id]
      );

      updatedCount++;
    }

    console.log(` SUCCESS: Updated passwords to DDMMYYYY for ${updatedCount} students.`);
    process.exit(0);
  } catch (err) {
    console.error(' Migration failed:', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

migrateStudentPasswords();
