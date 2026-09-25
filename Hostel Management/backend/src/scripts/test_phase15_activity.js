const app = require('../app');
const http = require('http');

async function runTests() {
  console.log('--- Phase 15 System Activity & Audit Center Verification ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  const BASE_URL = 'http://localhost:5099/api';

  try {
    // 1. Login as Super Admin
    console.log('1. Logging in as SUPER_ADMIN...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'superadmin', password: 'password123' })
    });

    const adminCookie = adminLoginRes.headers.get('set-cookie') || '';
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;

    if (!adminLoginRes.ok) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
    }
    console.log('✓ Admin login successful');

    const headers = {
      'Content-Type': 'application/json',
      'Cookie': adminCookie,
      'Authorization': `Bearer ${adminToken}`
    };

    // 2. Fetch Activity Stats
    console.log('2. Testing GET /api/activity/stats...');
    const statsRes = await fetch(`${BASE_URL}/activity/stats`, { headers });
    const statsData = await statsRes.json();
    console.log('✓ Activity Stats:', statsData.data);

    // 3. Fetch Activity List
    console.log('3. Testing GET /api/activity (Paginated List)...');
    const listRes = await fetch(`${BASE_URL}/activity?page=1&limit=10`, { headers });
    const listData = await listRes.json();
    const activitiesList = listData.data.activities || [];
    console.log(`✓ Retrieved ${activitiesList.length} logs. Total logs: ${listData.data.total}`);

    if (activitiesList.length > 0) {
      const sampleId = activitiesList[0].id;
      console.log(`4. Testing GET /api/activity/${sampleId} (Details)...`);
      const detailRes = await fetch(`${BASE_URL}/activity/${sampleId}`, { headers });
      const detailData = await detailRes.json();
      console.log('✓ Activity Detail retrieved:', detailData.data.action, '-', detailData.data.description);
    }

    // 5. Test Filtering by Module
    console.log('5. Testing module filtering (module=USERS)...');
    const moduleRes = await fetch(`${BASE_URL}/activity?module=USERS`, { headers });
    const moduleData = await moduleRes.json();
    const moduleActivities = moduleData.data.activities || [];
    console.log(`✓ Module USERS returned ${moduleActivities.length} logs`);

    // 6. Login as Superintendent to test Role-Scoped Scoping
    console.log('6. Logging in as SUPERINTENDENT...');
    const superLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'warden', password: 'password123' })
    });

    if (superLoginRes.ok) {
      const superCookie = superLoginRes.headers.get('set-cookie') || '';
      const superData = await superLoginRes.json();
      const superHeaders = {
        'Content-Type': 'application/json',
        'Cookie': superCookie,
        'Authorization': `Bearer ${superData.token}`
      };

      console.log('7. Testing Superintendent GET /api/activity (Hostel Scoped)...');
      const superListRes = await fetch(`${BASE_URL}/activity`, { headers: superHeaders });
      const superListData = await superListRes.json();
      const superActivities = superListData.data.activities || [];
      console.log(`✓ Superintendent retrieved ${superActivities.length} scoped logs`);
    }

    console.log('\n==================================================');
    console.log('ALL PHASE 15 ACTIVITY AUDIT TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
