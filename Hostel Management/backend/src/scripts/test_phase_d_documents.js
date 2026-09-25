const db = require('../config/db');
const documentService = require('../services/documentService');

async function testPhaseD() {
  console.log('--- STARTING PHASE D DOCUMENT REQUEST E2E VERIFICATION TEST ---');
  let testDocId = null;

  try {
    // 1. Fetch a test student
    const [students] = await db.pool.query(`
      SELECT s.id, s.user_id, u.full_name, u.email 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      LIMIT 1
    `);

    if (!students || students.length === 0) {
      throw new Error('No student found for testing document requests');
    }

    const testStudent = students[0];
    console.log(`Test Student: ID=${testStudent.id}, Name=${testStudent.full_name}`);

    // Fetch an admin/superintendent user for approval
    const [admins] = await db.pool.query(`
      SELECT u.id, u.full_name, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'SUPERINTENDENT') LIMIT 1
    `);
    const testAdmin = admins.length > 0 ? admins[0] : { id: 1, full_name: 'Admin User', role: 'ADMIN' };
    console.log(`Test Admin: ID=${testAdmin.id}, Name=${testAdmin.full_name}`);

    const studentUser = { id: testStudent.user_id, role: 'STUDENT' };
    const adminUser = { id: testAdmin.id, role: testAdmin.role || 'ADMIN' };

    // 2. Submit a new document request
    console.log('\n[TEST 1] Submitting a new HOSTEL_BONAFIDE request...');
    const reqData = {
      document_type: 'HOSTEL_BONAFIDE',
      purpose: 'Bank Loan Application & Passport Verification',
      copies_requested: 2,
      remarks: 'Please issue urgently before end of week'
    };

    const newDoc = await documentService.requestDocument(studentUser, reqData);

    testDocId = newDoc.id;
    console.log(`SUCCESS: Document Request created with ID=${testDocId}, Status=${newDoc.status}`);

    // 3. Get list of document requests for Student
    console.log('\n[TEST 2] Fetching document requests as Student...');
    const studentList = await documentService.getDocumentRequests(studentUser, {});
    console.log(`SUCCESS: Found ${studentList.data.length} document request(s) for student.`);

    // 4. Get stats
    console.log('\n[TEST 3] Fetching document statistics...');
    const stats = await documentService.getDocumentStats(adminUser);
    console.log('SUCCESS: Document stats fetched:', stats);

    // 5. Approve & Issue document as Admin
    console.log('\n[TEST 4] Approving and issuing document as Admin...');
    const issueData = {
      remarks: 'Verified student active allocation and fee clearance. Certificate issued.'
    };

    const issuedDoc = await documentService.approveAndIssueDocument(adminUser, testDocId, issueData);

    console.log(`SUCCESS: Document issued! Certificate No: ${issuedDoc.certificate_number}, Issued At: ${issuedDoc.issued_at}`);

    // 6. Get single document request details by ID
    console.log('\n[TEST 5] Fetching single document request details...');
    const fetchedDoc = await documentService.getDocumentRequestById(studentUser, testDocId);
    console.log(`SUCCESS: Fetched request status=${fetchedDoc.status}, CertNo=${fetchedDoc.certificate_number}`);

    // 7. Test document request submission and rejection flow
    console.log('\n[TEST 6] Testing rejection flow on a second request...');
    const secondReq = await documentService.requestDocument(
      studentUser,
      { document_type: 'FEE_STRUCTURE', purpose: 'Scholarship Application', copies_requested: 1 }
    );

    const rejectedDoc = await documentService.rejectDocumentRequest(
      adminUser,
      secondReq.id,
      { rejection_reason: 'Fee dues outstanding for current semester.' }
    );
    console.log(`SUCCESS: Second request ID=${secondReq.id} rejected. Reason=${rejectedDoc.rejection_reason}`);

    // Cleanup second test request
    await db.pool.query(`DELETE FROM document_requests WHERE id = ?`, [secondReq.id]);
    // Cleanup first test request
    await db.pool.query(`DELETE FROM document_requests WHERE id = ?`, [testDocId]);

    console.log('\n--- PHASE D TEST CLEANUP COMPLETED SUCCESSFULLY ---');
    console.log('ALL 6 E2E TESTS PASSED FOR PHASE D DOCUMENT SYSTEM!');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ PHASE D E2E TEST FAILED:', err);
    if (testDocId) {
      await db.pool.query(`DELETE FROM document_requests WHERE id = ?`, [testDocId]).catch(() => {});
    }
    process.exit(1);
  }
}

testPhaseD();
