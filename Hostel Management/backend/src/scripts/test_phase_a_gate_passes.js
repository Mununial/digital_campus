const db = require('../config/db');
const gatePassService = require('../services/gatePassService');

async function runTests() {
  console.log('====================================================');
  console.log('   PHASE A: GATE PASS END-TO-END AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  try {
    // 1. Fetch test student user and warden user
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

    // Ensure warden is assigned to student's hostel
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

    // TEST 1: Request Gate Pass
    console.log('\n--- TEST 1: Request Gate Pass (Student) ---');
    const outTime = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' ');
    const inTime = new Date(Date.now() + 86400000).toISOString().slice(0, 19).replace('T', ' ');

    const newPass = await gatePassService.requestGatePass(studentUser, {
      pass_type: 'LOCAL_OUTING',
      out_date_time: outTime,
      expected_in_date_time: inTime,
      reason: 'Automated test outing for book purchase',
      destination: 'Central City Mall',
      parent_phone: '9876543210'
    });

    console.log(`✔ PASS: Gate pass created successfully with Pass Number: ${newPass.pass_number} (ID: ${newPass.id})`);

    // TEST 2: Fetch List of Gate Passes
    console.log('\n--- TEST 2: Fetch Gate Passes List ---');
    const listResult = await gatePassService.getGatePasses(studentUser, { page: 1, limit: 10 });
    if (listResult.data.length === 0) {
      throw new Error('Gate pass list returned empty!');
    }
    console.log(`✔ PASS: Retrieved ${listResult.total} gate pass(es) for student.`);

    // TEST 3: Fetch Gate Pass by ID / Pass Number
    console.log('\n--- TEST 3: Get Gate Pass Details ---');
    const passDetails = await gatePassService.getGatePassById(studentUser, newPass.pass_number);
    if (passDetails.id !== newPass.id) {
      throw new Error('Gate pass ID mismatch!');
    }
    console.log(`✔ PASS: Successfully retrieved details for ${passDetails.pass_number}`);

    // TEST 4: Warden Approval
    console.log('\n--- TEST 4: Approve Gate Pass (Warden) ---');
    const approvedPass = await gatePassService.approveRejectGatePass(wardenUser, newPass.id, { action: 'APPROVE' });
    if (approvedPass.status !== 'APPROVED') {
      throw new Error(`Expected status APPROVED but got ${approvedPass.status}`);
    }
    console.log(`✔ PASS: Gate pass ${approvedPass.pass_number} approved by Warden.`);

    // TEST 5: Security Check-Out Action
    console.log('\n--- TEST 5: Security Action - Check-Out ---');
    const checkedOutPass = await gatePassService.securityGateAction(wardenUser, {
      pass_identifier: newPass.pass_number,
      action: 'CHECK_OUT',
      security_remarks: 'Verified student ID and left through main gate'
    });
    if (checkedOutPass.status !== 'CHECKED_OUT' || !checkedOutPass.actual_out_time) {
      throw new Error('Failed to mark check-out time!');
    }
    console.log(`✔ PASS: Student checked out at ${checkedOutPass.actual_out_time}`);

    // TEST 6: Security Check-In Action
    console.log('\n--- TEST 6: Security Action - Check-In / Return ---');
    const returnedPass = await gatePassService.securityGateAction(wardenUser, {
      pass_identifier: newPass.pass_number,
      action: 'CHECK_IN',
      security_remarks: 'Returned safely before curfew'
    });
    if (returnedPass.status !== 'RETURNED' || !returnedPass.actual_in_time) {
      throw new Error('Failed to mark check-in time!');
    }
    console.log(`✔ PASS: Student returned at ${returnedPass.actual_in_time}`);

    // TEST 7: Security & Authorization Block Check
    console.log('\n--- TEST 7: Security Check - Student Cannot Approve Gate Pass ---');
    let blocked = false;
    try {
      await gatePassService.approveRejectGatePass(studentUser, newPass.id, { action: 'APPROVE' });
    } catch (err) {
      blocked = true;
      console.log(`✔ PASS: Student approval attempt rejected cleanly with error: "${err.message}"`);
    }
    if (!blocked) {
      throw new Error('SECURITY VIOLATION: Student was allowed to approve gate pass!');
    }

    console.log('\n====================================================');
    console.log('   ALL 7 GATE PASS TEST SCENARIOS PASSED! 🎉');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

runTests();
