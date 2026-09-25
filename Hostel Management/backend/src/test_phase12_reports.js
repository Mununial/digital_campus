const reportService = require('./services/reportService');

/**
 * PHASE 12 — REPORTS & ANALYTICS AUDIT TEST SUITE
 */
async function runAudit() {
  console.log('\n====================================================');
  console.log('   PHASE 12 — REPORTS & ANALYTICS CENTER AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      failed++;
    }
  };

  const superAdminUser = { id: 1, role: 'SUPER_ADMIN', username: 'admin' };
  const superIntendentUser = { id: 2, role: 'SUPERINTENDENT', username: 'super1' };
  const studentUser = { id: 3, role: 'STUDENT', username: 'student1' };

  try {
    // 1. Date Validation Tests
    try {
      reportService.validateDateRange('2026-08-30', '2026-08-01');
      assert(false, 'Reject date_from > date_to');
    } catch (err) {
      assert(err.status === 400, 'Reject date_from > date_to (400 Bad Request)');
    }

    try {
      reportService.validateDateRange('2024-01-01', '2026-08-23');
      assert(false, 'Reject date range > 365 days');
    } catch (err) {
      assert(err.status === 400, 'Reject date range > 365 days (400 Bad Request)');
    }

    try {
      reportService.validateDateRange('invalid-date', '2026-08-23');
      assert(false, 'Reject invalid date format');
    } catch (err) {
      assert(err.status === 400, 'Reject invalid date format (400 Bad Request)');
    }

    // 2. Role Scoping & Authorization Tests
    try {
      await reportService.resolveHostelScope(studentUser);
      assert(false, 'Reject student access to admin reports center');
    } catch (err) {
      assert(err.status === 403, 'Reject student access to admin reports center (403 Forbidden)');
    }

    const saScope = await reportService.resolveHostelScope(superAdminUser, 'all');
    assert(saScope === null, 'Super Admin scope defaults to ALL hostels (null)');

    // 3. Overview Report Generation
    const overview = await reportService.getOverviewReport(superAdminUser, { date_from: '2026-08-01', date_to: '2026-08-23' });
    assert(overview && overview.infrastructure && overview.fees, 'Overview report returns expected structure');
    assert(typeof overview.infrastructure.occupancyPercentage === 'number', 'Occupancy percentage calculated as number');
    assert(typeof overview.fees.collectionRate === 'number', 'Fee collection rate calculated as number');

    // 4. Student Distribution Report
    const studentReport = await reportService.getStudentReport(superAdminUser);
    assert(studentReport && Array.isArray(studentReport.byBranch), 'Student report contains branch breakdown');
    assert(Array.isArray(studentReport.byHostel), 'Student report contains hostel distribution');

    // 5. Attendance Report & Daily Trend
    const attReport = await reportService.getAttendanceReport(superAdminUser, { date_from: '2026-08-01', date_to: '2026-08-23' });
    assert(attReport && attReport.summary && Array.isArray(attReport.dailyTrend), 'Attendance report includes daily trend');
    assert(Array.isArray(attReport.hostelComparison), 'Attendance report includes cross-hostel comparison');

    // 6. Occupancy Report
    const occReport = await reportService.getOccupancyReport(superAdminUser);
    assert(occReport && occReport.overall && Array.isArray(occReport.byHostel), 'Occupancy report returns hostel occupancy list');

    // 7. Complaint Report & Resolution Rate
    const compReport = await reportService.getComplaintReport(superAdminUser, { date_from: '2026-08-01', date_to: '2026-08-23' });
    assert(compReport && compReport.summary && typeof compReport.summary.resolutionRate === 'number', 'Complaint report calculates resolution rate');
    assert(Array.isArray(compReport.byCategory) && Array.isArray(compReport.trend), 'Complaint report includes category breakdown & trend');

    // 8. Visitor Report
    const visReport = await reportService.getVisitorReport(superAdminUser, { date_from: '2026-08-01', date_to: '2026-08-23' });
    assert(visReport && visReport.summary && Array.isArray(visReport.trend), 'Visitor report includes visit trends');

    // 9. Mess Meal Participation Report
    const messReport = await reportService.getMessReport(superAdminUser, { date_from: '2026-08-01', date_to: '2026-08-23' });
    assert(messReport && Array.isArray(messReport.byMealType) && messReport.byMealType.length === 4, 'Mess report covers 4 meal types');

    // 10. Fee Collection & Financial Report
    const feeReport = await reportService.getFeeReport(superAdminUser, { date_from: '2026-08-01', date_to: '2026-08-23' });
    assert(feeReport && feeReport.summary && Array.isArray(feeReport.dailyCollectionTrend), 'Fee report returns daily collection trend');
    assert(typeof feeReport.summary.totalExpected === 'number' && typeof feeReport.summary.totalCollected === 'number', 'Fee summary returns numerical totals');

  } catch (err) {
    console.error('Audit execution error:', err);
  }

  console.log('\n====================================================');
  console.log(`   REPORTS AUDIT COMPLETED: ${passed}/${passed + failed} PASSED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAudit();
