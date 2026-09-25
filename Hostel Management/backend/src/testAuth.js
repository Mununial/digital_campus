const app = require('./app');
const db = require('./config/db');

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api`;

const runTests = async () => {
  console.log('\n==================================================');
  console.log('STARTING SECURE AUTHENTICATION & RBAC TEST LOOP');
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
    // Test 1: Login with valid SUPER_ADMIN
    // ----------------------------------------------------
    const loginAdminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'superadmin', password: 'password123' })
    });
    const adminData = await loginAdminRes.json();
    assert(
      loginAdminRes.status === 200 && adminData.success && adminData.user.role === 'SUPER_ADMIN',
      'Test 1: Login with valid SUPER_ADMIN credentials should succeed'
    );
    superadminCookie = loginAdminRes.headers.get('set-cookie');

    // ----------------------------------------------------
    // Test 2: Login with invalid password
    // ----------------------------------------------------
    const loginFailRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'superadmin', password: 'wrongpassword' })
    });
    const failData = await loginFailRes.json();
    assert(
      loginFailRes.status === 401 && !failData.success && failData.message === 'Invalid username/email or password.',
      'Test 2: Login with invalid password should fail with generic invalid credentials message'
    );

    // ----------------------------------------------------
    // Test 3: Login with nonexistent account
    // ----------------------------------------------------
    const loginNonexistRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'nonexistent', password: 'password123' })
    });
    const nonexistData = await loginNonexistRes.json();
    assert(
      loginNonexistRes.status === 401 && !nonexistData.success && nonexistData.message === 'Invalid username/email or password.',
      'Test 3: Login with nonexistent account should fail with identical generic error'
    );

    // ----------------------------------------------------
    // Test 4: GET /api/auth/me while authenticated
    // ----------------------------------------------------
    const meAdminRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Cookie: superadminCookie }
    });
    const meAdminData = await meAdminRes.json();
    assert(
      meAdminRes.status === 200 && meAdminData.success && meAdminData.user.username === 'superadmin',
      'Test 4: GET /api/auth/me while authenticated as SUPER_ADMIN should return account profile'
    );

    // ----------------------------------------------------
    // Test 5: GET /api/auth/me while unauthenticated
    // ----------------------------------------------------
    const meUnauthRes = await fetch(`${BASE_URL}/auth/me`);
    const meUnauthData = await meUnauthRes.json();
    assert(
      meUnauthRes.status === 401 && !meUnauthData.success,
      'Test 5: GET /api/auth/me while unauthenticated should return 401'
    );

    // ----------------------------------------------------
    // Test 6: Logout
    // ----------------------------------------------------
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: superadminCookie }
    });
    const logoutData = await logoutRes.json();
    const logoutCookies = logoutRes.headers.get('set-cookie');
    assert(
      logoutRes.status === 200 && logoutData.success && logoutCookies.includes('token=;'),
      'Test 6: Logout endpoint should successfully clear authentication cookie'
    );

    // ----------------------------------------------------
    // Test 7: Access protected endpoint while logged out
    // ----------------------------------------------------
    const protectRes = await fetch(`${BASE_URL}/hostels`);
    const protectData = await protectRes.json();
    assert(
      protectRes.status === 401 && !protectData.success,
      'Test 7: Accessing protected /api/hostels endpoint while unauthenticated must fail'
    );

    // ----------------------------------------------------
    // Test 8: SUPER_ADMIN access to hostels directory
    // ----------------------------------------------------
    const hostelsAdminRes = await fetch(`${BASE_URL}/hostels`, {
      headers: { Cookie: superadminCookie }
    });
    const hostelsAdminData = await hostelsAdminRes.json();
    assert(
      hostelsAdminRes.status === 200 && hostelsAdminData.count === 6,
      'Test 8: SUPER_ADMIN should access all 6 active hostels in directory'
    );

    // ----------------------------------------------------
    // Test 9: SUPERINTENDENT access to assigned hostels only
    // ----------------------------------------------------
    const loginWardenRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'warden', password: 'password123' })
    });
    const wardenData = await loginWardenRes.json();
    wardenCookie = loginWardenRes.headers.get('set-cookie');
    
    const hostelsWardenRes = await fetch(`${BASE_URL}/hostels`, {
      headers: { Cookie: wardenCookie }
    });
    const hostelsWardenData = await hostelsWardenRes.json();
    assert(
      loginWardenRes.status === 200 && hostelsWardenRes.status === 200 && hostelsWardenData.count === 2,
      'Test 9: SUPERINTENDENT access should be restricted to only their assigned hostels (2)'
    );

    // ----------------------------------------------------
    // Test 10: STUDENT access to their profile details
    // ----------------------------------------------------
    const loginStudentRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'student', password: 'password123' })
    });
    const studentData = await loginStudentRes.json();
    studentCookie = loginStudentRes.headers.get('set-cookie');

    const profileMeRes = await fetch(`${BASE_URL}/students/profile/me`, {
      headers: { Cookie: studentCookie }
    });
    const profileMeData = await profileMeRes.json();
    assert(
      loginStudentRes.status === 200 && profileMeRes.status === 200 && profileMeData.data.student_id === 'STD2026001',
      'Test 10: STUDENT should successfully access their own details at /profile/me'
    );

    // ----------------------------------------------------
    // Test 11: Superintendent attempting another hostel's data
    // ----------------------------------------------------
    // BEC Girls Hostel 1 has id = 2. Let's verify that warden's returned list does not contain id = 2.
    const hasUnassignedHostel = hostelsWardenData.data.some(h => h.id === 2);
    assert(
      !hasUnassignedHostel,
      'Test 11: SUPERINTENDENT must NOT receive unassigned hostels (e.g. BEC Girls Hostel 1, id=2) in list response'
    );

    // ----------------------------------------------------
    // Test 12: Student attempting another student's data
    // ----------------------------------------------------
    // Student John Doe (id = 1) attempts to query student id = 99 (or another unassigned id).
    // The controller uses hasStudentAccess which returns false since John Doe's id is 1, not 99.
    const otherStudentRes = await fetch(`${BASE_URL}/students/99`, {
      headers: { Cookie: studentCookie }
    });
    const otherStudentData = await otherStudentRes.json();
    assert(
      otherStudentRes.status === 403 && !otherStudentData.success && otherStudentData.message.includes('Forbidden'),
      "Test 12: STUDENT A must be blocked with 403 Forbidden when attempting to retrieve Student B's details"
    );

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
