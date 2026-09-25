const db = require('../config/db');
const roomApplicationService = require('../services/roomApplicationService');

async function runTests() {
  console.log('====================================================');
  console.log('   PHASE C: ROOM APPLICATION END-TO-END TEST SUITE ');
  console.log('====================================================\n');

  try {
    // 1. Fetch test student and warden
    const [students] = await db.pool.query(
      `SELECT s.*, u.id as user_id, u.username, u.role_id 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       LIMIT 1`
    );

    if (students.length === 0) {
      console.error('❌ FAIL: No student found in DB for testing.');
      process.exit(1);
    }

    const testStudent = students[0];
    const studentUser = { id: testStudent.user_id, role: 'STUDENT' };
    console.log(`Using test student: ${testStudent.full_name} (${testStudent.roll_number})`);

    const [wardens] = await db.pool.query(
      `SELECT u.id, u.username, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE r.name IN ('SUPERINTENDENT', 'SUPER_ADMIN') LIMIT 1`
    );

    if (wardens.length === 0) {
      console.error('❌ FAIL: No warden/admin user found in DB for testing.');
      process.exit(1);
    }

    const testWarden = wardens[0];
    const wardenUser = { id: testWarden.id, role: testWarden.role_name };
    console.log(`Using test warden: ${testWarden.username} (${testWarden.role_name})`);

    // Fetch an active hostel for application
    const [hostels] = await db.pool.query('SELECT id, name FROM hostels LIMIT 1');
    if (hostels.length === 0) {
      console.error('❌ FAIL: No hostels found in DB.');
      process.exit(1);
    }
    const targetHostel = hostels[0];

    // Ensure warden assigned to hostel
    if (testWarden.role_name === 'SUPERINTENDENT') {
      const [assigned] = await db.pool.query(
        `SELECT * FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?`,
        [testWarden.id, targetHostel.id]
      );
      if (assigned.length === 0) {
        await db.pool.query(
          `INSERT INTO superintendent_hostels (user_id, hostel_id) VALUES (?, ?)`,
          [testWarden.id, targetHostel.id]
        );
      }
    }

    // Clear any existing PENDING application for clean test run
    await db.pool.query("DELETE FROM room_applications WHERE student_id = ? AND status = 'PENDING'", [testStudent.id]);

    // TEST 1: Submit Room Application
    console.log('\n--- TEST 1: Apply for Room Allocation (Student) ---');
    const newApp = await roomApplicationService.applyForRoom(studentUser, {
      preferred_hostel_id: targetHostel.id,
      room_type_preference: 'AC',
      preferred_roommate_roll_no: '2501316051',
      special_requests: 'Ground floor requested due to knee injury',
      academic_year: 2
    });

    console.log(`✔ PASS: Room application created with Application Number: ${newApp.application_number} (ID: ${newApp.id})`);

    // TEST 2: Fetch Room Applications List
    console.log('\n--- TEST 2: Fetch Room Applications List ---');
    const listResult = await roomApplicationService.getRoomApplications(studentUser, { page: 1, limit: 10 });
    if (listResult.data.length === 0) {
      throw new Error('Room applications list returned empty!');
    }
    console.log(`✔ PASS: Retrieved ${listResult.total} room application(s) for student.`);

    // TEST 3: Fetch Room Application Details
    console.log('\n--- TEST 3: Get Room Application Details ---');
    const appDetails = await roomApplicationService.getRoomApplicationById(studentUser, newApp.application_number);
    if (appDetails.id !== newApp.id) {
      throw new Error('Application ID mismatch!');
    }
    console.log(`✔ PASS: Successfully retrieved details for ${appDetails.application_number}`);

    // TEST 4: Warden Bed Allocation Wizard
    console.log('\n--- TEST 4: Allocate Bed & Approve Application (Warden) ---');
    // Find an available bed in hostel
    const [availableBeds] = await db.pool.query(
      `SELECT b.id, b.bed_number, r.room_number 
       FROM beds b 
       JOIN rooms r ON b.room_id = r.id 
       WHERE r.hostel_id = ? AND b.status = 'AVAILABLE' LIMIT 1`,
      [targetHostel.id]
    );

    if (availableBeds.length === 0) {
      console.log('⚠️ Warning: No available bed in target hostel to perform allocation test step. Creating dummy test bed...');
      const [testRooms] = await db.pool.query('SELECT id FROM rooms WHERE hostel_id = ? LIMIT 1', [targetHostel.id]);
      const [bedIns] = await db.pool.query(
        `INSERT INTO beds (room_id, bed_number, status) VALUES (?, 'TEST-BED-101', 'AVAILABLE')`,
        [testRooms[0].id]
      );
      availableBeds.push({ id: bedIns.insertId, bed_number: 'TEST-BED-101', room_number: '101' });
    }

    const targetBed = availableBeds[0];
    const allocatedApp = await roomApplicationService.approveAndAllocateRoom(wardenUser, newApp.id, {
      bed_id: targetBed.id,
      remarks: 'Allocated as requested'
    });

    if (allocatedApp.status !== 'ALLOCATED' || allocatedApp.allocated_bed_id !== targetBed.id) {
      throw new Error(`Expected status ALLOCATED but got ${allocatedApp.status}`);
    }
    console.log(`✔ PASS: Bed ID ${targetBed.id} (${targetBed.bed_number}) allocated to student for application ${allocatedApp.application_number}`);

    // TEST 5: Fetch Summary Stats
    console.log('\n--- TEST 5: Fetch Room Application Stats ---');
    const stats = await roomApplicationService.getRoomApplicationStats(wardenUser);
    console.log(`✔ PASS: Stats retrieved:`, stats);

    // TEST 6: Student Cancel Pending Application
    console.log('\n--- TEST 6: Student Cancel Pending Application ---');
    // Temporarily unassign student bed if needed to apply again
    await db.pool.query("UPDATE students SET bed_id = NULL WHERE id = ?", [testStudent.id]);
    await db.pool.query("DELETE FROM room_applications WHERE student_id = ? AND status = 'PENDING'", [testStudent.id]);

    const tempApp = await roomApplicationService.applyForRoom(studentUser, {
      preferred_hostel_id: targetHostel.id,
      room_type_preference: 'NON_AC',
      special_requests: 'Temporary application'
    });
    const cancelledApp = await roomApplicationService.cancelRoomApplication(studentUser, tempApp.id);
    if (cancelledApp.status !== 'CANCELLED') {
      throw new Error('Failed to cancel room application!');
    }
    console.log(`✔ PASS: Application ${tempApp.application_number} cancelled by student.`);

    // TEST 7: Security Check - Student cannot allocate bed
    console.log('\n--- TEST 7: Security Check - Student Bed Allocation Attempt Rejected ---');
    let blocked = false;
    try {
      await roomApplicationService.approveAndAllocateRoom(studentUser, tempApp.id, { bed_id: targetBed.id });
    } catch (err) {
      blocked = true;
      console.log(`✔ PASS: Student allocation attempt rejected cleanly with error: "${err.message}"`);
    }
    if (!blocked) {
      throw new Error('SECURITY VIOLATION: Student was allowed to allocate bed!');
    }

    console.log('\n====================================================');
    console.log('   ALL 7 ROOM APPLICATION TEST SCENARIOS PASSED! 🎉 ');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

runTests();
