const db = require('../config/db');
const studentService = require('../services/studentService');
const authService = require('../services/authService');

async function testStudentLoginFlow() {
  try {
    console.log('--- Testing Modernized Student Registration & Login Flow ---');

    // 1. Get an available bed
    const [availableBeds] = await db.pool.query(`
      SELECT b.id as bed_id, r.id as room_id, r.floor_id, r.hostel_id
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.status = 'AVAILABLE'
      LIMIT 2
    `);

    if (availableBeds.length === 0) {
      console.log('No available beds found for test. Creating temporary test bed...');
      // Just in case, find any room
      const [rooms] = await db.pool.query('SELECT id, floor_id, hostel_id FROM rooms LIMIT 1');
      const room = rooms[0];
      const [bedRes] = await db.pool.query(
        "INSERT INTO beds (room_id, bed_number, status) VALUES (?, 'TEST-B99', 'AVAILABLE')",
        [room.id]
      );
      availableBeds.push({
        bed_id: bedRes.insertId,
        room_id: room.id,
        floor_id: room.floor_id,
        hostel_id: room.hostel_id
      });
    }

    const testBed = availableBeds[0];

    // Clean up any previous test user
    await db.pool.query("DELETE FROM users WHERE email IN ('soumyaranjanpanda@bec.ac.in', 'rahulkumar@bec.ac.in')");

    // TEST CASE 1: Student without roll_number and without registration number
    console.log('\n[Test 1] Creating student with NO roll number & NO registration number...');
    const student1 = await studentService.createStudent({
      full_name: 'Soumya Ranjan Panda',
      date_of_birth: '2005-08-15',
      branch: 'Computer Science & Engineering (CSE)',
      course: 'B.Tech',
      year: 1,
      semester: 1,
      hostel_id: testBed.hostel_id,
      floor_id: testBed.floor_id,
      room_id: testBed.room_id,
      bed_id: testBed.bed_id,
      admission_date: '2026-08-29'
    }, { id: 1, role: 'SUPER_ADMIN' });

    console.log('✓ Created Student 1:', {
      id: student1.id,
      student_id: student1.student_id,
      full_name: student1.full_name,
      email: student1.email,
      date_of_birth: student1.date_of_birth
    });

    // Test Login 1a: Login with email soumyaranjanpanda@bec.ac.in and password '15082005'
    console.log('\n[Test 1a] Logging in with email (soumyaranjanpanda@bec.ac.in) and DOB password (15082005)...');
    const auth1a = await authService.validateUser('soumyaranjanpanda@bec.ac.in', '15082005');
    if (!auth1a || auth1a.error) {
      throw new Error('Login with email failed!');
    }
    console.log('✓ Login via email successful! User ID:', auth1a.id, 'Role:', auth1a.role);

    // Test Login 1b: Login with auto-generated student_id and password '15082005'
    console.log(`\n[Test 1b] Logging in with auto-generated Registration ID (${student1.student_id}) and password (15082005)...`);
    const auth1b = await authService.validateUser(student1.student_id, '15082005');
    if (!auth1b || auth1b.error) {
      throw new Error('Login with auto-generated student_id failed!');
    }
    console.log('✓ Login via student_id successful! User ID:', auth1b.id);

    // Clean up student 1
    await db.pool.query('DELETE FROM students WHERE id = ?', [student1.id]);
    await db.pool.query('DELETE FROM users WHERE email = ?', ['soumyaranjanpanda@bec.ac.in']);
    await db.pool.query("UPDATE beds SET status = 'AVAILABLE' WHERE id = ?", [testBed.bed_id]);
    await db.pool.query('DELETE FROM student_allocations WHERE student_id = ?', [student1.id]);

    console.log('\n✓ All Student Login & Registration flow tests PASSED perfectly!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testStudentLoginFlow();
