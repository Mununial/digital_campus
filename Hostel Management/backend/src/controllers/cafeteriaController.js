const cafeteriaService = require('../services/cafeteriaService');

async function getCafeteriaCategories(req, res, next) {
  try {
    const categories = await cafeteriaService.getCafeteriaCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getCafeteriaMenu(req, res, next) {
  try {
    const items = await cafeteriaService.getCafeteriaMenu(req.query);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createCafeteriaItem(req, res, next) {
  try {
    const item = await cafeteriaService.createCafeteriaItem(req.user, req.body);
    res.status(201).json({ success: true, message: 'Cafeteria item added successfully!', data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function updateCafeteriaItem(req, res, next) {
  try {
    const item = await cafeteriaService.updateCafeteriaItem(req.user, req.params.id, req.body);
    res.json({ success: true, message: 'Cafeteria item updated.', data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteCafeteriaItem(req, res, next) {
  try {
    const result = await cafeteriaService.deleteCafeteriaItem(req.user, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function placeOrder(req, res, next) {
  try {
    const order = await cafeteriaService.placeOrder(req.user, req.body);
    res.status(201).json({ success: true, message: 'Order placed successfully!', data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getOrders(req, res, next) {
  try {
    const result = await cafeteriaService.getOrders(req.user, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getOrderById(req, res, next) {
  try {
    const order = await cafeteriaService.getOrderById(req.user, req.params.id);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const order = await cafeteriaService.updateOrderStatus(req.user, req.params.id, req.body);
    res.json({ success: true, message: 'Order status updated.', data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getCafeteriaStats(req, res, next) {
  try {
    const stats = await cafeteriaService.getCafeteriaStats(req.user);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getCafeteriaCategories,
  getCafeteriaMenu,
  createCafeteriaItem,
  updateCafeteriaItem,
  deleteCafeteriaItem,
  placeOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getCafeteriaStats
};
