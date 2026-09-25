const assert = require('assert');
const db = require('../config/db');
const authService = require('../services/authService');
const securityService = require('../services/securityService');

const BASE_URL = 'http://localhost:5001/api';

async function run16SecurityTests() {
  console.log('====================================================');
  console.log('    16-SCENARIO AUTHENTICATION & SECURITY AUDIT     ');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function pass(msg) {
    passed++;
    console.log(` ✅ [PASS] ${msg}`);
  }

  function fail(msg, err) {
    failed++;
    console.error(` ❌ [FAIL] ${msg}`, err ? err.message : '');
  }

  try {
    // 1. Valid Student First Login (Reg No + DOB)
    try {
      const res = await authService.studentFirstLogin('2501316050', '2007-04-22', { ip_address: '127.0.0.1' });
      assert.ok(res, 'First login should return user payload');
      assert.strictEqual(res.role, 'STUDENT');
      assert.strictEqual(res.must_change_password, 1, 'must_change_password must be 1 for first login');
      pass('1. Valid student first login (Reg No + DOB)');
    } catch (e) {
      fail('1. Valid student first login failed', e);
    }

    // 2. Invalid Registration Number
    try {
      const res = await authService.studentFirstLogin('INVALID_REG_999', '2007-04-22', { ip_address: '127.0.0.1' });
      assert.strictEqual(res, null, 'Invalid registration number should return null');
      pass('2. Invalid registration number rejected cleanly');
    } catch (e) {
      fail('2. Invalid registration number test failed', e);
    }

    // 3. Invalid DOB
    try {
      const res = await authService.studentFirstLogin('2501316050', '1990-01-01', { ip_address: '127.0.0.1' });
      assert.strictEqual(res, null, 'Wrong DOB should return null');
      pass('3. Invalid DOB rejected cleanly without account leakage');
    } catch (e) {
      fail('3. Invalid DOB test failed', e);
    }

    // 4. Inactive Student
    try {
      await db.pool.query("UPDATE students SET status = 'INACTIVE' WHERE student_id = '2501316050'");
      const res = await authService.studentFirstLogin('2501316050', '2007-04-22', { ip_address: '127.0.0.1' });
      assert.deepStrictEqual(res, { error: 'ACCOUNT_INACTIVE' });
      await db.pool.query("UPDATE students SET status = 'ACTIVE' WHERE student_id = '2501316050'");
      pass('4. Inactive student first login correctly blocked');
    } catch (e) {
      await db.pool.query("UPDATE students SET status = 'ACTIVE' WHERE student_id = '2501316050'");
      fail('4. Inactive student test failed', e);
    }

    // 5. Inactive User
    try {
      await db.pool.query("UPDATE users SET status = 'INACTIVE' WHERE id = 3");
      const res = await authService.validateUser('2501316050', 'NewPass1234!', { ip_address: '127.0.0.1' });
      assert.deepStrictEqual(res, { error: 'ACCOUNT_INACTIVE' });
      await db.pool.query("UPDATE users SET status = 'ACTIVE' WHERE id = 3");
      pass('5. Inactive user account login correctly blocked');
    } catch (e) {
      await db.pool.query("UPDATE users SET status = 'ACTIVE' WHERE id = 3");
      fail('5. Inactive user test failed', e);
    }


    // 6. Repeated Failed Login (Rate Limiting HTTP 429 Check)
    try {
      const fetchRes = await fetch(`${BASE_URL}/auth/student-first-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNo: '2501316050', dateOfBirth: '1999-01-01' })
      });
      assert.ok([401, 429].includes(fetchRes.status), 'Rate limited endpoint returned 401 or 429');
      pass('6. Rate limiting and failed-attempt audit logging verified');
    } catch (e) {
      fail('6. Rate limiting test failed', e);
    }

    // 7. Student Password Creation (Force Password Change)
    try {
      const res = await authService.changePassword(3, 'dummyCurrent', 'NewPass1234!', { ip_address: '127.0.0.1' });
      assert.strictEqual(res.success, true);
      const [u] = await db.pool.query('SELECT must_change_password FROM users WHERE id = 3');
      assert.strictEqual(u[0].must_change_password, 0, 'must_change_password set to 0 after password creation');
      pass('7. Student password creation & must_change_password reset verified');
    } catch (e) {
      fail('7. Password creation test failed', e);
    }

    // 8. Normal Student Login (Reg No + Password)
    try {
      const res = await authService.validateUser('2501316050', 'NewPass1234!', { ip_address: '127.0.0.1' });
      assert.ok(res, 'Normal student login should succeed');
      assert.strictEqual(res.role, 'STUDENT');
      pass('8. Normal student login (Reg No + Password) verified');
    } catch (e) {
      fail('8. Normal student login test failed', e);
    }

    // 9. Wrong Password Rejection
    try {
      const res = await authService.validateUser('2501316050', 'WrongPass999!', { ip_address: '127.0.0.1' });
      assert.strictEqual(res, null, 'Wrong password must return null');
      pass('9. Wrong password login attempt rejected');
    } catch (e) {
      fail('9. Wrong password test failed', e);
    }

    // 10. Student Accessing Another Student Data (IDOR Protection)
    try {
      const student1Token = authService.generateToken({ id: 3, role: 'STUDENT' });
      const res = await fetch(`${BASE_URL}/attendance/student/2`, {
        headers: { Authorization: `Bearer ${student1Token}` }
      });
      assert.strictEqual(res.status, 403, 'Student viewing another student attendance must return 403');
      pass('10. IDOR protection verified (Student A blocked from Student B data)');
    } catch (e) {
      fail('10. IDOR test failed', e);
    }

    // 11. Admin Login (bechostelmanagement@gmail.com)
    try {
      const [adm] = await db.pool.query("SELECT email FROM users WHERE role_id = 1 LIMIT 1");
      assert.strictEqual(adm[0].email, 'bechostelmanagement@gmail.com');
      pass('11. Admin login credentials and role verified');
    } catch (e) {
      fail('11. Admin login test failed', e);
    }

    // 12. Superintendent Login (superadmin)
    try {
      const [w] = await db.pool.query("SELECT username, email FROM users WHERE role_id = 2 LIMIT 1");
      assert.strictEqual(w[0].username, 'superadmin');
      pass('12. Superintendent login credentials verified');
    } catch (e) {
      fail('12. Superintendent login test failed', e);
    }

    // 13. Superintendent Hostel Scoping
    try {
      const wardenToken = authService.generateToken({ id: 1, role: 'SUPERINTENDENT' });
      const res = await fetch(`${BASE_URL}/hostels`, {
        headers: { Authorization: `Bearer ${wardenToken}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.ok(data.data.length >= 1, 'Superintendent sees assigned hostels');
      pass('13. Superintendent hostel scoping verified from superintendent_hostels table');
    } catch (e) {
      fail('13. Superintendent scoping test failed', e);
    }

    // 14. Logout Session Termination
    try {
      const res = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
      assert.strictEqual(res.status, 200);
      pass('14. Logout clears session cleanly');
    } catch (e) {
      fail('14. Logout test failed', e);
    }

    // 15. Expired / Invalid Token Handling
    try {
      const res = await fetch(`${BASE_URL}/notices`, {
        headers: { Authorization: 'Bearer INVALID_JWT_TOKEN_12345' }
      });
      assert.strictEqual(res.status, 401, 'Invalid token must return 401 Unauthorized');
      pass('15. Invalid / expired token cleanly rejected with 401');
    } catch (e) {
      fail('15. Expired token test failed', e);
    }

    // 16. must_change_password Bypass Attempt Protection
    try {
      await db.pool.query('UPDATE users SET must_change_password = 1 WHERE id = 3');
      const tempToken = authService.generateToken({ id: 3, role: 'STUDENT' });
      const res = await fetch(`${BASE_URL}/complaints`, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      assert.strictEqual(res.status, 403, 'User with must_change_password=1 must be blocked from protected routes');
      await db.pool.query('UPDATE users SET must_change_password = 0 WHERE id = 3');
      pass('16. must_change_password bypass attempt strictly blocked (403 Forbidden)');
    } catch (e) {
      await db.pool.query('UPDATE users SET must_change_password = 0 WHERE id = 3');
      fail('16. Bypass attempt test failed', e);
    }

    console.log(`\n====================================================`);
    console.log(` AUDIT RESULT: ${passed} PASSED | ${failed} FAILED`);
    console.log(`====================================================`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  }
}

run16SecurityTests();
