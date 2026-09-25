const db = require('../config/db');
const passwordUtil = require('../utils/password');
const authService = require('../services/authService');

async function testStudentDobAndLogin() {
  try {
    console.log('Testing Student DOB and Login with Registration Number...');
    
    // We will test direct login and password hashing for registration number & DOB
    const testRegNo = 'REG_TEST_9999';
    const testDob = '2005-08-15';
    // Format DDMMYYYY
    const parts = testDob.split('-'); // ['2005', '08', '15']
    const expectedPassword = `${parts[2]}${parts[1]}${parts[0]}`; // '15082005'
    console.log(`Test DOB: ${testDob} -> Expected Password: ${expectedPassword}`);

    // Clean up any previous test record
    await db.pool.query('DELETE FROM users WHERE username = ?', [testRegNo]);

    const hash = await passwordUtil.hashPassword(expectedPassword);

    // Create user and student
    const [userRes] = await db.pool.query(
      `INSERT INTO users (role_id, username, email, full_name, password_hash, status, must_change_password)
       VALUES (3, ?, 'reg_test_9999@example.com', 'Test Student DOB', ?, 'ACTIVE', 0)`,
      [testRegNo, hash]
    );
    const userId = userRes.insertId;

    await db.pool.query(
      `INSERT INTO students (user_id, student_id, roll_number, full_name, date_of_birth, phone, email, branch, course, year, semester, admission_date, status)
       VALUES (?, ?, 'ROLL-9999', 'Test Student DOB', ?, '9999999999', 'reg_test_9999@example.com', 'Computer Science & Engineering (CSE)', 'B.Tech', 1, 1, '2026-08-27', 'ACTIVE')`,
      [userId, testRegNo, testDob]
    );

    // Test authentication
    console.log('Testing authService.validateUser with Registration Number and DOB password...');
    const authUser = await authService.validateUser(testRegNo, expectedPassword);

    console.log('✓ Login successful! User:', {
      id: authUser.id,
      username: authUser.username,
      role: authUser.role
    });

    // Test fetching profile
    const profile = await authService.getUserProfile(userId);
    console.log('✓ Fetched student profile:', {
      student_id: profile.student_profile?.student_code,
      full_name: profile.student_profile?.full_name,
      date_of_birth: profile.student_profile?.date_of_birth,
      course: profile.student_profile?.course,
      branch: profile.student_profile?.branch
    });

    if (profile.student_profile?.date_of_birth) {
      console.log('✓ date_of_birth verified in profile output!');
    } else {
      throw new Error('date_of_birth missing in student profile');
    }

    // Clean up
    await db.pool.query('DELETE FROM students WHERE user_id = ?', [userId]);
    await db.pool.query('DELETE FROM users WHERE id = ?', [userId]);
    console.log('✓ Cleaned up test records');

    console.log('✓ All Student DOB & Registration Login tests PASSED successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testStudentDobAndLogin();
