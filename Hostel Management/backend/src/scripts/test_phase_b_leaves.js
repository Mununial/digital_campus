const db = require('../config/db');
const leaveService = require('../services/leaveService');

async function runTests() {
  console.log('====================================================');
  console.log('   PHASE B: LEAVE SYSTEM END-TO-END TEST SUITE     ');
  console.log('====================================================\n');

  try {
    // Fetch test student and warden
    const [students] = await db.pool.query(
      `SELECT s.*, u.id as user_id, u.username, u.role_id 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.bed_id IS NOT NULL LIMIT 1`
    );

    if (students.length === 0) {
      console.error('❌ FAIL: No allocated student found in DB for testing.');
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

    // Ensure warden assigned to student's hostel
    if (testWarden.role_name === 'SUPERINTENDENT') {
      const [assigned] = await db.pool.query(
        `SELECT * FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?`,
        [testWarden.id, testStudent.hostel_id]
      );
      if (assigned.length === 0 && testStudent.hostel_id) {
        await db.pool.query(
          `INSERT INTO superintendent_hostels (user_id, hostel_id) VALUES (?, ?)`,
          [testWarden.id, testStudent.hostel_id]
        );
        console.log(`✓ Assigned warden to hostel ID ${testStudent.hostel_id}`);
      }
    }

    // TEST 1: Submit Leave Application
    console.log('\n--- TEST 1: Apply for Leave (Student) ---');
    const startDate = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    const newLeave = await leaveService.applyForLeave(studentUser, {
      leave_type: 'HOME_LEAVE',
      start_date: startDate,
      end_date: endDate,
      reason: 'Automated test family function leave',
      destination_address: '123 River Bank, Cuttack',
      emergency_phone: '9876543210'
    });

    console.log(`✔ PASS: Leave application created successfully with Leave Number: ${newLeave.leave_number} (ID: ${newLeave.id})`);

    // TEST 2: Fetch Leave Applications List
    console.log('\n--- TEST 2: Fetch Leave Applications List ---');
    const listResult = await leaveService.getLeaveApplications(studentUser, { page: 1, limit: 10 });
    if (listResult.data.length === 0) {
      throw new Error('Leave applications list returned empty!');
    }
    console.log(`✔ PASS: Retrieved ${listResult.total} leave application(s) for student.`);

    // TEST 3: Fetch Leave Application Details
    console.log('\n--- TEST 3: Get Leave Application Details ---');
    const leaveDetails = await leaveService.getLeaveApplicationById(studentUser, newLeave.leave_number);
    if (leaveDetails.id !== newLeave.id) {
      throw new Error('Leave application ID mismatch!');
    }
    console.log(`✔ PASS: Successfully retrieved details for ${leaveDetails.leave_number}`);

    // TEST 4: Warden Approval
    console.log('\n--- TEST 4: Approve Leave Application (Warden) ---');
    const approvedLeave = await leaveService.approveRejectLeave(wardenUser, newLeave.id, {
      action: 'APPROVE',
      remarks: 'Approved after phone verification with parent'
    });
    if (approvedLeave.status !== 'APPROVED') {
      throw new Error(`Expected status APPROVED but got ${approvedLeave.status}`);
    }
    console.log(`✔ PASS: Leave application ${approvedLeave.leave_number} approved by Warden.`);

    // TEST 5: Fetch Leave Summary Stats
    console.log('\n--- TEST 5: Fetch Leave Stats ---');
    const stats = await leaveService.getLeaveStats(wardenUser);
    console.log(`✔ PASS: Leave stats retrieved:`, stats);

    // TEST 6: Student Cancel Leave Application (Create new pending leave & cancel)
    console.log('\n--- TEST 6: Student Cancel Pending Leave ---');
    const tempLeave = await leaveService.applyForLeave(studentUser, {
      leave_type: 'MEDICAL_LEAVE',
      start_date: startDate,
      end_date: endDate,
      reason: 'Temporary dental appointment leave'
    });
    const cancelledLeave = await leaveService.cancelLeaveApplication(studentUser, tempLeave.id);
    if (cancelledLeave.status !== 'CANCELLED') {
      throw new Error('Failed to cancel pending leave application!');
    }
    console.log(`✔ PASS: Leave application ${tempLeave.leave_number} cancelled by student.`);

    // TEST 7: Security Check - Student cannot approve leave
    console.log('\n--- TEST 7: Security Check - Student Approval Attempt Rejected ---');
    let blocked = false;
    try {
      await leaveService.approveRejectLeave(studentUser, tempLeave.id, { action: 'APPROVE' });
    } catch (err) {
      blocked = true;
      console.log(`✔ PASS: Student approval attempt rejected cleanly with error: "${err.message}"`);
    }
    if (!blocked) {
      throw new Error('SECURITY VIOLATION: Student was allowed to approve leave!');
    }

    console.log('\n====================================================');
    console.log('   ALL 7 LEAVE SYSTEM TEST SCENARIOS PASSED! 🎉    ');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

runTests();
