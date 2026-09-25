const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Get current student's own profile
router.get('/profile/me', requireAuth, requireRole('STUDENT'), studentController.getMyProfile);
router.get('/me', requireAuth, requireRole('STUDENT'), studentController.getMyProfile);

// List all students (Super Admin or Superintendent only)
router.get('/', requireAuth, requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), studentController.getAllStudents);

// Get specific student by ID (requires SUPER_ADMIN, SUPERINTENDENT or Student Owner)
router.get('/:id', requireAuth, studentController.getStudentById);

// Get student summary (requires SUPER_ADMIN, SUPERINTENDENT or Student Owner)
router.get('/:id/summary', requireAuth, studentController.getStudentById);

// Create student account and assignment (Super Admin or Superintendent only)
router.post('/', requireAuth, requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), studentController.createStudent);

// Bulk import students from Excel/CSV (Super Admin or Superintendent only)
router.post('/bulk-import', requireAuth, requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), studentController.bulkImportStudents);

// Update student record (Super Admin or Superintendent only)
router.put('/:id', requireAuth, requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), studentController.updateStudent);

// Transfer student to another bed (Super Admin or Superintendent only)
router.post('/:id/transfer', requireAuth, requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), studentController.transferStudent);

// Update/Deactivate student status (Super Admin or Superintendent only)
router.patch('/:id/status', requireAuth, requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), studentController.deactivateStudent);

module.exports = router;
