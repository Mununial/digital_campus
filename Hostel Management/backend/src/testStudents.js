const app = require('./app');
const db = require('./config/db');

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api`;

const runTests = async () => {
  console.log('\n==================================================');
  console.log('STARTING PHASE 4 - STUDENT MANAGEMENT INTEGRATION TESTS');
  console.log('==================================================\n');

  const server = app.listen(PORT);
  
  let superadminCookie = null;
  let wardenCookie = null;
  let studentCookie = null;

  let testsPassed = 0;
  let testsFailed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`\x1b[32m✓ [PASS] ${message}\x1b[0m`);
      testsPassed++;
    } else {
      console.error(`\x1b[31m✗ [FAIL] ${message}\x1b[0m`);
      testsFailed++;
    }
  };

  // Helper variables for cleanups
  const createdUserIds = [];
  const createdStudentIds = [];
  const createdFloorIds = [];
  const createdRoomIds = [];
  const createdBedIds = [];

  try {
    // ----------------------------------------------------
    // Login all 3 test roles
    // ----------------------------------------------------
    const loginAdminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'superadmin', password: 'password123' })
    });
    superadminCookie = loginAdminRes.headers.get('set-cookie');

    const loginWardenRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'warden', password: 'password123' })
    });
    wardenCookie = loginWardenRes.headers.get('set-cookie');

    const loginStudentRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'student', password: 'password123' })
    });
    studentCookie = loginStudentRes.headers.get('set-cookie');

    // ----------------------------------------------------
    // Create Temporary Infrastructure for Testing
    // ----------------------------------------------------
    // Hostel 1 (BEC Boys Hostel 1 - assigned to Warden)
    // Create floor
    const f1Res = await fetch(`${BASE_URL}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ hostel_id: 1, floor_name: 'Test Student Floor', floor_number: 99, status: 'ACTIVE' })
    });
    const f1Data = await f1Res.json();
    const floorId1 = f1Data.data.id;
    createdFloorIds.push(floorId1);

    // Create room (capacity 2)
    const r1Res = await fetch(`${BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ hostel_id: 1, floor_id: floorId1, room_number: 'R999', capacity: 2, status: 'ACTIVE' })
    });
    const r1Data = await r1Res.json();
    const roomId1 = r1Data.data.id;
    createdRoomIds.push(roomId1);

    // Create 3 beds in Room R999 (B99A, B99B, B99C)
    // Note: room capacity was set to 2, so temporarily update capacity to 3 to add three beds for testing
    await fetch(`${BASE_URL}/rooms/${roomId1}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ hostel_id: 1, floor_id: floorId1, room_number: 'R999', capacity: 3, status: 'ACTIVE' })
    });

    const b1Res = await fetch(`${BASE_URL}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ room_id: roomId1, bed_number: 'B99A', status: 'AVAILABLE' })
    });
    const b1Data = await b1Res.json();
    const bedIdA = b1Data.data.id;
    createdBedIds.push(bedIdA);

    const b2Res = await fetch(`${BASE_URL}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ room_id: roomId1, bed_number: 'B99B', status: 'AVAILABLE' })
    });
    const b2Data = await b2Res.json();
    const bedIdB = b2Data.data.id;
    createdBedIds.push(bedIdB);

    const b3Res = await fetch(`${BASE_URL}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ room_id: roomId1, bed_number: 'B99C', status: 'MAINTENANCE' })
    });
    const b3Data = await b3Res.json();
    const bedIdC = b3Data.data.id;
    createdBedIds.push(bedIdC);

    // Restore room capacity to 3
    await fetch(`${BASE_URL}/rooms/${roomId1}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ hostel_id: 1, floor_id: floorId1, room_number: 'R999', capacity: 3, status: 'ACTIVE' })
    });

    // Hostel 2 (BEC Girls Hostel 1 - NOT assigned to Warden)
    const f2Res = await fetch(`${BASE_URL}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ hostel_id: 2, floor_name: 'Test Student Floor H2', floor_number: 98, status: 'ACTIVE' })
    });
    const f2Data = await f2Res.json();
    const floorId2 = f2Data.data.id;
    createdFloorIds.push(floorId2);

    const r2Res = await fetch(`${BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ hostel_id: 2, floor_id: floorId2, room_number: 'R888', capacity: 1, status: 'ACTIVE' })
    });
    const r2Data = await r2Res.json();
    const roomId2 = r2Data.data.id;
    createdRoomIds.push(roomId2);

    const b4Res = await fetch(`${BASE_URL}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ room_id: roomId2, bed_number: 'B88A', status: 'AVAILABLE' })
    });
    const b4Data = await b4Res.json();
    const bedIdD = b4Data.data.id;
    createdBedIds.push(bedIdD);

    // ----------------------------------------------------
    // 1. STUDENT CREATION TESTS
    // ----------------------------------------------------
    console.log('\n--- 1. STUDENT CREATION & VALIDATION TESTS ---');

    // Scenario A: Superintendent creates student in assigned hostel (should succeed)
    const stud1Res = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({
        student_id: 'TSTSTUD001',
        roll_number: 'ROLL-TST-001',
        full_name: 'Alice Test Student',
        phone: '1234567890',
        email: 'alice@test.com',
        branch: 'Computer Science',
        course: 'B.Tech',
        year: 2,
        semester: 3,
        hostel_id: 1,
        floor_id: floorId1,
        room_id: roomId1,
        bed_id: bedIdA,
        admission_date: '2026-08-23',
        password: 'password123'
      })
    });
    const stud1Data = await stud1Res.json();
    assert(
      stud1Res.status === 201 && stud1Data.success && stud1Data.data.id,
      'Superintendent can create a student in their assigned hostel'
    );
    const studentId1 = stud1Data.data.id;
    createdStudentIds.push(studentId1);

    // Verify bedStatus changed to OCCUPIED
    const [bedStatusA] = await db.pool.query('SELECT status FROM beds WHERE id = ?', [bedIdA]);
    assert(bedStatusA[0].status === 'OCCUPIED', 'Bed status correctly transitioned to OCCUPIED');

    // Scenario B: Superintendent attempts to create in unassigned hostel (should fail 403)
    const stud2Res = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({
        student_id: 'TSTSTUD002',
        roll_number: 'ROLL-TST-002',
        full_name: 'Bob Test Student',
        phone: '1234567891',
        email: 'bob@test.com',
        branch: 'Mechanical Engineering',
        course: 'B.Tech',
        year: 1,
        semester: 1,
        hostel_id: 2, // Hostel 2 is unassigned
        floor_id: floorId2,
        room_id: roomId2,
        bed_id: bedIdD,
        admission_date: '2026-08-23',
        password: 'password123'
      })
    });
    assert(stud2Res.status === 403, 'Superintendent cannot create students in unassigned hostels (403 Forbidden)');

    // Scenario C: Create student on occupied bed (should fail 400)
    const stud3Res = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({
        student_id: 'TSTSTUD003',
        roll_number: 'ROLL-TST-003',
        full_name: 'Charlie Student',
        phone: '1234567892',
        email: 'charlie@test.com',
        branch: 'Civil',
        course: 'B.Tech',
        year: 1,
        semester: 1,
        hostel_id: 1,
        floor_id: floorId1,
        room_id: roomId1,
        bed_id: bedIdA, // Already occupied by Alice
        admission_date: '2026-08-23',
        password: 'password123'
      })
    });
    assert(stud3Res.status === 400, 'Prevent allocating student to an already OCCUPIED bed');

    // Scenario D: Create student on maintenance bed (should fail 400)
    const stud4Res = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({
        student_id: 'TSTSTUD004',
        roll_number: 'ROLL-TST-004',
        full_name: 'Donald Student',
        phone: '1234567893',
        email: 'donald@test.com',
        branch: 'Civil',
        course: 'B.Tech',
        year: 1,
        semester: 1,
        hostel_id: 1,
        floor_id: floorId1,
        room_id: roomId1,
        bed_id: bedIdC, // Maintenance bed
        admission_date: '2026-08-23',
        password: 'password123'
      })
    });
    assert(stud4Res.status === 400, 'Prevent allocating student to a MAINTENANCE bed');

    // Scenario E: Create student with mismatching bed relationship (should fail 400)
    const stud5Res = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({
        student_id: 'TSTSTUD005',
        roll_number: 'ROLL-TST-005',
        full_name: 'Eve Student',
        phone: '1234567894',
        email: 'eve@test.com',
        branch: 'Civil',
        course: 'B.Tech',
        year: 1,
        semester: 1,
        hostel_id: 1,
        floor_id: floorId1,
        room_id: roomId1,
        bed_id: bedIdD, // Bed D belongs to Hostel 2, not Hostel 1
        admission_date: '2026-08-23',
        password: 'password123'
      })
    });
    assert(stud5Res.status === 400, 'Validate strict hierarchical bed -> room -> floor -> hostel matching on creation');

    // Scenario F: Duplicate validation checks
    const duplicateRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({
        student_id: 'TSTSTUD001', // Duplicate Student ID
        roll_number: 'ROLL-TST-NEW',
        full_name: 'Duplicate Student',
        phone: '1234567899',
        email: 'dup@test.com',
        branch: 'Civil',
        course: 'B.Tech',
        year: 1,
        semester: 1,
        hostel_id: 1,
        floor_id: floorId1,
        room_id: roomId1,
        bed_id: bedIdB,
        admission_date: '2026-08-23',
        password: 'password123'
      })
    });
    const duplicateData = await duplicateRes.json();
    assert(
      duplicateRes.status === 400 && duplicateData.message.includes('Student ID'),
      'Reject duplicate Student ID with a friendly error message'
    );

    // Scenario G: Student role attempts student account creation (should fail 403)
    const studCreateStudentRole = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        student_id: 'TSTSTUD006',
        roll_number: 'ROLL-TST-006',
        full_name: 'Student Fail',
        phone: '9999999999',
        email: 'fail@test.com',
        branch: 'CSE',
        course: 'B.Tech',
        year: 1,
        semester: 1,
        hostel_id: 1,
        floor_id: floorId1,
        room_id: roomId1,
        bed_id: bedIdB,
        admission_date: '2026-08-23',
        password: 'password123'
      })
    });
    assert(studCreateStudentRole.status === 403, 'A Student role is forbidden from creating student accounts');

    // ----------------------------------------------------
    // 2. RETRIEVAL & SEARCH TESTS
    // ----------------------------------------------------
    console.log('\n--- 2. STUDENT SEARCH, FILTERS & PAGINATION TESTS ---');

    // Super Admin lists students
    const getStudentsAdmin = await fetch(`${BASE_URL}/students?page=1&limit=20&search=Alice`, {
      headers: { Cookie: superadminCookie }
    });
    const studentsAdminData = await getStudentsAdmin.json();
    assert(
      getStudentsAdmin.status === 200 && studentsAdminData.data.students.length >= 1,
      'Super Admin can search and paginate students list'
    );

    // Superintendent lists students
    const getStudentsWarden = await fetch(`${BASE_URL}/students?hostel_id=1`, {
      headers: { Cookie: wardenCookie }
    });
    const studentsWardenData = await getStudentsWarden.json();
    assert(
      getStudentsWarden.status === 200 && studentsWardenData.data.students.length >= 1,
      'Superintendent can retrieve students list filtered by assigned hostel'
    );

    // Superintendent queries unassigned hostel filter (should fail 403)
    const getStudentsWardenUnassigned = await fetch(`${BASE_URL}/students?hostel_id=2`, {
      headers: { Cookie: wardenCookie }
    });
    assert(
      getStudentsWardenUnassigned.status === 403,
      'Superintendent is restricted from viewing students in unassigned hostels'
    );

    // ----------------------------------------------------
    // 3. TRANSFER TESTS
    // ----------------------------------------------------
    console.log('\n--- 3. STUDENT TRANSFER TESTS ---');

    // Superintendent transfers student Alice within assigned hostel from Bed A to Bed B
    const transferRes = await fetch(`${BASE_URL}/students/${studentId1}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({
        new_hostel_id: 1,
        new_floor_id: floorId1,
        new_room_id: roomId1,
        new_bed_id: bedIdB
      })
    });
    const transferData = await transferRes.json();
    assert(
      transferRes.status === 200 && transferData.success,
      'Superintendent can transfer student between beds within assigned hostel'
    );

    // Verify bed status swaps (Bed A should be AVAILABLE, Bed B should be OCCUPIED)
    const [bedStatusAAfter] = await db.pool.query('SELECT status FROM beds WHERE id = ?', [bedIdA]);
    const [bedStatusBAfter] = await db.pool.query('SELECT status FROM beds WHERE id = ?', [bedIdB]);
    assert(
      bedStatusAAfter[0].status === 'AVAILABLE' && bedStatusBAfter[0].status === 'OCCUPIED',
      'Bed status successfully swapped (old bed freed, new bed occupied)'
    );

    // Superintendent attempts cross-hostel transfer to unassigned Hostel 2 (should fail 403)
    const transferCrossRes = await fetch(`${BASE_URL}/students/${studentId1}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({
        new_hostel_id: 2, // Hostel 2 is unassigned
        new_floor_id: floorId2,
        new_room_id: roomId2,
        new_bed_id: bedIdD
      })
    });
    assert(
      transferCrossRes.status === 403,
      'Prevent Superintendent from transferring student to unassigned hostels'
    );

    // Transfer student to occupied bed (should fail 400)
    // First, let's create a second student Bob on Bed A (which is now available)
    const bobRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({
        student_id: 'TSTSTUD002',
        roll_number: 'ROLL-TST-002',
        full_name: 'Bob Student',
        phone: '1234567891',
        email: 'bob@test.com',
        branch: 'Mechanical',
        course: 'B.Tech',
        year: 1,
        semester: 1,
        hostel_id: 1,
        floor_id: floorId1,
        room_id: roomId1,
        bed_id: bedIdA,
        admission_date: '2026-08-23',
        password: 'password123'
      })
    });
    const bobData = await bobRes.json();
    const studentId2 = bobData.data.id;
    createdStudentIds.push(studentId2);

    // Attempt to transfer Alice to Bed A (occupied by Bob)
    const transferToOccupied = await fetch(`${BASE_URL}/students/${studentId1}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({
        new_hostel_id: 1,
        new_floor_id: floorId1,
        new_room_id: roomId1,
        new_bed_id: bedIdA // Occupied
      })
    });
    assert(
      transferToOccupied.status === 400,
      'Prevent transferring student to an occupied bed'
    );

    // ----------------------------------------------------
    // 4. STUDENT ACCESS & PROFILE TESTS
    // ----------------------------------------------------
    console.log('\n--- 4. ROLE-BASED ACCESS & PROFILE CHECKS ---');

    // Student profile detail fetch
    const getSelfProfile = await fetch(`${BASE_URL}/students/profile/me`, {
      headers: { Cookie: studentCookie }
    });
    const selfProfileData = await getSelfProfile.json();
    assert(
      getSelfProfile.status === 200 && selfProfileData.success && selfProfileData.data.full_name,
      'Student can successfully retrieve their own profile details'
    );

    // Student attempts to query Alice's profile details (should fail 403)
    const getOtherProfile = await fetch(`${BASE_URL}/students/${studentId1}`, {
      headers: { Cookie: studentCookie }
    });
    assert(
      getOtherProfile.status === 403,
      'Student is forbidden from viewing other student profiles'
    );

    // ----------------------------------------------------
    // 5. DEACTIVATION TESTS
    // ----------------------------------------------------
    console.log('\n--- 5. DEACTIVATION & ARCHIVAL TESTS ---');

    // Deactivate Alice (status -> INACTIVE)
    const deactivateRes = await fetch(`${BASE_URL}/students/${studentId1}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ status: 'INACTIVE' })
    });
    assert(
      deactivateRes.status === 200,
      'Warden can successfully deactivate a student account'
    );

    // Verify bed status is returned to AVAILABLE
    const [bedStatusBAfterDeactivate] = await db.pool.query('SELECT status FROM beds WHERE id = ?', [bedIdB]);
    assert(
      bedStatusBAfterDeactivate[0].status === 'AVAILABLE',
      'Deactivation automatically releases the assigned bed to AVAILABLE status'
    );

    // Verify student user status also became INACTIVE
    const [userStatusAfter] = await db.pool.query(
      `SELECT u.status FROM users u
       JOIN students s ON s.user_id = u.id
       WHERE s.id = ?`,
      [studentId1]
    );
    assert(
      userStatusAfter[0].status === 'INACTIVE',
      'Deactivation automatically syncs and disables the user authentication account'
    );

    // ----------------------------------------------------
    // Clean up created students, users, and infrastructure
    // ----------------------------------------------------
    console.log('\nCleaning up created test records...');
    
    // We need to delete from student table, then users table (foreign keys cascade)
    // First free all bed assignments
    await db.pool.query('UPDATE students SET bed_id = NULL WHERE id IN (?)', [createdStudentIds]);
    
    // Delete students & users
    const [studUsers] = await db.pool.query('SELECT user_id FROM students WHERE id IN (?)', [createdStudentIds]);
    const userIds = studUsers.map(u => u.user_id);
    
    if (createdStudentIds.length > 0) {
      await db.pool.query('DELETE FROM students WHERE id IN (?)', [createdStudentIds]);
    }
    if (userIds.length > 0) {
      await db.pool.query('DELETE FROM users WHERE id IN (?)', [userIds]);
    }

    // Delete infrastructure in reverse order
    if (createdBedIds.length > 0) {
      await db.pool.query('DELETE FROM beds WHERE id IN (?)', [createdBedIds]);
    }
    if (createdRoomIds.length > 0) {
      await db.pool.query('DELETE FROM rooms WHERE id IN (?)', [createdRoomIds]);
    }
    if (createdFloorIds.length > 0) {
      await db.pool.query('DELETE FROM floors WHERE id IN (?)', [createdFloorIds]);
    }

  } catch (error) {
    console.error('Test loop encountered unexpected crash error:', error);
    testsFailed++;
  } finally {
    server.close();
    await db.pool.end();

    console.log('\n==================================================');
    console.log(`TEST COMPLETED: ${testsPassed} passed, ${testsFailed} failed.`);
    console.log('==================================================\n');

    process.exit(testsFailed > 0 ? 1 : 0);
  }
};

runTests();
