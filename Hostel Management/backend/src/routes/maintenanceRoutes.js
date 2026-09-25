const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Helper / specific GET routes
router.get('/check-duplicates', maintenanceController.checkDuplicates);
router.get('/analytics', maintenanceController.getAnalytics);

// Technician Directory routes
router.get('/technicians', maintenanceController.getTechnicians);
router.get('/technicians/:id', maintenanceController.getTechnicianById);
router.post('/technicians', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), maintenanceController.createTechnician);
router.put('/technicians/:id', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), maintenanceController.updateTechnician);
router.delete('/technicians/:id', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), maintenanceController.deleteTechnician);

// Maintenance Request Collection & Item routes
router.post('/', maintenanceController.createRequest);
router.get('/', maintenanceController.getRequests);
router.get('/:id', maintenanceController.getRequestById);
router.patch('/:id/status', maintenanceController.updateStatus);
router.patch('/:id/assign', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), maintenanceController.assignStaff);
router.patch('/:id/assign-technician', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), maintenanceController.assignTechnician);
router.patch('/:id/priority', requireRole('SUPER_ADMIN', 'SUPERINTENDENT'), maintenanceController.updatePriority);
router.post('/:id/upvote', maintenanceController.upvoteRequest);
router.post('/:id/updates', maintenanceController.addUpdate);

module.exports = router;

