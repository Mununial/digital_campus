const studentService = require('../services/studentService');
const db = require('../config/db');

/**
 * Lists all students with pagination, search, and filters.
 */
const getAllStudents = async (req, res, next) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      hostel_id: req.query.hostel_id,
      branch: req.query.branch,
      course: req.query.course,
      year: req.query.year,
      status: req.query.status
    };

    const result = await studentService.getAllStudents(filters, req.user);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single student's full profile.
 */
const getStudentById = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const student = await studentService.getStudentById(studentId, req.user);
    return res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the current logged-in student's profile.
 */
const getMyProfile = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(400).json({
        success: false,
        message: 'Bad Request: Only students have individual student profiles.'
      });
    }

    const [students] = await db.pool.query(
      `SELECT s.*, u.username, u.email as user_email, u.status as user_status,
              b.bed_number, r.room_number, r.id as room_id, f.floor_name, f.id as floor_id,
              h.name as hostel_name, h.id as hostel_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN beds b ON s.bed_id = b.id
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN floors f ON r.floor_id = f.id
       LEFT JOIN hostels h ON f.hostel_id = h.id
       WHERE s.user_id = ?`,
      [req.user.id]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile details not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: students[0],
      student: students[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new student record and account.
 */
const createStudent = async (req, res, next) => {
  try {
    const student = await studentService.createStudent(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      data: student
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing student record.
 */
const updateStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    await studentService.updateStudent(studentId, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'Student record updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transfers a student to a different bed/room/hostel.
 */
const transferStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const result = await studentService.transferStudent(studentId, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'Student transferred successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivates a student account.
 */
const deactivateStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    const { status } = req.body;
    await studentService.deactivateStudent(studentId, status, req.user);
    return res.status(200).json({
      success: true,
      message: `Student account status updated to ${status} successfully.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk import students from Excel/CSV parsed records.
 */
const bulkImportStudents = async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bad Request: Please provide an array of student records to import.'
      });
    }

    const summary = await studentService.bulkImportStudents(records, req.user);
    return res.status(200).json({
      success: true,
      message: `Mass import completed: ${summary.importedCount} imported, ${summary.skippedCount} skipped.`,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  getMyProfile,
  createStudent,
  updateStudent,
  transferStudent,
  deactivateStudent,
  bulkImportStudents
};
