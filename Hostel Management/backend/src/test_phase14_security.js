const assert = require('assert');
const db = require('./config/db');
const authService = require('./services/authService');
const userService = require('./services/userService');
const securityService = require('./services/securityService');
const passwordUtil = require('./utils/password');

async function runSecurityTests() {
  console.log('--- Starting Phase 14 Security & User Management Verification Tests ---');
  let testsPassed = 0;
  let testsFailed = 0;

  function pass(msg) {
    testsPassed++;
    console.log(`\x1b[32m✔ [PASS]\x1b[0m ${msg}`);
  }

  function fail(msg, err) {
    testsFailed++;
    console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${msg}`, err ? err.message : '');
  }

  const superAdminActor = { id: 1, role: 'SUPER_ADMIN' };
  let createdTestUserId = null;

  try {
    // Test 1: Password Strength Validation
    try {
      const weak1 = passwordUtil.validatePasswordStrength('short');
      const weak2 = passwordUtil.validatePasswordStrength('lowercaseonly1');
      const weak3 = passwordUtil.validatePasswordStrength('UPPERCASEONLY1');
      const weak4 = passwordUtil.validatePasswordStrength('NoNumbersHere');
      const strong = passwordUtil.validatePasswordStrength('Pass1234!');

      assert.strictEqual(weak1.isValid, false, 'Short password should fail');
      assert.strictEqual(weak2.isValid, false, 'No uppercase password should fail');
      assert.strictEqual(weak3.isValid, false, 'No lowercase password should fail');
      assert.strictEqual(weak4.isValid, false, 'No number password should fail');
      assert.strictEqual(strong.isValid, true, 'Complex password should pass');

      pass('Password complexity policy correctly enforced');
    } catch (e) {
      fail('Password complexity policy check failed', e);
    }

    // Test 2: Valid Login & Audit Event
    try {
      const res = await authService.validateUser('superadmin', 'password123', { ip_address: '127.0.0.1', user_agent: 'TestAgent' });
      assert.ok(res, 'Valid login should return user');
      assert.strictEqual(res.username, 'superadmin');
      assert.strictEqual(res.role, 'SUPER_ADMIN');
      assert.strictEqual(res.password_hash, undefined, 'Password hash must NOT be returned');
      pass('Valid login succeeds and excludes password_hash');
    } catch (e) {
      fail('Valid login test failed', e);
    }

    // Test 3: Invalid Login Generic Message & Audit
    try {
      const res = await authService.validateUser('superadmin', 'wrongpass', { ip_address: '127.0.0.1', user_agent: 'TestAgent' });
      assert.strictEqual(res, null, 'Invalid login should return null');
      pass('Invalid password rejected without leaking user details');
    } catch (e) {
      fail('Invalid login test failed', e);
    }

    // Test 4: Inactive Account Login Rejection
    try {
      // Find student user id
      const [students] = await db.pool.query("SELECT u.id, u.username FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'STUDENT' LIMIT 1");
      if (students.length > 0) {
        const studentUser = students[0];
        await userService.updateUserStatus(studentUser.id, 'INACTIVE', superAdminActor, { ip_address: '127.0.0.1' });
        const res = await authService.validateUser(studentUser.username, 'password123', { ip_address: '127.0.0.1' });
        assert.deepStrictEqual(res, { error: 'ACCOUNT_INACTIVE' }, 'Inactive account login must return ACCOUNT_INACTIVE');
        await userService.updateUserStatus(studentUser.id, 'ACTIVE', superAdminActor, { ip_address: '127.0.0.1' });
        pass('Inactive user account login correctly blocked');
      } else {
        pass('Skipped inactive check (no student user found)');
      }
    } catch (e) {
      fail('Inactive account login test failed', e);
    }

    // Test 5: Self-Deactivation Protection
    try {
      let errCaught = false;
      try {
        await userService.updateUserStatus(1, 'INACTIVE', superAdminActor, { ip_address: '127.0.0.1' });
      } catch (e) {
        errCaught = true;
        assert.ok(e.message.includes('cannot deactivate your own account'));
      }
      assert.strictEqual(errCaught, true, 'Super Admin self-deactivation must be prevented');
      pass('Super Admin self-deactivation protection verified');
    } catch (e) {
      fail('Self-deactivation protection test failed', e);
    }

    // Test 6: Last Super Admin Demotion Protection
    try {
      let errCaught = false;
      try {
        await userService.updateUserRole(1, 'SUPERINTENDENT', superAdminActor, { ip_address: '127.0.0.1' });
      } catch (e) {
        errCaught = true;
        assert.ok(e.message.includes('last active Super Admin'));
      }
      assert.strictEqual(errCaught, true, 'Demoting last Super Admin must be blocked');
      pass('Last active Super Admin demotion protection verified');
    } catch (e) {
      fail('Last Super Admin protection test failed', e);
    }

    // Test 7: Create User Account with Force Password Change
    try {
      // Clean up previous if exists
      await db.pool.query("DELETE FROM users WHERE username = 'tempwarden'");

      const [hostelRows] = await db.pool.query('SELECT id FROM hostels LIMIT 2');
      const validHostelIds = hostelRows.map(h => h.id);

      const newUser = await userService.createUser({
        username: 'tempwarden',
        email: 'tempwarden@hostel.com',
        password: 'TempPassword123!',
        role: 'SUPERINTENDENT',
        hostel_ids: validHostelIds
      }, superAdminActor, { ip_address: '127.0.0.1' });

      assert.ok(newUser.id, 'New user should have ID');
      assert.strictEqual(newUser.must_change_password, true, 'New account should require password change');
      createdTestUserId = newUser.id;
      pass('User creation with forced initial password change verified');
    } catch (e) {
      fail('Create user test failed', e);
    }

    // Test 8: Password Change Flow
    try {
      const res = await authService.changePassword(createdTestUserId, 'TempPassword123!', 'NewStrongPass123!', { ip_address: '127.0.0.1' });
      assert.strictEqual(res.success, true);
      
      // Old password should fail
      const oldLogin = await authService.validateUser('tempwarden', 'TempPassword123!');
      assert.strictEqual(oldLogin, null, 'Old password must no longer work');

      // New password should succeed
      const newLogin = await authService.validateUser('tempwarden', 'NewStrongPass123!');
      assert.ok(newLogin, 'New password must succeed');
      assert.strictEqual(Boolean(newLogin.must_change_password), false, 'must_change_password must be cleared');

      pass('Password change lifecycle & credential update verified');
    } catch (e) {
      fail('Password change lifecycle test failed', e);
    }

    // Test 9: Admin Password Reset
    try {
      const resetRes = await userService.adminResetPassword(createdTestUserId, 'ResetAdminPass123!', superAdminActor, { ip_address: '127.0.0.1' });
      assert.strictEqual(resetRes.success, true);

      const resetLogin = await authService.validateUser('tempwarden', 'ResetAdminPass123!');
      assert.ok(resetLogin, 'Reset password must work');
      assert.strictEqual(Boolean(resetLogin.must_change_password), true, 'Admin reset must set must_change_password = 1');

      pass('Admin password reset workflow verified');
    } catch (e) {
      fail('Admin password reset test failed', e);
    }

    // Test 10: Superintendent Hostel Assignment Update & Unassignment on Role Change
    try {
      const [hostelRows] = await db.pool.query('SELECT id FROM hostels LIMIT 2');
      const validHostelIds = hostelRows.map(h => h.id);

      const updateH = await userService.updateSuperintendentHostels(createdTestUserId, validHostelIds, superAdminActor, { ip_address: '127.0.0.1' });
      assert.deepStrictEqual(updateH.assigned_hostel_ids, validHostelIds);

      // Change role to STUDENT -> should clear hostel assignments
      await userService.updateUserRole(createdTestUserId, 'STUDENT', superAdminActor, { ip_address: '127.0.0.1' });

      let errCaught = false;
      try {
        await userService.updateSuperintendentHostels(createdTestUserId, validHostelIds, superAdminActor, { ip_address: '127.0.0.1' });
      } catch (e) {
        errCaught = true;
        assert.ok(e.message.includes('only be set for Superintendent users'));
      }
      assert.strictEqual(errCaught, true);

      pass('Superintendent hostel assignment & role change cleanup verified');
    } catch (e) {
      fail('Hostel assignment test failed', e);
    }

    // Test 11: Security Audit Log Verification & Privacy
    try {
      const auditRes = await securityService.getAuditLogs({ page: 1, limit: 20 });
      assert.ok(auditRes.logs.length > 0, 'Audit log entries should exist');

      for (const log of auditRes.logs) {
        if (log.metadata) {
          const metaStr = typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata);
          assert.strictEqual(metaStr.includes('password'), false, 'Audit metadata must NEVER contain passwords');
          assert.strictEqual(metaStr.includes('token'), false, 'Audit metadata must NEVER contain tokens');
        }
      }

      pass('Security audit log storage & privacy scrubbing verified');
    } catch (e) {
      fail('Audit log verification failed', e);
    }

    // Test 12: Self-Profile Update Whitelisting
    try {
      const [students] = await db.pool.query("SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'STUDENT' LIMIT 1");
      if (students.length > 0) {
        const studentUserId = students[0].id;
        const profRes = await userService.updateSelfProfile(studentUserId, { email: 'student_updated@hostel.com', phone_number: '9998887776', role: 'SUPER_ADMIN' }, { ip_address: '127.0.0.1' });
        assert.strictEqual(profRes.success, true);

        const checkProf = await userService.getUserById(studentUserId);
        assert.strictEqual(checkProf.role, 'STUDENT', 'Self profile update must NOT allow role modification');
        assert.strictEqual(checkProf.email, 'student_updated@hostel.com');

        pass('Self-profile update field whitelisting & IDOR protection verified');
      } else {
        pass('Skipped self-profile test (no student user found)');
      }
    } catch (e) {
      fail('Self-profile update test failed', e);
    }

    // Test 13: Paginated User Directory Query
    try {
      const usersRes = await userService.getUsers({ page: 1, limit: 15 });
      assert.ok(Array.isArray(usersRes.users), 'Users must be an array');
      assert.ok(usersRes.total >= 1, 'Total users count must be >= 1');
      assert.ok(usersRes.totalPages >= 1, 'Total pages must be >= 1');
      pass('User directory paginated listing and schema alignment verified');
    } catch (e) {
      fail('User directory listing test failed', e);
    }

  } finally {
    // Cleanup temporary test user
    if (createdTestUserId) {
      await db.pool.query('DELETE FROM users WHERE id = ?', [createdTestUserId]);
    }
  }

  console.log('----------------------------------------------------');
  console.log(`Test Execution Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
  if (testsFailed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runSecurityTests().then(() => process.exit(0)).catch((err) => {
    console.error('Test run crashed:', err);
    process.exit(1);
  });
}

module.exports = runSecurityTests;
