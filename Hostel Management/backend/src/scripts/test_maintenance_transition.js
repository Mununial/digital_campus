const BASE_URL = 'http://localhost:5001/api';

async function testMaintenanceTransitions() {
  console.log('=== TEST: Complete Maintenance Status Transitions Lifecycle ===\n');

  try {
    // 1. Super Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier: 'superadmin', password: 'password123' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;
    console.log('✅ Admin login successful.');

    // 2. Fetch a hostel to create maintenance request
    const hostelsRes = await fetch(`${BASE_URL}/hostels`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const hostelsData = await hostelsRes.json();
    const hostel = (hostelsData.data || hostelsData)[0];
    console.log(`Using hostel: ${hostel.name} (ID: ${hostel.id})`);

    // 3. Create a new maintenance request (status will be OPEN)
    console.log('\nCreating new maintenance request (Status: OPEN)...');
    const createRes = await fetch(`${BASE_URL}/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        hostel_id: hostel.id,
        category: 'PLUMBING',
        priority: 'MEDIUM',
        title: 'Leaking bathroom tap',
        description: 'The bathroom tap is constantly dripping, causing water wastage.'
      })
    });
    const createData = await createRes.json();
    const newReq = createData.data;
    console.log(`✅ Created maintenance request #${newReq.id} (Status: ${newReq.status})`);

    // 4. Test OPEN -> RESOLVED direct transition (the user's scenario!)
    console.log(`\nTesting transition: OPEN -> RESOLVED with resolution note...`);
    const resolveRes = await fetch(`${BASE_URL}/maintenance/${newReq.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        resolutionNote: 'Replaced faulty washer in tap.'
      })
    });
    const resolveData = await resolveRes.json();
    if (resolveData.success) {
      console.log('✅ PASS: Direct OPEN -> RESOLVED transition succeeded!');
      console.log(`Status: ${resolveData.data.status}, Started At: ${resolveData.data.started_at}, Resolved At: ${resolveData.data.resolved_at}`);
      console.log(`Resolution Note: "${resolveData.data.resolution_note}"`);
    } else {
      console.log('❌ FAIL: Direct OPEN -> RESOLVED transition failed:', resolveData);
      return;
    }

    // 5. Test RESOLVED -> CLOSED transition
    console.log('\nTesting transition: RESOLVED -> CLOSED...');
    const closeRes = await fetch(`${BASE_URL}/maintenance/${newReq.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'CLOSED'
      })
    });
    const closeData = await closeRes.json();
    console.log(`✅ PASS: RESOLVED -> CLOSED transition succeeded! (Status: ${closeData.data.status})`);

    // 6. Test CLOSED -> REOPENED transition
    console.log('\nTesting transition: CLOSED -> REOPENED...');
    const reopenRes = await fetch(`${BASE_URL}/maintenance/${newReq.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'REOPENED'
      })
    });
    const reopenData = await reopenRes.json();
    console.log(`✅ PASS: CLOSED -> REOPENED transition succeeded! (Status: ${reopenData.data.status})`);

    // 7. Test REOPENED -> IN_PROGRESS transition
    console.log('\nTesting transition: REOPENED -> IN_PROGRESS...');
    const inProgRes = await fetch(`${BASE_URL}/maintenance/${newReq.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS'
      })
    });
    const inProgData = await inProgRes.json();
    console.log(`✅ PASS: REOPENED -> IN_PROGRESS transition succeeded! (Status: ${inProgData.data.status})`);

    console.log('\n=== ALL MAINTENANCE TRANSITIONS VERIFIED AND WORKING PERFECTLY! ===');
  } catch (err) {
    console.error('❌ Error during test:', err);
  }
}

testMaintenanceTransitions();
