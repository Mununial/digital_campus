const jwt = require('jsonwebtoken');
const env = require('../config/env');

const BASE_URL = 'http://localhost:5001/api';

function generateToken(userId, role, username) {
  return jwt.sign({ id: userId, role, username }, env.JWT.secret, { expiresIn: '1h' });
}

async function runApiAudit() {
  console.log('=== SYSTEM-WIDE API ENDPOINT AUDIT (REAL MYSQL) ===');

  const superAdminToken = generateToken(2, 'SUPER_ADMIN', 'bechostelmanagement@gmail.com');
  const wardenToken = generateToken(1, 'SUPERINTENDENT', 'superadmin');
  const studentToken = generateToken(3, 'STUDENT', '2501316050');

  const endpoints = [
    { path: '/dashboard/overview', roles: { admin: 200, warden: 200, student: 403 } },
    { path: '/hostels', roles: { admin: 200, warden: 200, student: 403 } },
    { path: '/students', roles: { admin: 200, warden: 200, student: 403 } },
    { path: '/attendance/hostel/1', roles: { admin: 200, warden: 200, student: 403 } },
    { path: '/attendance/me', roles: { admin: 200, warden: 200, student: 200 } },
    { path: '/notices', roles: { admin: 200, warden: 200, student: 200 } },
    { path: '/complaints', roles: { admin: 200, warden: 200, student: 200 } },
    { path: '/visitors', roles: { admin: 200, warden: 200, student: 200 } },
    { path: '/mess/menus', roles: { admin: 200, warden: 200, student: 200 } },
    { path: '/fees/structures', roles: { admin: 200, warden: 200, student: 403 } },
    { path: '/reports/overview', roles: { admin: 200, warden: 200, student: 403 } },
    { path: '/allocations', roles: { admin: 200, warden: 200, student: 403 } },
    { path: '/maintenance', roles: { admin: 200, warden: 200, student: 200 } },
    { path: '/activity', roles: { admin: 200, warden: 200, student: 403 } },
    { path: '/master/summary', roles: { admin: 200, warden: 200, student: 200 } },
    { path: '/master/data-integrity', roles: { admin: 200, warden: 403, student: 403 } }
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const ep of endpoints) {
    const roleTokens = [
      { name: 'SUPER_ADMIN', token: superAdminToken, expected: ep.roles.admin },
      { name: 'SUPERINTENDENT', token: wardenToken, expected: ep.roles.warden },
      { name: 'STUDENT', token: studentToken, expected: ep.roles.student }
    ];

    for (const r of roleTokens) {
      try {
        const res = await fetch(`${BASE_URL}${ep.path}`, {
          headers: { Authorization: `Bearer ${r.token}` }
        });
        if (res.status === r.expected) {
          console.log(` ✅ PASS: [${r.name}] ${ep.path} -> ${res.status}`);
          passedCount++;
        } else {
          console.error(` ❌ FAIL: [${r.name}] ${ep.path} -> Expected ${r.expected}, got ${res.status}`);
          failedCount++;
        }
      } catch (err) {
        console.error(` ❌ ERROR: [${r.name}] ${ep.path} -> ${err.message}`);
        failedCount++;
      }
    }
  }

  console.log(`\n=== API AUDIT SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED ===`);
  process.exit(failedCount > 0 ? 1 : 0);
}

runApiAudit();
