const { pool } = require('../config/db');
const activityService = require('./activityService');

/**
 * Helper to generate a unique, format-safe receipt number.
 * Pattern: FEE-YYYY-XXXXXX (e.g. FEE-2026-000001)
 */
const generateReceiptNumber = async (connection) => {
  const year = new Date().getFullYear();
  const [rows] = await connection.query('SELECT COUNT(*) as cnt FROM fee_payments');
  const count = (rows[0]?.cnt || 0) + 1;
  const seq = String(count).padStart(6, '0');
  return `FEE-${year}-${seq}`;
};

class FeeService {
  /**
   * Fetch fee structures based on filter criteria.
   */
  static async getFeeStructures({ hostelId, feeType, academicYear, isActive }) {
    let sql = `
      SELECT fs.*, h.name as hostel_name, u.username as creator_name
      FROM fee_structures fs
      LEFT JOIN hostels h ON fs.hostel_id = h.id
      LEFT JOIN users u ON fs.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (hostelId !== undefined && hostelId !== null && hostelId !== '') {
      sql += ` AND (fs.hostel_id = ? OR fs.hostel_id IS NULL)`;
      params.push(hostelId);
    }

    if (feeType) {
      sql += ` AND fs.fee_type = ?`;
      params.push(feeType);
    }

    if (academicYear) {
      sql += ` AND fs.academic_year = ?`;
      params.push(academicYear);
    }

    if (isActive !== undefined && isActive !== null) {
      sql += ` AND fs.is_active = ?`;
      params.push(isActive ? 1 : 0);
    }

    sql += ` ORDER BY fs.academic_year DESC, fs.name ASC`;

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Get single fee structure by ID.
   */
  static async getFeeStructureById(id) {
    const sql = `
      SELECT fs.*, h.name as hostel_name
      FROM fee_structures fs
      LEFT JOIN hostels h ON fs.hostel_id = h.id
      WHERE fs.id = ?
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Create a new fee structure.
   */
  static async createFeeStructure({
    hostelId,
    feeType,
    name,
    description,
    amount,
    frequency = 'YEARLY',
    academicYear,
    applicableCourse,
    applicableBranch,
    applicableYear,
    createdBy
  }) {
    const validTypes = ['HOSTEL_FEE', 'MESS_FEE', 'MAINTENANCE_FEE', 'SECURITY_DEPOSIT', 'OTHER'];
    if (!validTypes.includes(feeType)) {
      throw new Error(`Invalid fee type: ${feeType}`);
    }

    const validFrequencies = ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMESTER', 'YEARLY'];
    if (!validFrequencies.includes(frequency)) {
      throw new Error(`Invalid fee frequency: ${frequency}`);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Fee amount must be a positive number greater than 0.');
    }

    if (!name || !name.trim()) throw new Error('Fee structure name is required.');
    if (!academicYear || !academicYear.trim()) throw new Error('Academic year is required.');

    const sql = `
      INSERT INTO fee_structures (
        hostel_id, fee_type, name, description, amount, frequency,
        academic_year, applicable_course, applicable_branch, applicable_year,
        is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `;

    const [result] = await pool.query(sql, [
      hostelId || null,
      feeType,
      name.trim(),
      description ? description.trim() : null,
      numAmount,
      frequency,
      academicYear.trim(),
      applicableCourse ? applicableCourse.trim() : null,
      applicableBranch ? applicableBranch.trim() : null,
      applicableYear ? parseInt(applicableYear, 10) : null,
      createdBy
    ]);

    return this.getFeeStructureById(result.insertId);
  }

  /**
   * Update fee structure details.
   */
  static async updateFeeStructure(id, { name, description, amount, frequency, is_active }, user) {
    const existing = await this.getFeeStructureById(id);
    if (!existing) throw new Error('Fee structure not found.');

    if (user.role === 'SUPERINTENDENT') {
      if (existing.hostel_id === null) {
        throw new Error('Superintendents cannot modify global fee structures.');
      }
      const [sh] = await pool.query(
        'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
        [user.id, existing.hostel_id]
      );
      if (sh.length === 0) {
        throw new Error('Unauthorized: You can only update fee structures for your assigned hostels.');
      }
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? description.trim() : null);
    }

    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Fee amount must be a positive number.');
      }
      updates.push('amount = ?');
      params.push(numAmount);
    }

    if (frequency !== undefined) {
      updates.push('frequency = ?');
      params.push(frequency);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) return existing;

    params.push(id);
    await pool.query(`UPDATE fee_structures SET ${updates.join(', ')} WHERE id = ?`, params);
    return this.getFeeStructureById(id);
  }

  /**
   * Assign a fee structure to a student.
   * Stores fixed snapshot amount in student_fees.
   */
  static async assignStudentFee({ studentId, feeStructureId, academicYear, amount, dueDate, createdBy }) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Fee amount must be greater than 0.');
    }

    if (!dueDate) throw new Error('Due date is required.');

    // Fetch student profile to get hostel_id
    const [students] = await pool.query('SELECT id, hostel_id FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) throw new Error('Student record not found.');

    const student = students[0];

    // Check for duplicate pending assignment for same student & fee_structure_id in academic_year
    if (feeStructureId) {
      const [existing] = await pool.query(
        'SELECT id FROM student_fees WHERE student_id = ? AND fee_structure_id = ? AND academic_year = ? AND status != "WAIVED"',
        [studentId, feeStructureId, academicYear]
      );
      if (existing.length > 0) {
        throw new Error('This fee structure has already been assigned to this student for the academic year.');
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const initialStatus = dueDate < todayStr ? 'OVERDUE' : 'PENDING';

    const insertSql = `
      INSERT INTO student_fees (
        student_id, hostel_id, fee_structure_id, academic_year,
        amount, paid_amount, due_date, status
      ) VALUES (?, ?, ?, ?, ?, 0.00, ?, ?)
    `;

    const [result] = await pool.query(insertSql, [
      student.id,
      student.hostel_id,
      feeStructureId || null,
      academicYear,
      numAmount,
      dueDate,
      initialStatus
    ]);

    const studentFeeId = result.insertId;

    // Record audit history
    await pool.query(
      `INSERT INTO fee_history (student_fee_id, changed_by, action, old_value, new_value, reason)
       VALUES (?, ?, 'ASSIGNED', NULL, ?, ?)`,
      [studentFeeId, createdBy, String(numAmount), 'Fee assigned to student']
    );

    await activityService.logActivity({
      actorId: createdBy,
      action: 'FEE_ASSIGNED',
      module: 'FEES',
      entityType: 'FEE',
      entityId: studentFeeId,
      hostelId: student.hostel_id,
      studentId: student.id,
      description: `Assigned fee of ₹${numAmount.toFixed(2)} to student #${student.id}`,
      metadata: { amount: numAmount, academic_year: academicYear, due_date: dueDate }
    });

    return this.getStudentFeeById(studentFeeId);
  }

  /**
   * Bulk assign fee structure to students matching hostel and optional course/branch/year.
   */
  static async bulkAssignFee({ hostelId, feeStructureId, academicYear, amount, dueDate, course, branch, year, createdBy }) {
    let studentSql = `SELECT id, hostel_id FROM students WHERE status = 'ACTIVE' AND hostel_id = ?`;
    const studentParams = [hostelId];

    if (course) {
      studentSql += ` AND course = ?`;
      studentParams.push(course);
    }
    if (branch) {
      studentSql += ` AND branch = ?`;
      studentParams.push(branch);
    }
    if (year) {
      studentSql += ` AND year = ?`;
      studentParams.push(parseInt(year, 10));
    }

    const [students] = await pool.query(studentSql, studentParams);
    if (students.length === 0) {
      throw new Error('No matching active students found for this assignment.');
    }

    let assignedCount = 0;
    for (const student of students) {
      try {
        await this.assignStudentFee({
          studentId: student.id,
          feeStructureId,
          academicYear,
          amount,
          dueDate,
          createdBy
        });
        assignedCount++;
      } catch (err) {
        // Skip duplicate assignments during bulk operation
      }
    }

    return { totalMatched: students.length, assignedCount };
  }

  /**
   * Transaction-safe payment creation.
   */
  static async recordPayment({
    studentFeeId,
    amount,
    paymentMethod,
    transactionReference,
    paymentDate,
    notes,
    receivedBy,
    userRole
  }) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Payment amount must be greater than 0.');
    }

    const validMethods = ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER'];
    if (!validMethods.includes(paymentMethod)) {
      throw new Error(`Invalid payment method: ${paymentMethod}`);
    }

    if (['BANK_TRANSFER', 'UPI', 'CARD'].includes(paymentMethod) && (!transactionReference || !transactionReference.trim())) {
      throw new Error(`Transaction reference is required for ${paymentMethod} payments.`);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Lock row for update
      const [fees] = await connection.query('SELECT * FROM student_fees WHERE id = ? FOR UPDATE', [studentFeeId]);
      if (fees.length === 0) throw new Error('Student fee record not found.');

      const sf = fees[0];

      if (sf.status === 'PAID') throw new Error('This fee has already been fully paid.');
      if (sf.status === 'WAIVED') throw new Error('Cannot record payments against a waived fee.');

      const assignedAmount = parseFloat(sf.amount);
      const currentPaid = parseFloat(sf.paid_amount);
      const remaining = assignedAmount - currentPaid;

      if (numAmount > remaining + 0.001) { // 2 decimal safety check
        throw new Error(`Payment amount (₹${numAmount}) exceeds remaining balance (₹${remaining.toFixed(2)}). Overpayment is rejected.`);
      }

      // Check duplicate transaction reference if provided
      if (transactionReference && transactionReference.trim()) {
        const [dupTxn] = await connection.query(
          'SELECT id FROM fee_payments WHERE transaction_reference = ? AND transaction_reference IS NOT NULL',
          [transactionReference.trim()]
        );
        if (dupTxn.length > 0) {
          throw new Error(`Transaction reference "${transactionReference.trim()}" has already been used for another payment.`);
        }
      }

      // Generate receipt number
      const receiptNumber = await generateReceiptNumber(connection);
      const pDate = paymentDate || new Date().toISOString().split('T')[0];

      // Insert payment record
      const insertPaymentSql = `
        INSERT INTO fee_payments (
          student_fee_id, student_id, hostel_id, amount, payment_method,
          receipt_number, transaction_reference, payment_date, received_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [pResult] = await connection.query(insertPaymentSql, [
        sf.id,
        sf.student_id,
        sf.hostel_id,
        numAmount,
        paymentMethod,
        receiptNumber,
        transactionReference ? transactionReference.trim() : null,
        pDate,
        receivedBy,
        notes ? notes.trim() : null
      ]);

      // Calculate updated paid amount and status
      const newPaidAmount = currentPaid + numAmount;
      const newRemaining = assignedAmount - newPaidAmount;
      const todayStr = new Date().toISOString().split('T')[0];

      let newStatus;
      if (newRemaining <= 0.001) {
        newStatus = 'PAID';
      } else {
        newStatus = sf.due_date < todayStr ? 'OVERDUE' : 'PARTIAL';
      }

      await connection.query(
        'UPDATE student_fees SET paid_amount = ?, status = ? WHERE id = ?',
        [newPaidAmount, newStatus, sf.id]
      );

      // Log audit history
      await connection.query(
        `INSERT INTO fee_history (student_fee_id, changed_by, action, old_value, new_value, reason)
         VALUES (?, ?, 'PAYMENT_RECORDED', ?, ?, ?)`,
        [
          sf.id,
          receivedBy,
          `Paid: ₹${currentPaid.toFixed(2)}, Status: ${sf.status}`,
          `Paid: ₹${newPaidAmount.toFixed(2)}, Status: ${newStatus}`,
          `Payment of ₹${numAmount.toFixed(2)} recorded via ${paymentMethod}. Receipt: ${receiptNumber}`
        ]
      );

      await activityService.logActivity({
        actorId: receivedBy,
        action: 'PAYMENT_RECORDED',
        module: 'FEES',
        entityType: 'PAYMENT',
        entityId: pResult.insertId,
        hostelId: sf.hostel_id,
        studentId: sf.student_id,
        description: `Recorded payment of ₹${numAmount.toFixed(2)} (${paymentMethod}) for student #${sf.student_id}. Receipt: ${receiptNumber}`,
        metadata: { amount: numAmount, payment_method: paymentMethod, receipt_number: receiptNumber }
      }, connection);

      await connection.commit();
      connection.release();

      return this.getPaymentReceiptById(pResult.insertId);
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  }

  /**
   * Waive a student fee (SUPER_ADMIN only).
   */
  static async waiveStudentFee({ studentFeeId, waiverReason, waivedBy }) {
    if (!waiverReason || !waiverReason.trim()) {
      throw new Error('Waiver reason is required.');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [fees] = await connection.query('SELECT * FROM student_fees WHERE id = ? FOR UPDATE', [studentFeeId]);
      if (fees.length === 0) throw new Error('Student fee record not found.');

      const sf = fees[0];
      if (sf.status === 'PAID') throw new Error('Cannot waive a fee that has already been fully paid.');
      if (sf.status === 'WAIVED') throw new Error('Fee is already waived.');

      await connection.query(
        `UPDATE student_fees 
         SET status = 'WAIVED', waiver_reason = ?, waived_by = ?, waived_at = NOW() 
         WHERE id = ?`,
        [waiverReason.trim(), waivedBy, sf.id]
      );

      await connection.query(
        `INSERT INTO fee_history (student_fee_id, changed_by, action, old_value, new_value, reason)
         VALUES (?, ?, 'WAIVED', ?, 'WAIVED', ?)`,
        [sf.id, waivedBy, sf.status, waiverReason.trim()]
      );

      await activityService.logActivity({
        actorId: waivedBy,
        action: 'FEE_WAIVED',
        module: 'FEES',
        entityType: 'FEE',
        entityId: sf.id,
        hostelId: sf.hostel_id,
        studentId: sf.student_id,
        description: `Waived fee #${sf.id} for student #${sf.student_id}`,
        metadata: { reason: waiverReason.trim() }
      }, connection);

      await connection.commit();
      connection.release();

      return this.getStudentFeeById(sf.id);
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  }

  /**
   * Get student fees list with filters & pagination.
   */
  static async getStudentFees({
    studentId,
    hostelId,
    feeType,
    status,
    academicYear,
    search,
    page = 1,
    limit = 20
  }) {
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (p - 1) * l;

    let whereClause = `WHERE 1=1`;
    const params = [];

    if (studentId) {
      whereClause += ` AND sf.student_id = ?`;
      params.push(studentId);
    }

    if (hostelId) {
      whereClause += ` AND sf.hostel_id = ?`;
      params.push(hostelId);
    }

    if (feeType) {
      whereClause += ` AND fs.fee_type = ?`;
      params.push(feeType);
    }

    if (status) {
      whereClause += ` AND sf.status = ?`;
      params.push(status);
    }

    if (academicYear) {
      whereClause += ` AND sf.academic_year = ?`;
      params.push(academicYear);
    }

    if (search && search.trim()) {
      whereClause += ` AND (s.full_name LIKE ? OR s.student_id LIKE ? OR s.roll_number LIKE ? OR fs.name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const countSql = `
      SELECT COUNT(*) as total
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      ${whereClause}
    `;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT sf.*, 
             (sf.amount - sf.paid_amount) as remaining_amount,
             s.full_name as student_name, s.student_id as student_code, r.room_number, s.branch, s.course,
             h.name as hostel_name,
             fs.name as fee_name, fs.fee_type, fs.frequency
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      JOIN hostels h ON sf.hostel_id = h.id
      LEFT JOIN beds b ON s.bed_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      ${whereClause}
      ORDER BY sf.due_date ASC, sf.id DESC
      LIMIT ${l} OFFSET ${offset}
    `;

    const [records] = await pool.query(dataSql, params);

    const todayStr = new Date().toISOString().split('T')[0];
    const evaluatedRecords = records.map(r => {
      // Auto-evaluate OVERDUE display status if past due date and remaining > 0
      let computedStatus = r.status;
      if (r.status === 'PENDING' || r.status === 'PARTIAL') {
        if (r.due_date < todayStr && parseFloat(r.remaining_amount) > 0) {
          computedStatus = 'OVERDUE';
        }
      }
      return {
        ...r,
        amount: parseFloat(r.amount),
        paid_amount: parseFloat(r.paid_amount),
        remaining_amount: Math.max(0, parseFloat(r.remaining_amount)),
        status: computedStatus
      };
    });

    return {
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      records: evaluatedRecords
    };
  }

  /**
   * Get single student fee details with payment history and audit trail.
   */
  static async getStudentFeeById(id) {
    const sql = `
      SELECT sf.*, 
             (sf.amount - sf.paid_amount) as remaining_amount,
             s.full_name as student_name, s.student_id as student_code, r.room_number, s.branch, s.course, s.email as student_email, s.phone as student_phone,
             h.name as hostel_name,
             fs.name as fee_name, fs.fee_type, fs.frequency,
             u.username as waived_by_name
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      JOIN hostels h ON sf.hostel_id = h.id
      LEFT JOIN beds b ON s.bed_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      LEFT JOIN users u ON sf.waived_by = u.id
      WHERE sf.id = ?
    `;
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) return null;

    const sf = rows[0];

    // Fetch payment records
    const [payments] = await pool.query(
      `SELECT fp.*, u.username as received_by_name
       FROM fee_payments fp
       LEFT JOIN users u ON fp.received_by = u.id
       WHERE fp.student_fee_id = ?
       ORDER BY fp.payment_date DESC, fp.id DESC`,
      [id]
    );

    // Fetch audit history
    const [history] = await pool.query(
      `SELECT fh.*, u.username as changed_by_name
       FROM fee_history fh
       LEFT JOIN users u ON fh.changed_by = u.id
       WHERE fh.student_fee_id = ?
       ORDER BY fh.created_at DESC`,
      [id]
    );

    const todayStr = new Date().toISOString().split('T')[0];
    let computedStatus = sf.status;
    if ((sf.status === 'PENDING' || sf.status === 'PARTIAL') && sf.due_date < todayStr && (sf.amount - sf.paid_amount) > 0) {
      computedStatus = 'OVERDUE';
    }

    return {
      ...sf,
      amount: parseFloat(sf.amount),
      paid_amount: parseFloat(sf.paid_amount),
      remaining_amount: Math.max(0, parseFloat(sf.amount - sf.paid_amount)),
      status: computedStatus,
      payments: payments.map(p => ({ ...p, amount: parseFloat(p.amount) })),
      history
    };
  }

  /**
   * Fetch single payment receipt details.
   */
  static async getPaymentReceiptById(paymentId) {
    const sql = `
      SELECT fp.*,
             sf.academic_year, sf.amount as total_fee_amount, sf.paid_amount as current_total_paid,
             fs.name as fee_name, fs.fee_type,
             s.full_name as student_name, s.student_id as student_code, r.room_number,
             h.name as hostel_name,
             u.username as received_by_name
      FROM fee_payments fp
      JOIN student_fees sf ON fp.student_fee_id = sf.id
      JOIN students s ON fp.student_id = s.id
      JOIN hostels h ON fp.hostel_id = h.id
      LEFT JOIN beds b ON s.bed_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      LEFT JOIN users u ON fp.received_by = u.id
      WHERE fp.id = ?
    `;
    const [rows] = await pool.query(sql, [paymentId]);
    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      ...r,
      amount: parseFloat(r.amount),
      total_fee_amount: parseFloat(r.total_fee_amount),
      current_total_paid: parseFloat(r.current_total_paid)
    };
  }

  /**
   * Get payments list with filters & pagination.
   */
  static async getPayments({ hostelId, studentId, search, paymentMethod, page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (p - 1) * l;

    let whereClause = `WHERE 1=1`;
    const params = [];

    if (hostelId) {
      whereClause += ` AND fp.hostel_id = ?`;
      params.push(hostelId);
    }

    if (studentId) {
      whereClause += ` AND fp.student_id = ?`;
      params.push(studentId);
    }

    if (paymentMethod) {
      whereClause += ` AND fp.payment_method = ?`;
      params.push(paymentMethod);
    }

    if (search && search.trim()) {
      whereClause += ` AND (s.full_name LIKE ? OR s.student_id LIKE ? OR fp.receipt_number LIKE ? OR fp.transaction_reference LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const countSql = `
      SELECT COUNT(*) as total
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      ${whereClause}
    `;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT fp.*,
             s.full_name as student_name, s.student_id as student_code, r.room_number,
             h.name as hostel_name,
             fs.name as fee_name, fs.fee_type,
             u.username as received_by_name
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      JOIN hostels h ON fp.hostel_id = h.id
      JOIN student_fees sf ON fp.student_fee_id = sf.id
      LEFT JOIN beds b ON s.bed_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      LEFT JOIN users u ON fp.received_by = u.id
      ${whereClause}
      ORDER BY fp.payment_date DESC, fp.id DESC
      LIMIT ${l} OFFSET ${offset}
    `;

    const [records] = await pool.query(dataSql, params);

    return {
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      records: records.map(r => ({ ...r, amount: parseFloat(r.amount) }))
    };
  }

  /**
   * Get financial summary analytics (Aggregated metrics).
   */
  static async getFeeSummary(hostelId = null) {
    let whereClause = `WHERE sf.status != 'WAIVED'`;
    const params = [];

    if (hostelId) {
      whereClause += ` AND sf.hostel_id = ?`;
      params.push(hostelId);
    }

    const summarySql = `
      SELECT 
        SUM(sf.amount) as total_assigned,
        SUM(sf.paid_amount) as total_collected,
        SUM(sf.amount - sf.paid_amount) as total_pending
      FROM student_fees sf
      ${whereClause}
    `;
    const [summaryRows] = await pool.query(summarySql, params);

    const todayStr = new Date().toISOString().split('T')[0];
    let overdueSql = `
      SELECT SUM(sf.amount - sf.paid_amount) as total_overdue
      FROM student_fees sf
      WHERE sf.status != 'WAIVED' AND sf.status != 'PAID' AND sf.due_date < ?
    `;
    const overdueParams = [todayStr];
    if (hostelId) {
      overdueSql += ` AND sf.hostel_id = ?`;
      overdueParams.push(hostelId);
    }
    const [overdueRows] = await pool.query(overdueSql, overdueParams);

    const totalAssigned = parseFloat(summaryRows[0]?.total_assigned || 0);
    const totalCollected = parseFloat(summaryRows[0]?.total_collected || 0);
    const totalPending = Math.max(0, parseFloat(summaryRows[0]?.total_pending || 0));
    const totalOverdue = Math.max(0, parseFloat(overdueRows[0]?.total_overdue || 0));
    const collectionPercentage = totalAssigned > 0 ? parseFloat(((totalCollected / totalAssigned) * 100).toFixed(2)) : 0;

    // Hostel breakdown metrics
    let breakdownSql = `
      SELECT 
        h.id as hostel_id, h.name as hostel_name,
        COUNT(DISTINCT sf.student_id) as student_count,
        SUM(sf.amount) as expected,
        SUM(sf.paid_amount) as collected,
        SUM(sf.amount - sf.paid_amount) as pending
      FROM hostels h
      LEFT JOIN student_fees sf ON h.id = sf.hostel_id AND sf.status != 'WAIVED'
      WHERE 1=1
    `;
    const bParams = [];
    if (hostelId) {
      breakdownSql += ` AND h.id = ?`;
      bParams.push(hostelId);
    }
    breakdownSql += ` GROUP BY h.id, h.name ORDER BY h.id ASC`;

    const [breakdownRows] = await pool.query(breakdownSql, bParams);

    const hostels = breakdownRows.map(b => {
      const exp = parseFloat(b.expected || 0);
      const col = parseFloat(b.collected || 0);
      const pen = Math.max(0, parseFloat(b.pending || 0));
      const pct = exp > 0 ? parseFloat(((col / exp) * 100).toFixed(2)) : 0;
      return {
        hostelId: b.hostel_id,
        hostelName: b.hostel_name,
        studentCount: Number(b.student_count || 0),
        expected: exp,
        collected: col,
        pending: pen,
        collectionPercentage: pct
      };
    });

    return {
      totalAssigned,
      totalCollected,
      totalPending,
      totalOverdue,
      collectionPercentage,
      hostels
    };
  }

  /**
   * Get student's individual fee summary for student dashboard.
   */
  static async getStudentFeeSummary(studentId) {
    const sql = `
      SELECT 
        SUM(amount) as total_fees,
        SUM(paid_amount) as total_paid,
        SUM(amount - paid_amount) as total_pending
      FROM student_fees
      WHERE student_id = ? AND status != 'WAIVED'
    `;
    const [rows] = await pool.query(sql, [studentId]);

    const todayStr = new Date().toISOString().split('T')[0];
    const [overdueRows] = await pool.query(
      `SELECT SUM(amount - paid_amount) as total_overdue
       FROM student_fees
       WHERE student_id = ? AND status != 'WAIVED' AND status != 'PAID' AND due_date < ?`,
      [studentId, todayStr]
    );

    const totalFees = parseFloat(rows[0]?.total_fees || 0);
    const totalPaid = parseFloat(rows[0]?.total_paid || 0);
    const totalPending = Math.max(0, parseFloat(rows[0]?.total_pending || 0));
    const totalOverdue = Math.max(0, parseFloat(overdueRows[0]?.total_overdue || 0));

    let overallStatus = 'PAID';
    if (totalPending > 0) {
      overallStatus = totalOverdue > 0 ? 'OVERDUE' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING');
    }

    return {
      totalFees,
      totalPaid,
      totalPending,
      totalOverdue,
      overallStatus
    };
  }
}

module.exports = FeeService;
