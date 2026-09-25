const db = require('../config/db');
const activityService = require('./activityService');

/**
 * Generate unique Document Request Number e.g. DOC-20260923-4819
 */
function generateRequestNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `DOC-${dateStr}-${randomSuffix}`;
}

/**
 * Generate unique Certificate Number e.g. CERT-BEC-2026-8192
 */
function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CERT-BEC-${year}-${randomSuffix}`;
}

/**
 * Helper to fetch student record by user_id
 */
async function getStudentByUserId(userId) {
  const [rows] = await db.pool.query(
    `SELECT s.*, b.room_id, r.hostel_id, h.name as hostel_name, r.room_number, b.bed_number
     FROM students s
     LEFT JOIN beds b ON s.bed_id = b.id
     LEFT JOIN rooms r ON b.room_id = r.id
     LEFT JOIN hostels h ON r.hostel_id = h.id
     WHERE s.user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Helper to fetch assigned hostel IDs for a superintendent
 */
async function getAssignedHostelIds(userId) {
  const [rows] = await db.pool.query(
    `SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?`,
    [userId]
  );
  return rows.map((r) => r.hostel_id);
}

/**
 * Request Document / Certificate (Student)
 */
async function requestDocument(user, data) {
  const student = await getStudentByUserId(user.id);
  if (!student) {
    throw new Error('Student profile not found.');
  }

  let hostelId = student.hostel_id;
  if (!hostelId) {
    const [allocs] = await db.pool.query(
      `SELECT hostel_id FROM student_allocations WHERE student_id = ? AND status = 'ACTIVE' LIMIT 1`,
      [student.id]
    );
    if (allocs.length > 0) {
      hostelId = allocs[0].hostel_id;
    } else {
      hostelId = 1; // Default active hostel fallback
    }
  }

  const {
    document_type = 'HOSTEL_RESIDENCE',
    purpose,
    academic_session = '2026-2027'
  } = data;

  if (!purpose || !purpose.trim()) {
    throw new Error('Purpose of document request is required.');
  }

  // Generate unique request number
  let requestNumber = generateRequestNumber();
  let isUnique = false;
  let retries = 0;
  while (!isUnique && retries < 5) {
    const [existing] = await db.pool.query('SELECT id FROM document_requests WHERE request_number = ?', [requestNumber]);
    if (existing.length === 0) {
      isUnique = true;
    } else {
      requestNumber = generateRequestNumber();
      retries++;
    }
  }

  const query = `
    INSERT INTO document_requests (
      request_number, student_id, hostel_id, document_type,
      purpose, academic_session, status
    ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
  `;

  const values = [
    requestNumber,
    student.id,
    hostelId,
    document_type,
    purpose.trim(),
    academic_session
  ];

  const [result] = await db.pool.query(query, values);
  const requestId = result.insertId;

  // Log activity
  await activityService.logActivity({
    actorId: user.id,
    action: 'CREATE_DOCUMENT_REQUEST',
    module: 'DOCUMENT',
    entityType: 'DOCUMENT',
    entityId: requestId,
    hostelId: hostelId,
    studentId: student.id,
    description: `Requested Certificate ${requestNumber} (${document_type})`,
    metadata: { requestNumber, document_type, purpose }
  });

  return getDocumentRequestById(user, requestId);
}

/**
 * Fetch Document Requests with role-based scoping and filtering
 */
