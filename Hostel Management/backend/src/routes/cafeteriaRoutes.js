const express = require('express');
const router = express.Router();
const cafeteriaController = require('../controllers/cafeteriaController');
const { requireAuth } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(requireAuth);

// Categories & Stats
router.get('/categories', cafeteriaController.getCafeteriaCategories);
router.get('/stats', cafeteriaController.getCafeteriaStats);

// Menu Items CRUD
router.get('/items', cafeteriaController.getCafeteriaMenu);
router.post('/items', cafeteriaController.createCafeteriaItem);
router.put('/items/:id', cafeteriaController.updateCafeteriaItem);
router.delete('/items/:id', cafeteriaController.deleteCafeteriaItem);

// Orders
router.get('/orders', cafeteriaController.getOrders);
router.get('/orders/:id', cafeteriaController.getOrderById);
router.post('/orders', cafeteriaController.placeOrder);
router.put('/orders/:id/status', cafeteriaController.updateOrderStatus);

module.exports = router;
