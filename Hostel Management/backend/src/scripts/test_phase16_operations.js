const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001/api';

let adminCookie = '';
let wardenCookie = '';
let student1Cookie = '';
let student2Cookie = '';

async function runTests() {
  console.log('====================================================');
  console.log('    PHASE 16 OPERATIONAL & MAINTENANCE AUDIT TEST   ');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Helper fetch function to handle cookies and JSON
  async function api(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = options.headers || {};
    if (options.cookie) {
      headers['Cookie'] = options.cookie;
    }
    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, { ...options, headers });
    const setCookie = response.headers.get('set-cookie');
    let data = {};
    try {
      data = await response.json();
    } catch (e) {}
    return { status: response.status, data, cookie: setCookie };
  }

  try {
    // 1. Authenticate users
    console.log('\n--- 1. Authentication ---');

    // Admin login
    const adminRes = await api('/auth/login', {
      method: 'POST',
      body: { loginIdentifier: 'superadmin', password: 'password123' }
    });
    adminCookie = adminRes.cookie ? adminRes.cookie.split(';')[0] : '';
    assert(adminRes.data.success && adminRes.data.user?.role === 'SUPER_ADMIN', 'Super Admin logged in successfully.');

    // Warden login
    const wardenRes = await api('/auth/login', {
      method: 'POST',
      body: { loginIdentifier: 'warden', password: 'password123' }
    });
    wardenCookie = wardenRes.cookie ? wardenRes.cookie.split(';')[0] : '';
    assert(wardenRes.data.success && wardenRes.data.user?.role === 'SUPERINTENDENT', 'Superintendent logged in successfully.');

    // Student 1 login
    const std1Res = await api('/auth/login', {
      method: 'POST',
      body: { loginIdentifier: 'student', password: 'password123' }
    });
    student1Cookie = std1Res.cookie ? std1Res.cookie.split(';')[0] : '';
    assert(std1Res.data.success && std1Res.data.user?.role === 'STUDENT', 'Student 1 logged in successfully.');

    // Student 2 login
    const std2Res = await api('/auth/login', {
      method: 'POST',
      body: { loginIdentifier: 'student2', password: 'password123' }
    });
    student2Cookie = std2Res.cookie ? std2Res.cookie.split(';')[0] : '';
    assert(std2Res.data.success && std2Res.data.user?.role === 'STUDENT', 'Student 2 logged in successfully.');

    // 2. Student Maintenance Creation
    console.log('\n--- 2. Student Maintenance Request Submission ---');
    let createdMaintId = null;
    const createRes = await api('/maintenance', {
      method: 'POST',
      cookie: student1Cookie,
      body: {
        title: 'Leaking Sink Tap',
        description: 'Water dripping continuously under the washroom sink.',
        category: 'PLUMBING',
        priority: 'MEDIUM'
      }
    });
    assert(createRes.status === 201 && createRes.data.success, 'Student 1 submitted maintenance request successfully.');
    createdMaintId = createRes.data.data?.id;

    // 3. Student Priority Guard (Cannot pick URGENT directly)
    console.log('\n--- 3. Student Priority Validation ---');
    const priorityErrRes = await api('/maintenance', {
      method: 'POST',
      cookie: student1Cookie,
      body: {
        title: 'Sparking socket',
        description: 'Socket spark',
        category: 'ELECTRICAL',
        priority: 'URGENT'
      }
    });
    assert(priorityErrRes.status === 400, 'Student blocked from creating URGENT priority requests (400 Bad Request).');

    // 4. Student List Scoping (Own requests only)
    console.log('\n--- 4. Student Access & Scoping ---');
    const std1List = await api('/maintenance', { cookie: student1Cookie });
    assert(std1List.data.success && std1List.data.data.requests.length > 0, 'Student 1 can view own maintenance list.');

    // 5. Student IDOR Protection (Cannot view another student request directly)
    console.log('\n--- 5. Student IDOR Protection ---');
    if (createdMaintId) {
      const idorRes = await api(`/maintenance/${createdMaintId}`, { cookie: student2Cookie });
      assert(idorRes.status === 403, 'Student 2 blocked from viewing Student 1 maintenance request (403 Forbidden).');
    }

    // 6. Student Staff Assignment Protection
    console.log('\n--- 6. Student Staff Assignment Guard ---');
    if (createdMaintId) {
      const assignGuardRes = await api(`/maintenance/${createdMaintId}/assign`, {
        method: 'PATCH',
        cookie: student1Cookie,
        body: { assigned_to: 2 }
      });
      assert(assignGuardRes.status === 403, 'Student blocked from assigning staff (403 Forbidden).');
    }

    // 7. Student Status Guard (Cannot mark resolved directly)
    console.log('\n--- 7. Student Status Transition Guard ---');
    if (createdMaintId) {
      const statusGuardRes = await api(`/maintenance/${createdMaintId}/status`, {
        method: 'PATCH',
        cookie: student1Cookie,
        body: { status: 'RESOLVED', resolutionNote: 'Fixed myself' }
      });
      assert(statusGuardRes.status === 403, 'Student blocked from resolving request (403 Forbidden).');
    }

    // 8. Staff Assignment & Status Progress
    console.log('\n--- 8. Staff Assignment & Workflow Progress ---');
    if (createdMaintId) {
      // Assign staff by Warden
      const assignRes = await api(`/maintenance/${createdMaintId}/assign`, {
        method: 'PATCH',
        cookie: wardenCookie,
        body: { assigned_to: 2 }
      });
      assert(assignRes.data.success && assignRes.data.data?.assigned_to === 2, 'Warden assigned maintenance to staff user.');

      // Mark IN_PROGRESS
      const progressRes = await api(`/maintenance/${createdMaintId}/status`, {
        method: 'PATCH',
        cookie: wardenCookie,
        body: { status: 'IN_PROGRESS' }
      });
      assert(progressRes.data.success && progressRes.data.data?.status === 'IN_PROGRESS', 'Warden updated status to IN_PROGRESS.');
    }

    // 9. Invalid Status Transition Guard
    console.log('\n--- 9. Invalid Status Transition Guard ---');
    if (createdMaintId) {
      const invalidStatusRes = await api(`/maintenance/${createdMaintId}/status`, {
        method: 'PATCH',
        cookie: wardenCookie,
        body: { status: 'CLOSED' }
      });
      assert(invalidStatusRes.status === 400, 'Invalid status transition rejected cleanly (400 Bad Request).');
    }

    // 10. Resolution by Staff
    console.log('\n--- 10. Request Resolution ---');
    if (createdMaintId) {
      const resolveRes = await api(`/maintenance/${createdMaintId}/status`, {
        method: 'PATCH',
        cookie: wardenCookie,
        body: { status: 'RESOLVED', resolutionNote: 'Replaced washbasin rubber washer.' }
      });
      assert(resolveRes.data.success && resolveRes.data.data?.status === 'RESOLVED', 'Warden resolved maintenance request with note.');
    }

    // 11. Student Reopen Workflow
    console.log('\n--- 11. Student Reopen Workflow ---');
    if (createdMaintId) {
      const reopenRes = await api(`/maintenance/${createdMaintId}/status`, {
        method: 'PATCH',
        cookie: student1Cookie,
        body: { status: 'REOPENED' }
      });
      assert(reopenRes.data.success && reopenRes.data.data?.status === 'REOPENED', 'Student 1 reopened resolved maintenance request.');
    }

    // 12. Staff Priority Elevation
    console.log('\n--- 12. Priority Elevation ---');
    if (createdMaintId) {
      const priorityRes = await api(`/maintenance/${createdMaintId}/priority`, {
        method: 'PATCH',
        cookie: wardenCookie,
        body: { priority: 'URGENT', reason: 'Water leaking into floor beneath' }
      });
      assert(priorityRes.data.success && priorityRes.data.data?.priority === 'URGENT', 'Warden elevated priority to URGENT.');
    }

    // 13. Room Inspection Creation
    console.log('\n--- 13. Room Inspection Creation ---');
    let createdInspId = null;
    const inspRes = await api('/inspections', {
      method: 'POST',
      cookie: wardenCookie,
      body: {
        hostel_id: 1,
        floor_id: 1,
        room_id: 1,
        inspection_date: new Date().toISOString().split('T')[0],
        cleanliness_status: 'GOOD',
        electrical_status: 'GOOD',
        plumbing_status: 'ATTENTION_REQUIRED',
        furniture_status: 'GOOD',
        bed_status: 'GOOD',
        safety_status: 'GOOD',
        remarks: 'Tap requires periodic checking.'
      }
    });
    assert(inspRes.status === 201 && inspRes.data.success, 'Warden recorded room inspection successfully.');
    createdInspId = inspRes.data.data?.id;

    // 14. Room Inspection Student Guard
    console.log('\n--- 14. Student Inspection Creation Protection ---');
    const stdInspGuard = await api('/inspections', {
      method: 'POST',
      cookie: student1Cookie,
      body: {
        hostel_id: 1,
        floor_id: 1,
        room_id: 1,
        cleanliness_status: 'GOOD'
      }
    });
    assert(stdInspGuard.status === 403, 'Student blocked from creating room inspection (403 Forbidden).');

    // 15. Room Location Hierarchy Validation
    console.log('\n--- 15. Location Relationship Validation ---');
    const locGuard = await api('/inspections', {
      method: 'POST',
      cookie: wardenCookie,
      body: {
        hostel_id: 1,
        floor_id: 999,
        room_id: 1
      }
    });
    assert(locGuard.status === 400, 'Server rejected mismatched location hierarchy (400 Bad Request).');

    // 16. Operations Summary API
    console.log('\n--- 16. Operations Summary KPI API ---');
    const opsRes = await api('/operations/summary', { cookie: wardenCookie });
    assert(opsRes.data.success && opsRes.data.data?.maintenanceMetrics, 'Operations summary KPI fetched successfully.');

    // 17. Operations Summary Student Protection
    console.log('\n--- 17. Operations Summary Access Guard ---');
    const opsGuard = await api('/operations/summary', { cookie: student1Cookie });
    assert(opsGuard.status === 403, 'Student blocked from operations summary (403 Forbidden).');

    // 18. Activity Log Integration
    console.log('\n--- 18. Operations Activity Logging Integration ---');
    const activityRes = await api('/activity?module=OPERATIONS', { cookie: adminCookie });
    assert(activityRes.data.success && activityRes.data.data?.activities?.length > 0, 'Phase 15 Activity Log verified for OPERATIONS module events.');

    // 19. Pagination & Search Filtering
    console.log('\n--- 19. Pagination & Search Filtering ---');
    const searchRes = await api('/maintenance?search=Leaking', { cookie: adminCookie });
    assert(searchRes.data.success && Array.isArray(searchRes.data.data?.requests), 'Maintenance search filtering executed successfully.');

    // 20. Room Inspection History
    console.log('\n--- 20. Room Inspection History ---');
    const historyRes = await api('/inspections/room/1/history', { cookie: wardenCookie });
    assert(historyRes.data.success && historyRes.data.data?.history?.length > 0, 'Room inspection history timeline retrieved.');

  } catch (globalErr) {
    console.error('\nGlobal Test Runner Error:', globalErr.message);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
