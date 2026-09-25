const FeeService = require('../services/feeService');
const { pool } = require('../config/db');

class FeeController {
  /**
   * GET /api/fees/structures
   */
  static async getFeeStructures(req, res, next) {
    try {
      const { hostel_id, fee_type, academic_year, is_active } = req.query;
      let targetHostelId = hostel_id ? parseInt(hostel_id, 10) : undefined;

      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query(
          `SELECT r.hostel_id FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.user_id = ?`,
          [req.user.id]
        );
        if (st.length > 0) targetHostelId = st[0].hostel_id;
      } else if (req.user.role === 'SUPERINTENDENT' && targetHostelId) {
        const [sh] = await pool.query(
          'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
          [req.user.id, targetHostelId]
        );
        if (sh.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You are not authorized to view fee structures for this hostel.'
          });
        }
      }

      const structures = await FeeService.getFeeStructures({
        hostelId: targetHostelId,
        feeType: fee_type,
        academicYear: academic_year,
        isActive: is_active !== undefined ? is_active === 'true' || is_active === '1' : undefined
      });

      return res.status(200).json({
        success: true,
        count: structures.length,
        data: structures
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/fees/structures
   */
  static async createFeeStructure(req, res, next) {
    try {
      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot create fee structures.'
        });
      }

      const {
        hostel_id, fee_type, name, description, amount,
        frequency, academic_year, applicable_course, applicable_branch, applicable_year
      } = req.body;

      const targetHostelId = hostel_id ? parseInt(hostel_id, 10) : null;

      if (req.user.role === 'SUPERINTENDENT') {
        if (!targetHostelId) {
          return res.status(400).json({
            success: false,
            message: 'Superintendents cannot create global fee structures. Please specify an assigned hostel.'
          });
        }
        const [sh] = await pool.query(
          'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
          [req.user.id, targetHostelId]
        );
        if (sh.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You can only create fee structures for your assigned hostels.'
          });
        }
      }

      const structure = await FeeService.createFeeStructure({
        hostelId: targetHostelId,
        feeType: fee_type,
        name,
        description,
        amount,
        frequency,
        academicYear: academic_year,
        applicableCourse: applicable_course,
        applicableBranch: applicable_branch,
        applicableYear: applicable_year,
        createdBy: req.user.id
      });

      return res.status(201).json({
        success: true,
        message: 'Fee structure created successfully.',
        data: structure
      });
    } catch (err) {
      if (err.message.includes('Invalid') || err.message.includes('required') || err.message.includes('must be')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * PUT /api/fees/structures/:id
   */
  static async updateFeeStructure(req, res, next) {
    try {
      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot modify fee structures.'
        });
      }

      const { id } = req.params;
      const updated = await FeeService.updateFeeStructure(id, req.body, req.user);

      return res.status(200).json({
        success: true,
        message: 'Fee structure updated successfully.',
        data: updated
      });
    } catch (err) {
      if (err.message.includes('Unauthorized') || err.message.includes('cannot modify')) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.message.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      if (err.message.includes('must be') || err.message.includes('Invalid')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * PATCH /api/fees/structures/:id/status
   */
  static async toggleStructureStatus(req, res, next) {
    try {
      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot change fee structure status.'
        });
      }

      const { id } = req.params;
      const { is_active } = req.body;

      if (is_active === undefined) {
        return res.status(400).json({ success: false, message: 'Field is_active is required.' });
      }

      const updated = await FeeService.updateFeeStructure(id, { is_active: Boolean(is_active) }, req.user);

      return res.status(200).json({
        success: true,
        message: `Fee structure ${updated.is_active ? 'activated' : 'deactivated'} successfully.`,
        data: updated
      });
    } catch (err) {
      if (err.message.includes('Unauthorized')) return res.status(403).json({ success: false, message: err.message });
      if (err.message.includes('not found')) return res.status(404).json({ success: false, message: err.message });
      next(err);
    }
  }

  /**
   * POST /api/fees/assign
   */
  static async assignStudentFee(req, res, next) {
    try {
      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot assign fees.'
        });
      }

      const { student_id, fee_structure_id, academic_year, amount, due_date, bulk, hostel_id, course, branch, year } = req.body;

      if (bulk) {
        if (!hostel_id || !academic_year || !amount || !due_date) {
          return res.status(400).json({
            success: false,
            message: 'Bulk assignment requires hostel_id, academic_year, amount, and due_date.'
          });
        }

        if (req.user.role === 'SUPERINTENDENT') {
          const [sh] = await pool.query(
            'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
            [req.user.id, hostel_id]
          );
          if (sh.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'Forbidden: You can only assign fees to students in your assigned hostels.'
            });
          }
        }

        const bulkResult = await FeeService.bulkAssignFee({
          hostelId: parseInt(hostel_id, 10),
          feeStructureId: fee_structure_id ? parseInt(fee_structure_id, 10) : null,
          academicYear: academic_year,
          amount,
          dueDate: due_date,
          course,
          branch,
          year,
          createdBy: req.user.id
        });

        return res.status(200).json({
          success: true,
          message: `Bulk fee assignment completed. ${bulkResult.assignedCount} of ${bulkResult.totalMatched} students assigned.`,
          data: bulkResult
        });
      }

      // Single assignment
      if (!student_id || !academic_year || !amount || !due_date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: student_id, academic_year, amount, due_date.'
        });
      }

      if (req.user.role === 'SUPERINTENDENT') {
        const [st] = await pool.query(
          `SELECT r.hostel_id FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.id = ?`,
          [student_id]
        );
        if (st.length > 0) {
          const [sh] = await pool.query(
            'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
            [req.user.id, st[0].hostel_id]
          );
          if (sh.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'Forbidden: You can only assign fees to students in your assigned hostels.'
            });
          }
        }
      }

      const record = await FeeService.assignStudentFee({
        studentId: parseInt(student_id, 10),
        feeStructureId: fee_structure_id ? parseInt(fee_structure_id, 10) : null,
        academicYear: academic_year,
        amount,
        dueDate: due_date,
        createdBy: req.user.id
      });

      return res.status(201).json({
        success: true,
        message: 'Fee assigned to student successfully.',
        data: record
      });
    } catch (err) {
      if (err.message.includes('already been assigned') || err.message.includes('required') || err.message.includes('must be')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err.message.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * GET /api/fees/me
   */
  static async getMyFees(req, res, next) {
    try {
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is for student access only.'
        });
      }

      const [st] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (st.length === 0) {
        return res.status(404).json({ success: false, message: 'Student profile not found.' });
      }

      const studentId = st[0].id;
      const { fee_type, status, academic_year, page, limit } = req.query;

      const feeData = await FeeService.getStudentFees({
        studentId,
        feeType: fee_type,
        status,
        academicYear: academic_year,
        page,
        limit
      });

      const summary = await FeeService.getStudentFeeSummary(studentId);

      return res.status(200).json({
        success: true,
        summary,
        data: feeData
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/fees
   */
  static async getStudentFees(req, res, next) {
    try {
      const { student_id, hostel_id, fee_type, status, academic_year, search, page, limit } = req.query;
      let targetStudentId = student_id ? parseInt(student_id, 10) : undefined;
      let targetHostelId = hostel_id ? parseInt(hostel_id, 10) : undefined;

      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (st.length === 0) {
          return res.status(404).json({ success: false, message: 'Student profile not found.' });
        }
        // IDOR Protection: Ignore student_id query param, force req.user's student ID
        targetStudentId = st[0].id;
      } else if (req.user.role === 'SUPERINTENDENT') {
        if (!targetHostelId) {
          const [sh] = await pool.query('SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?', [req.user.id]);
          if (sh.length === 0) return res.status(403).json({ success: false, message: 'No assigned hostels.' });
          targetHostelId = sh[0].hostel_id;
        } else {
          const [sh] = await pool.query(
            'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
            [req.user.id, targetHostelId]
          );
          if (sh.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'Forbidden: You are not authorized to view fees for this hostel.'
            });
          }
        }
      }

      const result = await FeeService.getStudentFees({
        studentId: targetStudentId,
        hostelId: targetHostelId,
        feeType: fee_type,
        status,
        academicYear: academic_year,
        search,
        page,
        limit
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/fees/:id
   */
  static async getStudentFeeById(req, res, next) {
    try {
      const { id } = req.params;
      const fee = await FeeService.getStudentFeeById(id);
      if (!fee) {
        return res.status(404).json({ success: false, message: 'Student fee record not found.' });
      }

      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (st.length === 0 || st[0].id !== fee.student_id) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have permission to view another student\'s fee record.'
          });
        }
      } else if (req.user.role === 'SUPERINTENDENT') {
        const [sh] = await pool.query(
          'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
          [req.user.id, fee.hostel_id]
        );
        if (sh.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You are not authorized for this student\'s hostel.'
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: fee
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/fees/payments
   */
  static async recordPayment(req, res, next) {
    try {
      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot record fee payments directly.'
        });
      }

      const { student_fee_id, amount, payment_method, transaction_reference, payment_date, notes } = req.body;

      if (!student_fee_id || !amount || !payment_method) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: student_fee_id, amount, payment_method.'
        });
      }

      // Check superintendent scoping
      if (req.user.role === 'SUPERINTENDENT') {
        const [sf] = await pool.query('SELECT hostel_id FROM student_fees WHERE id = ?', [student_fee_id]);
        if (sf.length > 0) {
          const [sh] = await pool.query(
            'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
            [req.user.id, sf[0].hostel_id]
          );
          if (sh.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'Forbidden: You are not authorized to record payments for this hostel.'
            });
          }
        }
      }

      const receipt = await FeeService.recordPayment({
        studentFeeId: parseInt(student_fee_id, 10),
        amount,
        paymentMethod: payment_method,
        transactionReference: transaction_reference,
        paymentDate: payment_date,
        notes,
        receivedBy: req.user.id,
        userRole: req.user.role
      });

      return res.status(201).json({
        success: true,
        message: 'Payment recorded successfully.',
        receipt_number: receipt.receipt_number,
        data: receipt
      });
    } catch (err) {
      if (err.message.includes('exceeds remaining') || err.message.includes('already') || err.message.includes('required') || err.message.includes('Invalid')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err.message.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * GET /api/fees/payments
   */
  static async getPayments(req, res, next) {
    try {
      const { hostel_id, student_id, search, payment_method, page, limit } = req.query;
      let targetStudentId = student_id ? parseInt(student_id, 10) : undefined;
      let targetHostelId = hostel_id ? parseInt(hostel_id, 10) : undefined;

      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (st.length === 0) return res.status(404).json({ success: false, message: 'Student profile not found.' });
        targetStudentId = st[0].id;
      } else if (req.user.role === 'SUPERINTENDENT') {
        if (!targetHostelId) {
          const [sh] = await pool.query('SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?', [req.user.id]);
          if (sh.length === 0) return res.status(403).json({ success: false, message: 'No assigned hostels.' });
          targetHostelId = sh[0].hostel_id;
        } else {
          const [sh] = await pool.query(
            'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
            [req.user.id, targetHostelId]
          );
          if (sh.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'Forbidden: You are not authorized to view payments for this hostel.'
            });
          }
        }
      }

      const result = await FeeService.getPayments({
        hostelId: targetHostelId,
        studentId: targetStudentId,
        search,
        paymentMethod: payment_method,
        page,
        limit
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/fees/payments/:id OR /api/fees/receipts/:paymentId
   */
  static async getPaymentReceipt(req, res, next) {
    try {
      const { paymentId } = req.params;
      const receipt = await FeeService.getPaymentReceiptById(paymentId);
      if (!receipt) {
        return res.status(404).json({ success: false, message: 'Payment receipt not found.' });
      }

      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (st.length === 0 || st[0].id !== receipt.student_id) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have permission to view another student\'s receipt.'
          });
        }
      } else if (req.user.role === 'SUPERINTENDENT') {
        const [sh] = await pool.query(
          'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
          [req.user.id, receipt.hostel_id]
        );
        if (sh.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You are not authorized for this hostel receipt.'
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: receipt
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/fees/:id/waive
   */
  static async waiveStudentFee(req, res, next) {
    try {
      if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only Super Administrators can waive student fees.'
        });
      }

      const { id } = req.params;
      const { waiver_reason } = req.body;

      if (!waiver_reason || !waiver_reason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Waiver reason is required.'
        });
      }

      const fee = await FeeService.waiveStudentFee({
        studentFeeId: parseInt(id, 10),
        waiverReason: waiver_reason,
        waivedBy: req.user.id
      });

      return res.status(200).json({
        success: true,
        message: 'Student fee waived successfully.',
        data: fee
      });
    } catch (err) {
      if (err.message.includes('Cannot waive') || err.message.includes('already') || err.message.includes('required')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err.message.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * GET /api/fees/summary
   */
  static async getFeeSummary(req, res, next) {
    try {
      let hostelId = req.query.hostel_id ? parseInt(req.query.hostel_id, 10) : undefined;

      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (st.length === 0) return res.status(404).json({ success: false, message: 'Student profile not found.' });
        const summary = await FeeService.getStudentFeeSummary(st[0].id);
        return res.status(200).json({ success: true, data: summary });
      }

      if (req.user.role === 'SUPERINTENDENT') {
        if (!hostelId) {
          const [sh] = await pool.query('SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?', [req.user.id]);
          if (sh.length > 0) hostelId = sh[0].hostel_id;
        } else {
          const [sh] = await pool.query(
            'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
            [req.user.id, hostelId]
          );
          if (sh.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'Forbidden: You are not authorized for this hostel.'
            });
          }
        }
      }

      const summary = await FeeService.getFeeSummary(hostelId);

      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FeeController;
