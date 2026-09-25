const allocationService = require('./services/allocationService');
const db = require('./config/db');

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 13: ALLOCATIONS & TRANSFERS AUDIT TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const testUserAdmin = { id: 1, username: 'superadmin', role: 'SUPER_ADMIN' };
  const testUserWarden = { id: 2, username: 'warden', role: 'SUPERINTENDENT' };
  const testUserStudent = { id: 3, username: 'student', role: 'STUDENT' };

  const assert = (condition, description) => {
    if (condition) {
      console.log(`✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${description}`);
      failed++;
    }
  };

  try {
    // 1. Fetch initial allocations list
    const initialList = await allocationService.getAllocations({ page: 1, limit: 10 }, testUserAdmin);
    assert(initialList && Array.isArray(initialList.allocations), 'Admin can fetch allocations list.');

    // 2. Fetch student personal allocation profile
    const myAlloc = await allocationService.getMyAllocation(testUserStudent);
    assert(myAlloc && myAlloc.student && Array.isArray(myAlloc.history), 'Student can fetch personal accommodation profile.');

    // 3. Superintendent scope check
    let wardenForbidden = false;
    try {
      await allocationService.getAllocations({ hostel_id: 999 }, testUserWarden);
    } catch (err) {
      if (err.status === 403) wardenForbidden = true;
    }
    assert(wardenForbidden, 'Superintendent blocked from unassigned hostel allocations (403).');

    // 4. Student blocked from admin allocation list
    let studentForbidden = false;
    try {
      await allocationService.getAllocations({}, testUserStudent);
    } catch (err) {
      if (err.status === 403) studentForbidden = true;
    }
    assert(studentForbidden, 'Student blocked from administrative allocations endpoint (403).');

    // 5. Test Available Beds query
    const beds = await allocationService.getAvailableBeds(1, null, testUserAdmin);
    assert(Array.isArray(beds), 'Available beds query succeeds for valid hostel.');

    // 6. Test Invalid Checkout Reason Rejection
    let invalidReasonRejection = false;
    try {
      await allocationService.checkoutStudent(1, { checkout_reason: 'INVALID_REASON' }, testUserAdmin);
    } catch (err) {
      if (err.status === 400) invalidReasonRejection = true;
    }
    assert(invalidReasonRejection, 'Checkout rejects invalid reason enum (400).');

    // 7. Test Checkout workflow
    const checkoutRes = await allocationService.checkoutStudent(1, {
      checkout_date: '2026-08-23',
      checkout_reason: 'COURSE_COMPLETED',
      custom_reason: 'Graduated from college'
    }, testUserAdmin);
    assert(checkoutRes && checkoutRes.success === true, 'Checkout student succeeds with valid reason.');

    // 8. Test re-allocation after checkout
    const reAllocRes = await allocationService.allocateStudent({
      student_id: 1,
      hostel_id: 1,
      room_id: 1,
      bed_id: 1,
      allocated_from: '2026-08-23'
    }, testUserAdmin);
    assert(reAllocRes && reAllocRes.success === true, 'Re-allocation succeeds for checked-out student.');

    // 9. Test duplicate active allocation prevention
    let dupAllocPrevented = false;
    try {
      await allocationService.allocateStudent({
        student_id: 1,
        hostel_id: 1,
        room_id: 1,
        bed_id: 2,
        allocated_from: '2026-08-23'
      }, testUserAdmin);
    } catch (err) {
      if (err.status === 400) dupAllocPrevented = true;
    }
    assert(dupAllocPrevented, 'Duplicate active allocation for same student rejected (400).');

    // 10. Test Transfer workflow (Same Hostel)
    const transferRes = await allocationService.transferStudent(reAllocRes.allocation_id, {
      new_hostel_id: 1,
      new_room_id: 1,
      new_bed_id: 2,
      transfer_date: '2026-08-23',
      transfer_reason: 'Requested room change'
    }, testUserAdmin);
    assert(transferRes && transferRes.success === true, 'Student transfer succeeds to valid available bed.');

    // 11. Test Superintendent unauthorized destination transfer rejection
    let wardenDestRejected = false;
    try {
      await allocationService.transferStudent(transferRes.new_allocation_id, {
        new_hostel_id: 999,
        new_room_id: 1,
        new_bed_id: 3,
        transfer_date: '2026-08-23'
      }, testUserWarden);
    } catch (err) {
      if (err.status === 403) wardenDestRejected = true;
    }
    assert(wardenDestRejected, 'Superintendent transfer to unauthorized destination hostel rejected (403).');

    // 12. Test Consistency Audit Endpoint
    const auditRes = await allocationService.getConsistencyReport(testUserAdmin);
    assert(auditRes && typeof auditRes.isConsistent === 'boolean', 'Consistency audit report executes safely.');

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal test runner error:', error);
    process.exit(1);
  }
}

runTests();
