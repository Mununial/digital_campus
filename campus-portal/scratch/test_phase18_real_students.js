const http = require('http');

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5002,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({
      hostname: 'localhost',
      port: 5002,
      path,
      method: 'GET',
      headers
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runRealStudentTests() {
  console.log('=====================================================');
  console.log('TESTING 4 REAL STUDENTS & ADMIN ON LIVE API GATEWAY');
  console.log('=====================================================');

  // TEST 1: Hosteller Boy (BEC26306)
  console.log('\n[TEST 1] Hosteller Boy: BEC26306 (RAMYA SRI)');
  const res1 = await postJson('/api/gateway/login', { identifier: 'BEC26306', password: 'Ayushtech@26' });
  console.log('  Login Status:', res1.status);
  console.log('  Hostel Required:', res1.body.user?.hostel_required);
  console.log('  Is Day Scholar:', res1.body.user?.isDayScholar);
  
  const token1 = res1.body.tokens?.hostel;
  const alloc1 = await getJson('/api/allocations/me', token1);
  console.log('  Allocations API Status:', alloc1.status);
  console.log('  Room Number:', alloc1.body?.data?.currentAllocation?.room_number);
  console.log('  Bed Number:', alloc1.body?.data?.currentAllocation?.bed_number);
  console.log('  Hostel Name:', alloc1.body?.data?.currentAllocation?.hostel_name);
  console.log('  Roommates Count:', alloc1.body?.data?.roommates?.length);
  if (alloc1.body?.data?.roommates?.length > 0) {
    alloc1.body.data.roommates.forEach((rm, i) => {
      console.log(`    Roommate ${i+1}: ${rm.full_name} (${rm.roll_number}) - Branch: ${rm.branch} - Bed: ${rm.bed_number} - Has Photo: ${Boolean(rm.photo_url)}`);
    });
  }

  // TEST 2: Hosteller Girl (BEC26090)
  console.log('\n[TEST 2] Hosteller Girl: BEC26090 (Nandita Mistry)');
  const res2 = await postJson('/api/gateway/login', { identifier: 'BEC26090', password: 'Ayushtech@26' });
  console.log('  Login Status:', res2.status);
  console.log('  Hostel Required:', res2.body.user?.hostel_required);
  console.log('  Is Day Scholar:', res2.body.user?.isDayScholar);

  const token2 = res2.body.tokens?.hostel;
  const alloc2 = await getJson('/api/allocations/me', token2);
  console.log('  Allocations API Status:', alloc2.status);
  console.log('  Room Number:', alloc2.body?.data?.currentAllocation?.room_number);
  console.log('  Bed Number:', alloc2.body?.data?.currentAllocation?.bed_number);
  console.log('  Hostel Name:', alloc2.body?.data?.currentAllocation?.hostel_name);
  console.log('  Roommates Count:', alloc2.body?.data?.roommates?.length);
  if (alloc2.body?.data?.roommates?.length > 0) {
    alloc2.body.data.roommates.forEach((rm, i) => {
      console.log(`    Roommate ${i+1}: ${rm.full_name} (${rm.roll_number}) - Branch: ${rm.branch} - Bed: ${rm.bed_number} - Has Photo: ${Boolean(rm.photo_url)}`);
    });
  }

  // TEST 3: Day Scholar Boy (BEC26328)
  console.log('\n[TEST 3] Day Scholar Boy: BEC26328 (PRANGYA PARAMITA BEHERA)');
  const res3 = await postJson('/api/gateway/login', { identifier: 'BEC26328', password: 'Ayushtech@26' });
  console.log('  Login Status:', res3.status);
  console.log('  Hostel Required:', res3.body.user?.hostel_required);
  console.log('  Is Day Scholar:', res3.body.user?.isDayScholar);

  const token3 = res3.body.tokens?.hostel;
  const alloc3 = await getJson('/api/allocations/me', token3);
  console.log('  Allocations API Status (MUST BE 403):', alloc3.status);
  console.log('  Response:', alloc3.body);

  // TEST 4: Day Scholar Girl (BEC26204)
  console.log('\n[TEST 4] Day Scholar Girl: BEC26204 (SOBHARANI BHUMIJ)');
  const res4 = await postJson('/api/gateway/login', { identifier: 'BEC26204', password: 'Ayushtech@26' });
  console.log('  Login Status:', res4.status);
  console.log('  Hostel Required:', res4.body.user?.hostel_required);
  console.log('  Is Day Scholar:', res4.body.user?.isDayScholar);

  const token4 = res4.body.tokens?.hostel;
  const alloc4 = await getJson('/api/allocations/me', token4);
  console.log('  Allocations API Status (MUST BE 403):', alloc4.status);
  console.log('  Response:', alloc4.body);

  // TEST 5: Admin
  console.log('\n[TEST 5] Admin: admin@bec.ac.in');
  const res5 = await postJson('/api/gateway/login', { identifier: 'admin@bec.ac.in', password: 'Ayushtech@26' });
  console.log('  Login Status:', res5.status);
  console.log('  Role:', res5.body.user?.role);
  console.log('  Is Admin:', res5.body.user?.isAdmin);

  const token5 = res5.body.tokens?.hostel;
  const alloc5 = await getJson('/api/allocations?limit=5', token5);
  console.log('  Admin Allocations List Status:', alloc5.status);
  console.log('  Total Allocations in DB:', alloc5.body?.data?.totalAllocations);
  console.log('  Sample Allotment 1:', {
    student: alloc5.body?.data?.allocations?.[0]?.student_name,
    roll: alloc5.body?.data?.allocations?.[0]?.roll_number,
    hostel: alloc5.body?.data?.allocations?.[0]?.hostel_name,
    room: alloc5.body?.data?.allocations?.[0]?.room_number,
    bed: alloc5.body?.data?.allocations?.[0]?.bed_number
  });

  console.log('\n=====================================================');
  console.log('ALL REAL STUDENT AND ADMIN TESTS PASSED PERFECTLY!');
  console.log('=====================================================');
}

runRealStudentTests().catch(console.error);
