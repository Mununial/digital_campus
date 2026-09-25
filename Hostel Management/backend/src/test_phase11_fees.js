const FeeService = require('./services/feeService');
const FeeController = require('./controllers/feeController');
const { pool } = require('./config/db');

// Mock Express req/res objects for testing controller logic directly
const createMockReqRes = (user, body = {}, params = {}, query = {}) => {
  const req = { user, body, params, query };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData };
};

const runAudit = async () => {
  console.log('\n====================================================');
  console.log('   PHASE 11 — HOSTEL FEES & PAYMENT MANAGEMENT AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (condition, testName) => {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  };

  const adminUser = { id: 1, role: 'SUPER_ADMIN', username: 'admin' };
  const superUser = { id: 2, role: 'SUPERINTENDENT', username: 'superintendent' };
  const studentUser = { id: 3, role: 'STUDENT', username: 'student' };

  try {
    // 1. Fee Structure Creation (Super Admin & Superintendent validation)
    const fs1 = await FeeService.createFeeStructure({
      hostelId: 1,
      feeType: 'HOSTEL_FEE',
      name: 'Hostel Maintenance & Rent 2027-28',
      description: 'Annual hostel accommodation fee',
      amount: 30000.00,
      frequency: 'YEARLY',
      academicYear: '2027-28',
      createdBy: adminUser.id
    });
    assert(fs1 && fs1.id && fs1.amount === 30000.00, 'Super Admin can create fee structure');

    // 2. Reject global fee structure creation by Superintendent
    const { req: req2, res: res2, getStatus: getStatus2 } = createMockReqRes(
      superUser,
      { hostel_id: null, fee_type: 'MESS_FEE', name: 'Global Mess', amount: 15000, academic_year: '2027-28' }
    );
    await FeeController.createFeeStructure(req2, res2, () => {});
    assert(getStatus2() === 400, 'Reject global fee structure creation by Superintendent');

    // 3. Reject fee structure creation by Student
    const { req: req3, res: res3, getStatus: getStatus3 } = createMockReqRes(
      studentUser,
      { hostel_id: 1, fee_type: 'HOSTEL_FEE', name: 'Student Fee', amount: 1000, academic_year: '2027-28' }
    );
    await FeeController.createFeeStructure(req3, res3, () => {});
    assert(getStatus3() === 403, 'Reject fee structure creation by Student (403 Forbidden)');

    // 4. Student Fee Assignment
    const dueDateFuture = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const sfRecord = await FeeService.assignStudentFee({
      studentId: 1,
      feeStructureId: fs1.id,
      academicYear: '2027-28',
      amount: 30000.00,
      dueDate: dueDateFuture,
      createdBy: adminUser.id
    });
    assert(
      sfRecord && sfRecord.amount === 30000.00 && sfRecord.paid_amount === 0.00 && sfRecord.status === 'PENDING',
      'Assign fee to student with snapshot amount and PENDING status'
    );

    // 5. Prevent duplicate fee assignment for same structure and academic year
    try {
      await FeeService.assignStudentFee({
        studentId: 1,
        feeStructureId: fs1.id,
        academicYear: '2027-28',
        amount: 30000.00,
        dueDate: dueDateFuture,
        createdBy: adminUser.id
      });
      assert(false, 'Prevent duplicate fee assignment');
    } catch (err) {
      assert(err.message.includes('already been assigned'), 'Prevent duplicate fee assignment for same structure');
    }

    // 6. Partial Payment Recording (₹10,000 against ₹30,000 fee)
    const receipt1 = await FeeService.recordPayment({
      studentFeeId: sfRecord.id,
      amount: 10000.00,
      paymentMethod: 'UPI',
      transactionReference: 'UPI_TEST_999901',
      notes: 'First installment',
      receivedBy: superUser.id,
      userRole: superUser.role
    });
    assert(
      receipt1 && receipt1.receipt_number && receipt1.receipt_number.startsWith('FEE-2026-'),
      'Record partial payment and generate unique receipt number'
    );

    const updatedSf1 = await FeeService.getStudentFeeById(sfRecord.id);
    assert(
      updatedSf1.paid_amount === 10000.00 && updatedSf1.remaining_amount === 20000.00 && updatedSf1.status === 'PARTIAL',
      'Update student fee paid_amount to ₹10,000 and status to PARTIAL'
    );

    // 7. Overpayment Rejection (Attempting ₹25,000 payment when remaining is ₹20,000)
    try {
      await FeeService.recordPayment({
        studentFeeId: sfRecord.id,
        amount: 25000.00,
        paymentMethod: 'CASH',
        receivedBy: superUser.id,
        userRole: superUser.role
      });
      assert(false, 'Reject overpayment');
    } catch (err) {
      assert(err.message.includes('exceeds remaining balance'), 'Reject payment exceeding remaining balance');
    }

    // 8. Zero / Negative Payment Rejection
    try {
      await FeeService.recordPayment({
        studentFeeId: sfRecord.id,
        amount: 0.00,
        paymentMethod: 'CASH',
        receivedBy: superUser.id,
        userRole: superUser.role
      });
      assert(false, 'Reject zero amount payment');
    } catch (err) {
      assert(err.message.includes('greater than 0'), 'Reject zero or negative payment amount');
    }

    // 9. Full Settlement Payment (Paying remaining ₹20,000)
    const receipt2 = await FeeService.recordPayment({
      studentFeeId: sfRecord.id,
      amount: 20000.00,
      paymentMethod: 'BANK_TRANSFER',
      transactionReference: 'NFT_TEST_888802',
      notes: 'Final settlement',
      receivedBy: superUser.id,
      userRole: superUser.role
    });
    assert(receipt2 && receipt2.receipt_number !== receipt1.receipt_number, 'Generate distinct second receipt');

    const updatedSf2 = await FeeService.getStudentFeeById(sfRecord.id);
    assert(
      updatedSf2.paid_amount === 30000.00 && updatedSf2.remaining_amount === 0.00 && updatedSf2.status === 'PAID',
      'Update fee status to PAID when fully settled'
    );

    // 10. Reject payment on fully PAID fee
    try {
      await FeeService.recordPayment({
        studentFeeId: sfRecord.id,
        amount: 100.00,
        paymentMethod: 'CASH',
        receivedBy: superUser.id,
        userRole: superUser.role
      });
      assert(false, 'Reject payment on PAID fee');
    } catch (err) {
      assert(err.message.includes('already been fully paid'), 'Block payment attempts on fully PAID fee');
    }

    // 11. Fee Waiver Workflow (Super Admin waiving student fee 3)
    const waivedFee = await FeeService.waiveStudentFee({
      studentFeeId: 3,
      waiverReason: 'Financial hardship scholarship waiver approved by Dean',
      waivedBy: adminUser.id
    });
    assert(waivedFee && waivedFee.status === 'WAIVED' && waivedFee.waiver_reason, 'Super Admin can waive student fee');

    // 12. Reject Fee Waiver by Superintendent (403 Forbidden)
    const { req: req12, res: res12, getStatus: getStatus12 } = createMockReqRes(
      superUser,
      { waiver_reason: 'Superintendent attempt' },
      { id: '1' }
    );
    await FeeController.waiveStudentFee(req12, res12, () => {});
    assert(getStatus12() === 403, 'Reject fee waiver by Superintendent (403 Forbidden)');

    // 13. IDOR Security: Student A requesting Student B's receipt
    const otherStudentUser = { id: 99, role: 'STUDENT', username: 'other_student' };
    const { req: req13, res: res13, getStatus: getStatus13 } = createMockReqRes(
      otherStudentUser,
      {},
      { paymentId: String(receipt1.id) }
    );
    await FeeController.getPaymentReceipt(req13, res13, () => {});
    assert(getStatus13() === 403, 'IDOR Protection: Student cannot view another student\'s receipt');

    // 14. Audit History Verification
    const fullFeeDetail = await FeeService.getStudentFeeById(sfRecord.id);
    assert(
      fullFeeDetail.history && fullFeeDetail.history.length >= 3,
      'Audit history logs fee events (ASSIGNED, PAYMENT_RECORDED)'
    );

    // 15. Financial Aggregation & Hostel Breakdown Summary
    const summary = await FeeService.getFeeSummary();
    assert(
      summary && summary.totalAssigned > 0 && summary.collectionPercentage >= 0 && Array.isArray(summary.hostels),
      'Calculate aggregate financial metrics and hostel breakdown'
    );

  } catch (err) {
    console.error('Audit execution error:', err);
  }

  console.log('\n====================================================');
  console.log(`   FEE SYSTEM AUDIT COMPLETED: ${passed}/${total} PASSED`);
  console.log('====================================================\n');
};

runAudit();
