const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getDashboardOverview } = require('../services/dashboardService');

// GET /api/dashboard/overview – returns overall and per‑hostel stats based on authenticated user role
router.get('/overview', requireAuth, async (req, res, next) => {
  try {
    const result = await getDashboardOverview(req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    // Preserve error status if set, otherwise 500
    err.status = err.status || 500;
    next(err);
  }
});

module.exports = router;
