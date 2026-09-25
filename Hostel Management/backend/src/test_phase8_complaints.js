const complaintService = require('./services/complaintService');

async function runComplaintTests() {
  console.log('====================================================');
  console.log('   PHASE 8 — COMPLAINT & GRIEVANCE SYSTEM AUDIT');
  console.log('====================================================\n');

  const adminUser = { id: 1, role: 'SUPER_ADMIN' };
  const wardenUser = { id: 2, role: 'SUPERINTENDENT' };
  const studentUser = { id: 3, role: 'STUDENT' };
  const anotherStudentUser = { id: 4, role: 'STUDENT' };

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // 1. Student Create Complaint
  const created = await complaintService.createComplaint({
    title: 'Leaking Pipe in Room 101 Bathroom',
    description: 'Tap is constantly leaking water onto floor.',
    category: 'PLUMBING',
    priority: 'HIGH'
  }, studentUser);

  assert(created && created.title === 'Leaking Pipe in Room 101 Bathroom', 'Student can create complaint with valid category/priority');
  assert(created.status === 'OPEN', 'Initial status defaults to OPEN');
  assert(created.student_id === 1 && created.hostel_id === 1, 'Student ID and Hostel ID are derived from authenticated user context');

  // 2. Student List (only own complaints)
  const studentComplaints = await complaintService.getComplaints({}, studentUser);
  assert(studentComplaints.complaints.every(c => c.student_id === 1), 'Student sees ONLY their own complaints');

  // 3. IDOR Prevention (Student B accessing Student A complaint)
  try {
    await complaintService.getComplaintById(created.id, { id: 4, role: 'STUDENT' });
    assert(false, 'Student accessing another student complaint (should fail)');
  } catch (err) {
    assert(err.status === 403, 'IDOR blocked: Student accessing another student complaint returns 403 Forbidden');
  }

  // 4. Input Validation (Invalid Category / Invalid Priority)
  try {
    await complaintService.createComplaint({
      title: 'Bad Category',
      description: 'Desc',
      category: 'INVALID_CATEGORY'
    }, studentUser);
    assert(false, 'Creating complaint with invalid category (should fail)');
  } catch (err) {
    assert(err.status === 400, 'Invalid complaint category returns 400 Bad Request');
  }

  // 5. Status Transition: OPEN -> IN_PROGRESS
  const assigned = await complaintService.assignComplaint(created.id, 2, wardenUser);
  assert(assigned.status === 'IN_PROGRESS' && assigned.assigned_to === 2, 'Assigning complaint transitions OPEN -> IN_PROGRESS and sets assigned_to');

  // 6. Status Transition: IN_PROGRESS -> RESOLVED (Requires resolution text)
  try {
    await complaintService.updateComplaintStatus(created.id, { status: 'RESOLVED', resolution: '' }, wardenUser);
    assert(false, 'Marking RESOLVED without resolution text (should fail)');
  } catch (err) {
    assert(err.status === 400, 'Marking RESOLVED without resolution text returns 400 Bad Request');
  }

  const resolved = await complaintService.updateComplaintStatus(
    created.id,
    { status: 'RESOLVED', resolution: 'Replaced sink washer and tested tap flow.' },
    wardenUser
  );
  assert(resolved.status === 'RESOLVED' && resolved.resolution !== null, 'Status updated to RESOLVED with valid resolution');

  // 7. Status Transition: Student Reopens Resolved Complaint
  const reopened = await complaintService.updateComplaintStatus(
    created.id,
    { status: 'REOPENED', comment: 'Tap still dripping slowly after 1 hour.' },
    studentUser
  );
  assert(reopened.status === 'REOPENED', 'Student can reopen RESOLVED complaint with comment');

  // 8. History Audit Trail
  const detailed = await complaintService.getComplaintById(created.id, studentUser);
  assert(Array.isArray(detailed.history) && detailed.history.length >= 4, 'Complaint history audit trail records all status transitions');

  // 9. Summary Counters
  const summary = await complaintService.getComplaintSummary(adminUser);
  assert(typeof summary.open === 'number' && typeof summary.inProgress === 'number', 'Summary endpoint returns aggregate stats for dashboards');

  console.log(`\n====================================================`);
  console.log(`   COMPLAINT SYSTEM AUDIT COMPLETED: ${passed}/${total} PASSED`);
  console.log(`====================================================`);

  process.exit(passed === total ? 0 : 1);
}

runComplaintTests().catch(err => {
  console.error('Complaint test suite crashed:', err);
  process.exit(1);
});
