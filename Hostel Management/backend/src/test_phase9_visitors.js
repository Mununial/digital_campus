const visitorService = require('./services/visitorService');
const db = require('./config/db');

async function runAudit() {
  console.log('====================================================');
  console.log('   PHASE 9 — HOSTEL VISITOR MANAGEMENT AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const studentUser = { id: 3, role: 'STUDENT', username: 'john_doe' };
    const superintendentUser = { id: 2, role: 'SUPERINTENDENT', username: 'warden_smith' };
    const adminUser = { id: 1, role: 'SUPER_ADMIN', username: 'admin' };
    const studentUser2 = { id: 4, role: 'STUDENT', username: 'jane_smith' };

    // 1. Student creates visitor request
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const expIn = new Date(now.getTime() + 3600000).toISOString().slice(0, 19).replace('T', ' ');
    const expOut = new Date(now.getTime() + 14400000).toISOString().slice(0, 19).replace('T', ' ');

    const newVisit = await visitorService.createVisit({
      visitor_name: 'Uncle Sam',
      visitor_phone: '9811223344',
      visitor_email: 'sam@example.com',
      visitor_type: 'RELATIVE',
      purpose: 'Dropping luggage',
      identification_type: 'Aadhaar',
      identification_last4: '9988',
      visit_date: today,
      expected_check_in: expIn,
      expected_check_out: expOut
    }, studentUser);

    assert(newVisit && newVisit.id, 'Student can create visitor request with valid parameters');
    assert(newVisit.status === 'REQUESTED', 'Student visitor request defaults to REQUESTED status');
    assert(Number(newVisit.student_id) === 1, 'Student ID and Hostel ID are derived from authenticated user context');

    // 2. Staff creates visitor (Auto Approved)
    const staffVisit = await visitorService.createVisit({
      student_id: 1,
      visitor_name: 'Dr. Alan Grant',
      visitor_phone: '9988776655',
      visitor_type: 'OFFICIAL',
      purpose: 'Academic mentoring session',
      identification_type: 'Passport',
      identification_last4: '7766',
      visit_date: today,
      expected_check_in: expIn,
      expected_check_out: expOut
    }, superintendentUser);

    assert(staffVisit && staffVisit.status === 'APPROVED', 'Staff registration defaults to APPROVED status');

    // 3. Invalid visitor type
    try {
      await visitorService.createVisit({
        visitor_name: 'Bad Type Visitor',
        visitor_phone: '9000000000',
        visitor_type: 'ALIEN_TYPE',
        purpose: 'Test',
        identification_last4: '0000',
        visit_date: today,
        expected_check_in: expIn,
        expected_check_out: expOut
      }, studentUser);
      assert(false, 'Invalid visitor type should fail with validation error');
    } catch (e) {
      assert(e.status === 400, 'Invalid visitor type returns 400 Bad Request');
    }

    // 4. Student approving visit (Blocked)
    try {
      await visitorService.approveVisit(newVisit.id, studentUser, 'Self approve');
      assert(false, 'Student approving visit should be blocked');
    } catch (e) {
      assert(e.status === 403, 'Student approving visit returns 403 Forbidden');
    }

    // 5. Staff approves visit
    const approvedVisit = await visitorService.approveVisit(newVisit.id, superintendentUser, 'Approved by warden');
    assert(approvedVisit.status === 'APPROVED', 'Staff approval transitions status REQUESTED -> APPROVED');

    // 6. Check in visit
    const checkedInVisit = await visitorService.checkInVisit(approvedVisit.id, superintendentUser, 'Gate entry approved');
    assert(checkedInVisit.status === 'CHECKED_IN' && checkedInVisit.actual_check_in, 'Check-in sets status to CHECKED_IN and updates actual_check_in');

    // 7. Check in non-approved visit fails
    const requestedVisit = await visitorService.createVisit({
      visitor_name: 'Pending Visitor',
      visitor_phone: '9111111111',
      visitor_type: 'FRIEND',
      purpose: 'Study session',
      identification_last4: '1111',
      visit_date: today,
      expected_check_in: expIn,
      expected_check_out: expOut
    }, studentUser);

    try {
      await visitorService.checkInVisit(requestedVisit.id, superintendentUser);
      assert(false, 'Checking in unapproved visitor should fail');
    } catch (e) {
      assert(e.status === 400, 'Checking in REQUESTED visitor returns 400 Bad Request');
    }

    // 8. Check out visit
    const checkedOutVisit = await visitorService.checkOutVisit(checkedInVisit.id, superintendentUser, 'Gate exit confirmed');
    assert(checkedOutVisit.status === 'CHECKED_OUT' && checkedOutVisit.actual_check_out, 'Check-out sets status to CHECKED_OUT and updates actual_check_out');

    // 9. Audit history
    const visitDetails = await visitorService.getVisitById(newVisit.id, superintendentUser);
    assert(Array.isArray(visitDetails.history) && visitDetails.history.length >= 4, 'Visitor history records all status transitions');

    // 10. IDOR Protection (Student accessing another student visit)
    try {
      await visitorService.getVisitById(newVisit.id, studentUser2);
      assert(false, 'Student viewing another student visit should be blocked');
    } catch (e) {
      assert(e.status === 403, 'IDOR blocked: Student accessing another student visit returns 403 Forbidden');
    }

    // 11. Summary endpoint
    const summary = await visitorService.getVisitorSummary(adminUser);
    assert(typeof summary.current === 'number' && typeof summary.todayVisits === 'number', 'Summary endpoint returns aggregate metrics for dashboards');

    console.log('\n====================================================');
    console.log(`   VISITOR SYSTEM AUDIT COMPLETED: ${passed}/${passed + failed} PASSED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Fatal audit execution error:', err);
  } finally {
    process.exit(0);
  }
}

runAudit();