async function getDocumentRequests(user, filters = {}) {
  const {
    status,
    document_type,
    hostel_id,
    search,
    page = 1,
    limit = 20
  } = filters;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const params = [];
  const whereClauses = [];

  // Role Scoping
  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student) return { data: [], total: 0, page: 1, limit: 20 };
    whereClauses.push('dr.student_id = ?');
    params.push(student.id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (assignedHostels.length === 0) return { data: [], total: 0, page: 1, limit: 20 };
    whereClauses.push(`dr.hostel_id IN (${assignedHostels.map(() => '?').join(',')})`);
    params.push(...assignedHostels);
  }

  // Filters
  if (status) {
    whereClauses.push('dr.status = ?');
    params.push(status);
  }

  if (document_type) {
    whereClauses.push('dr.document_type = ?');
    params.push(document_type);
  }

  if (hostel_id && user.role !== 'STUDENT') {
    whereClauses.push('dr.hostel_id = ?');
    params.push(hostel_id);
  }

  if (search) {
    whereClauses.push('(dr.request_number LIKE ? OR dr.certificate_number LIKE ? OR s.full_name LIKE ? OR s.roll_number LIKE ? OR dr.purpose LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count query
  const countSql = `
    SELECT COUNT(*) as total
    FROM document_requests dr
    JOIN students s ON dr.student_id = s.id
    ${whereSql}
  `;
  const [countRows] = await db.pool.query(countSql, params);
  const total = countRows[0].total;

  // Data query
  const dataSql = `
    SELECT 
      dr.*,
      s.full_name as student_name,
      s.roll_number,
      s.phone as student_phone,
      s.branch,
      s.course,
      s.year,
      h.name as hostel_name,
      h.code as hostel_code,
      r.room_number,
      b.bed_number,
      u.full_name as approved_by_name
    FROM document_requests dr
    JOIN students s ON dr.student_id = s.id
    JOIN hostels h ON dr.hostel_id = h.id
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON dr.approved_by = u.id
    ${whereSql}
    ORDER BY dr.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.pool.query(dataSql, [...params, parseInt(limit, 10), offset]);

  return {
    data: rows,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
}

/**
 * Get single Document Request by ID or Request/Certificate Number with scoping
 */
async function getDocumentRequestById(user, requestId) {
  const sql = `
    SELECT 
      dr.*,
      s.full_name as student_name,
      s.roll_number,
      s.phone as student_phone,
      s.branch,
      s.course,
      s.year,
      h.name as hostel_name,
      h.code as hostel_code,
      r.room_number,
      b.bed_number,
      u.full_name as approved_by_name
    FROM document_requests dr
    JOIN students s ON dr.student_id = s.id
    JOIN hostels h ON dr.hostel_id = h.id
    LEFT JOIN beds b ON s.bed_id = b.id
    LEFT JOIN rooms r ON b.room_id = r.id
    LEFT JOIN users u ON dr.approved_by = u.id
    WHERE dr.id = ? OR dr.request_number = ? OR dr.certificate_number = ?
  `;

  const [rows] = await db.pool.query(sql, [requestId, requestId, requestId]);
  if (rows.length === 0) {
    throw new Error('Document Request not found.');
  }

  const doc = rows[0];

  // Scoping check
  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student || student.id !== doc.student_id) {
      throw new Error('Unauthorized to view this Document Request.');
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (!assignedHostels.includes(doc.hostel_id)) {
      throw new Error('Unauthorized: This Document Request belongs to an unassigned hostel.');
    }
  }

  return doc;
}

/**
 * Approve & Issue Document / Certificate (Staff)
 */
async function approveAndIssueDocument(user, requestId, { remarks }) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to approve or issue certificates.');
  }

  const doc = await getDocumentRequestById(user, requestId);

  if (doc.status !== 'PENDING' && doc.status !== 'APPROVED') {
    throw new Error(`Cannot issue certificate for a request that is already ${doc.status}.`);
  }

  // Generate unique certificate number
  let certNumber = generateCertificateNumber();
  let isUnique = false;
  let retries = 0;
  while (!isUnique && retries < 5) {
    const [existing] = await db.pool.query('SELECT id FROM document_requests WHERE certificate_number = ?', [certNumber]);
    if (existing.length === 0) {
      isUnique = true;
    } else {
      certNumber = generateCertificateNumber();
      retries++;
    }
  }

  const sql = `
    UPDATE document_requests
    SET status = 'ISSUED', certificate_number = ?, issued_at = NOW(), approved_by = ?, approved_at = NOW(), remarks = ?
    WHERE id = ?
  `;

  await db.pool.query(sql, [
    certNumber,
    user.id,
    remarks || 'Approved and digitally issued by Warden',
    doc.id
  ]);

  // Log activity
  await activityService.logActivity({
    actorId: user.id,
    action: 'ISSUE_DOCUMENT',
    module: 'DOCUMENT',
    entityType: 'DOCUMENT',
    entityId: doc.id,
    hostelId: doc.hostel_id,
    studentId: doc.student_id,
    description: `Issued Certificate ${certNumber} for Request ${doc.request_number}`,
    metadata: { certNumber, requestNumber: doc.request_number }
  });

  return getDocumentRequestById(user, doc.id);
}

/**
 * Staff Reject Document Request
 */
async function rejectDocumentRequest(user, requestId, { rejection_reason }) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to reject document requests.');
  }

  const doc = await getDocumentRequestById(user, requestId);

  if (doc.status !== 'PENDING') {
    throw new Error(`Cannot reject Document Request that is already ${doc.status}.`);
  }

  await db.pool.query(
    `UPDATE document_requests 
     SET status = 'REJECTED', approved_by = ?, approved_at = NOW(), rejection_reason = ?
     WHERE id = ?`,
    [user.id, rejection_reason || 'Request rejected by Warden', doc.id]
  );

  await activityService.logActivity({
    actorId: user.id,
    action: 'REJECT_DOCUMENT_REQUEST',
    module: 'DOCUMENT',
    entityType: 'DOCUMENT',
    entityId: doc.id,
    hostelId: doc.hostel_id,
    studentId: doc.student_id,
    description: `Rejected Document Request ${doc.request_number}`,
    metadata: { requestNumber: doc.request_number, rejection_reason }
  });

  return getDocumentRequestById(user, doc.id);
}

/**
 * Cancel pending Document Request (Student)
 */
async function cancelDocumentRequest(user, requestId) {
  const doc = await getDocumentRequestById(user, requestId);

  if (doc.status !== 'PENDING') {
    throw new Error('Only PENDING document requests can be cancelled.');
  }

  await db.pool.query("UPDATE document_requests SET status = 'CANCELLED' WHERE id = ?", [doc.id]);

  await activityService.logActivity({
    actorId: user.id,
    action: 'CANCEL_DOCUMENT_REQUEST',
    module: 'DOCUMENT',
    entityType: 'DOCUMENT',
    entityId: doc.id,
    hostelId: doc.hostel_id,
    studentId: doc.student_id,
    description: `Cancelled Document Request ${doc.request_number}`,
    metadata: { requestNumber: doc.request_number }
  });

  return getDocumentRequestById(user, doc.id);
}

/**
 * Summary Statistics for Document Requests
 */
async function getDocumentStats(user) {
  let hostelClause = '';
  const params = [];

  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student) return { pending: 0, issued: 0, rejected: 0, total: 0 };
    hostelClause = 'WHERE student_id = ?';
    params.push(student.id);
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = await getAssignedHostelIds(user.id);
    if (assignedHostels.length === 0) return { pending: 0, issued: 0, rejected: 0, total: 0 };
    hostelClause = `WHERE hostel_id IN (${assignedHostels.map(() => '?').join(',')})`;
    params.push(...assignedHostels);
  }

  const sql = `
    SELECT
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'ISSUED' THEN 1 END) as issued,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
      COUNT(*) as total
    FROM document_requests
    ${hostelClause}
  `;

  const [rows] = await db.pool.query(sql, params);
  return rows[0] || { pending: 0, issued: 0, rejected: 0, total: 0 };
}

module.exports = {
  requestDocument,
  getDocumentRequests,
  getDocumentRequestById,
  approveAndIssueDocument,
  rejectDocumentRequest,
  cancelDocumentRequest,
  getDocumentStats
};
