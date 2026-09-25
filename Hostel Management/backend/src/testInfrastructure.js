const app = require('./app');
const db = require('./config/db');

const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}/api`;

const runTests = async () => {
  console.log('\n==================================================');
  console.log('STARTING PHASE 3 - INFRASTRUCTURE MANAGEMENT TESTS');
  console.log('==================================================\n');

  // Start the server on the test port
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

  try {
    // ----------------------------------------------------
    // Login all 3 test users
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
    // 1. HOSTELS TESTS
    // ----------------------------------------------------
    console.log('\n--- 1. HOSTEL CRUD TESTS ---');

    // Get all hostels - Super Admin
    const getHostelsAdmin = await fetch(`${BASE_URL}/hostels`, {
      headers: { Cookie: superadminCookie }
    });
    const hostelsAdminData = await getHostelsAdmin.json();
    assert(
      getHostelsAdmin.status === 200 && hostelsAdminData.success && hostelsAdminData.count >= 6,
      'Super Admin can read all hostels directory'
    );

    // Get all hostels - Superintendent (Warden manages id 1 & 3)
    const getHostelsWarden = await fetch(`${BASE_URL}/hostels`, {
      headers: { Cookie: wardenCookie }
    });
    const hostelsWardenData = await getHostelsWarden.json();
    assert(
      getHostelsWarden.status === 200 && hostelsWardenData.count === 2,
      'Superintendent gets only their assigned hostels'
    );

    // Create hostel - Superintendent (should fail)
    const createHostelWarden = await fetch(`${BASE_URL}/hostels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ name: 'Warden Hostel', code: 'WH1', gender: 'MALE', location: 'Loc', status: 'ACTIVE' })
    });
    assert(
      createHostelWarden.status === 403,
      'Superintendent cannot create hostels (403 Forbidden)'
    );

    // Create hostel - Super Admin (should succeed)
    const newHostelName = `Test Hostel ${Date.now()}`;
    const newHostelCode = `TH${Math.floor(Math.random() * 10000)}`;
    const createHostelAdmin = await fetch(`${BASE_URL}/hostels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ name: newHostelName, code: newHostelCode, gender: 'MALE', location: 'Test Location', status: 'ACTIVE' })
    });
    const newHostelData = await createHostelAdmin.json();
    assert(
      createHostelAdmin.status === 201 && newHostelData.success && newHostelData.data.id,
      'Super Admin can successfully create a hostel'
    );
    const createdHostelId = newHostelData.data.id;

    // Create duplicate hostel name - should fail
    const createDuplicateHostel = await fetch(`${BASE_URL}/hostels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ name: newHostelName, code: `DIFF${newHostelCode}`, gender: 'MALE', location: 'Test Location', status: 'ACTIVE' })
    });
    const duplicateData = await createDuplicateHostel.json();
    assert(
      createDuplicateHostel.status === 400 && duplicateData.message.includes('exists'),
      'Prevent duplicate hostel names'
    );

    // Update hostel - Super Admin
    const updateHostelAdmin = await fetch(`${BASE_URL}/hostels/${createdHostelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ name: `${newHostelName} Updated`, code: newHostelCode, gender: 'MALE', location: 'New Location', status: 'ACTIVE' })
    });
    const updateHostelData = await updateHostelAdmin.json();
    assert(
      updateHostelAdmin.status === 200 && updateHostelData.data.name.includes('Updated'),
      'Super Admin can update a hostel'
    );

    // ----------------------------------------------------
    // 2. FLOORS TESTS
    // ----------------------------------------------------
    console.log('\n--- 2. FLOOR CRUD TESTS ---');

    // Create floor - Warden on unassigned hostel (should fail)
    // BEC Girls Hostel 1 is id = 2, warden is NOT assigned.
    const createFloorUnassigned = await fetch(`${BASE_URL}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ hostel_id: 2, floor_name: 'First Floor', floor_number: 1, status: 'ACTIVE' })
    });
    assert(
      createFloorUnassigned.status === 403,
      'Superintendent cannot create floors in unassigned hostels'
    );

    // Create floor - Warden on assigned hostel (should succeed)
    // BEC Boys Hostel 1 is id = 1, warden IS assigned.
    const uniqueFloorNum = Math.floor(Math.random() * 100) + 10;
    const createFloorWarden = await fetch(`${BASE_URL}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ hostel_id: 1, floor_name: `Floor ${uniqueFloorNum}`, floor_number: uniqueFloorNum, status: 'ACTIVE' })
    });
    const floorWardenData = await createFloorWarden.json();
    assert(
      createFloorWarden.status === 201 && floorWardenData.success && floorWardenData.data.id,
      'Superintendent can create floors in assigned hostels'
    );
    const createdFloorId = floorWardenData.data.id;

    // Create duplicate floor number in same hostel - should fail
    const createDuplicateFloor = await fetch(`${BASE_URL}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ hostel_id: 1, floor_name: `Floor ${uniqueFloorNum} Dup`, floor_number: uniqueFloorNum, status: 'ACTIVE' })
    });
    assert(
      createDuplicateFloor.status === 400,
      'Prevent duplicate floor number within the same hostel'
    );

    // ----------------------------------------------------
    // 3. ROOM TESTS
    // ----------------------------------------------------
    console.log('\n--- 3. ROOM CRUD TESTS ---');

    // Create room - Cross-hostel floor validation (should fail)
    // Attempting to create a room in Hostel 1 (assigned) but specifying a floor belonging to Hostel 2.
    // Let's create a floor in Hostel 2 first as superadmin.
    const createFloorHostel2 = await fetch(`${BASE_URL}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: superadminCookie },
      body: JSON.stringify({ hostel_id: 2, floor_name: 'Hostel 2 Floor 1', floor_number: 1, status: 'ACTIVE' })
    });
    const floorHostel2Data = await createFloorHostel2.json();
    const floorHostel2Id = floorHostel2Data.data.id;

    const createRoomCross = await fetch(`${BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ hostel_id: 1, floor_id: floorHostel2Id, room_number: '101X', capacity: 4, status: 'ACTIVE' })
    });
    assert(
      createRoomCross.status === 400,
      'Prevent room referencing a floor that belongs to a different hostel'
    );

    // Create room - Warden on assigned hostel (should succeed)
    const uniqueRoomNum = `R${Math.floor(Math.random() * 10000)}`;
    const createRoomWarden = await fetch(`${BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ hostel_id: 1, floor_id: createdFloorId, room_number: uniqueRoomNum, capacity: 2, status: 'ACTIVE' })
    });
    const roomWardenData = await createRoomWarden.json();
    assert(
      createRoomWarden.status === 201 && roomWardenData.success && roomWardenData.data.id,
      'Superintendent can create rooms in assigned hostel and floors'
    );
    const createdRoomId = roomWardenData.data.id;

    // ----------------------------------------------------
    // 4. BEDS & CAPACITY TESTS
    // ----------------------------------------------------
    console.log('\n--- 4. BED CRUD & CAPACITY TESTS ---');

    // Create bed 1 in room (capacity = 2) - should succeed
    const createBed1 = await fetch(`${BASE_URL}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ room_id: createdRoomId, bed_number: 'B1', status: 'AVAILABLE' })
    });
    assert(createBed1.status === 201, 'Add first bed in room successfully');

    // Create bed 2 in room - should succeed
    const createBed2 = await fetch(`${BASE_URL}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ room_id: createdRoomId, bed_number: 'B2', status: 'AVAILABLE' })
    });
    assert(createBed2.status === 201, 'Add second bed in room successfully');

    // Create bed 3 in room (exceeds capacity = 2) - should fail
    const createBed3 = await fetch(`${BASE_URL}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ room_id: createdRoomId, bed_number: 'B3', status: 'AVAILABLE' })
    });
    const bed3Data = await createBed3.json();
    assert(
      createBed3.status === 400 && bed3Data.message.includes('capacity limit'),
      'Prevent adding beds that exceed room capacity'
    );

    // Create duplicate bed number in room - should fail
    // Temporarily increase room capacity to 3 first to test duplicate validation instead of capacity validation.
    await fetch(`${BASE_URL}/rooms/${createdRoomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ hostel_id: 1, floor_id: createdFloorId, room_number: uniqueRoomNum, capacity: 3, status: 'ACTIVE' })
    });

    const createDuplicateBed = await fetch(`${BASE_URL}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wardenCookie },
      body: JSON.stringify({ room_id: createdRoomId, bed_number: 'B1', status: 'AVAILABLE' })
    });
    assert(
      createDuplicateBed.status === 400 && createDuplicateBed.statusText !== 'OK',
      'Prevent duplicate bed number within the same room'
    );

    // ----------------------------------------------------
    // 5. SUMMARY & SAFE DELETION TESTS
    // ----------------------------------------------------
    console.log('\n--- 5. SUMMARY & SAFE DELETION TESTS ---');

    // Get hostel summary
    const summaryRes = await fetch(`${BASE_URL}/hostels/1/summary`, {
      headers: { Cookie: wardenCookie }
    });
    const summaryData = await summaryRes.json();
    assert(
      summaryRes.status === 200 && summaryData.success && summaryData.data.statistics.beds >= 2,
      'Get hostel summary stats successfully'
    );

    // Try deleting hostel that has floors/rooms - should fail
    const deleteHostelFail = await fetch(`${BASE_URL}/hostels/1`, {
      method: 'DELETE',
      headers: { Cookie: superadminCookie }
    });
    assert(
      deleteHostelFail.status === 400,
      'Safely reject deletion of hostels with active floors'
    );

    // Try deleting floor that has rooms - should fail
    const deleteFloorFail = await fetch(`${BASE_URL}/floors/${createdFloorId}`, {
      method: 'DELETE',
      headers: { Cookie: wardenCookie }
    });
    assert(
      deleteFloorFail.status === 400,
      'Safely reject deletion of floors with active rooms'
    );

    // Clean up created entities: beds first, then room, then floor, then hostel
    const getBedsRoom = await fetch(`${BASE_URL}/beds?room_id=${createdRoomId}`, {
      headers: { Cookie: wardenCookie }
    });
    const bedsRoomData = await getBedsRoom.json();
    for (const bed of bedsRoomData.data) {
      await fetch(`${BASE_URL}/beds/${bed.id}`, {
        method: 'DELETE',
        headers: { Cookie: wardenCookie }
      });
    }

    const deleteRoomSuccess = await fetch(`${BASE_URL}/rooms/${createdRoomId}`, {
      method: 'DELETE',
      headers: { Cookie: wardenCookie }
    });
    assert(deleteRoomSuccess.status === 200, 'Room can be deleted successfully after removing beds');

    const deleteFloorSuccess = await fetch(`${BASE_URL}/floors/${createdFloorId}`, {
      method: 'DELETE',
      headers: { Cookie: wardenCookie }
    });
    assert(deleteFloorSuccess.status === 200, 'Floor can be deleted successfully after removing rooms');

    // Delete created floor in hostel 2
    await fetch(`${BASE_URL}/floors/${floorHostel2Id}`, {
      method: 'DELETE',
      headers: { Cookie: superadminCookie }
    });

    const deleteHostelSuccess = await fetch(`${BASE_URL}/hostels/${createdHostelId}`, {
      method: 'DELETE',
      headers: { Cookie: superadminCookie }
    });
    assert(deleteHostelSuccess.status === 200, 'Hostel can be deleted successfully after removing floors');

  } catch (error) {
    console.error('Test loop encountered unexpected crash error:', error);
    testsFailed++;
  } finally {
    // Shutdown test server
    server.close();
    
    // Close database pool to avoid holding thread open
    await db.pool.end();

    console.log('\n==================================================');
    console.log(`TEST COMPLETED: ${testsPassed} passed, ${testsFailed} failed.`);
    console.log('==================================================\n');

    process.exit(testsFailed > 0 ? 1 : 0);
  }
};

runTests();
