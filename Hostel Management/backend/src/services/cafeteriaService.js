const db = require('../config/db');
const activityService = require('./activityService');

/**
 * Generate unique Order Number e.g. CAF-20260923-4819
 */
function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CAF-${dateStr}-${randomSuffix}`;
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
 * Fetch all food categories
 */
async function getCafeteriaCategories() {
  const [rows] = await db.pool.query(`
    SELECT c.*, COUNT(i.id) as item_count
    FROM cafeteria_categories c
    LEFT JOIN cafeteria_items i ON c.id = i.category_id AND i.is_available = 1
    WHERE c.is_active = 1
    GROUP BY c.id
    ORDER BY c.display_order ASC, c.name ASC
  `);
  return rows;
}

/**
 * Fetch menu items with filtering
 */
async function getCafeteriaMenu(filters = {}) {
  const { category_id, is_vegetarian, search, is_available } = filters;
  const whereClauses = [];
  const params = [];

  if (category_id) {
    whereClauses.push('i.category_id = ?');
    params.push(category_id);
  }

  if (is_vegetarian !== undefined && is_vegetarian !== '') {
    whereClauses.push('i.is_vegetarian = ?');
    params.push(is_vegetarian === 'true' || is_vegetarian === '1' ? 1 : 0);
  }

  if (is_available !== undefined && is_available !== '') {
    whereClauses.push('i.is_available = ?');
    params.push(is_available === 'true' || is_available === '1' ? 1 : 0);
  }

  if (search) {
    whereClauses.push('(i.name LIKE ? OR i.description LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      i.*,
      c.name as category_name
    FROM cafeteria_items i
    JOIN cafeteria_categories c ON i.category_id = c.id
    ${whereSql}
    ORDER BY c.display_order ASC, i.name ASC
  `;

  const [rows] = await db.pool.query(sql, params);
  return rows;
}

/**
 * Add new food item (Staff)
 */
async function createCafeteriaItem(user, data) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to manage menu items.');
  }

  const { category_id, name, description, price, is_vegetarian = 1, image_url = null, preparation_time_mins = 15 } = data;

  if (!category_id || !name || price === undefined) {
    throw new Error('Category, Item Name, and Price are required.');
  }

  const [result] = await db.pool.query(
    `INSERT INTO cafeteria_items (category_id, name, description, price, is_vegetarian, image_url, preparation_time_mins, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [category_id, name.trim(), description ? description.trim() : null, price, is_vegetarian ? 1 : 0, image_url, preparation_time_mins, user.id]
  );

  await activityService.logActivity({
    actorId: user.id,
    action: 'CREATE_CAFETERIA_ITEM',
    module: 'CAFETERIA',
    entityType: 'ITEM',
    entityId: result.insertId,
    description: `Added new cafeteria item: ${name} (₹${price})`
  });

  return getItemById(result.insertId);
}

/**
 * Helper to fetch item by ID
 */
async function getItemById(itemId) {
  const [rows] = await db.pool.query(
    `SELECT i.*, c.name as category_name 
     FROM cafeteria_items i 
     JOIN cafeteria_categories c ON i.category_id = c.id 
     WHERE i.id = ?`,
    [itemId]
  );
  return rows[0] || null;
}

/**
 * Update food item (Staff)
 */
async function updateCafeteriaItem(user, itemId, data) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to edit menu items.');
  }

  const existing = await getItemById(itemId);
  if (!existing) {
    throw new Error('Cafeteria item not found.');
  }

  const { category_id, name, description, price, is_vegetarian, image_url, preparation_time_mins, is_available } = data;

  await db.pool.query(
    `UPDATE cafeteria_items
     SET category_id = ?, name = ?, description = ?, price = ?, is_vegetarian = ?, image_url = ?, preparation_time_mins = ?, is_available = ?
     WHERE id = ?`,
    [
      category_id || existing.category_id,
      name ? name.trim() : existing.name,
      description !== undefined ? description : existing.description,
      price !== undefined ? price : existing.price,
      is_vegetarian !== undefined ? (is_vegetarian ? 1 : 0) : existing.is_vegetarian,
      image_url !== undefined ? image_url : existing.image_url,
      preparation_time_mins !== undefined ? preparation_time_mins : existing.preparation_time_mins,
      is_available !== undefined ? (is_available ? 1 : 0) : existing.is_available,
      itemId
    ]
  );

  return getItemById(itemId);
}

/**
 * Delete food item (Staff)
 */
async function deleteCafeteriaItem(user, itemId) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to delete menu items.');
  }

  const existing = await getItemById(itemId);
  if (!existing) {
    throw new Error('Cafeteria item not found.');
  }

  await db.pool.query('DELETE FROM cafeteria_items WHERE id = ?', [itemId]);
  return { success: true, message: `Item ${existing.name} deleted.` };
}

/**
 * Place Cafeteria Order (Student)
 */
async function placeOrder(user, orderData) {
  const student = await getStudentByUserId(user.id);
  if (!student) {
    throw new Error('Student profile not found.');
  }

  const { items = [], delivery_type = 'PICKUP', delivery_location, payment_method = 'UPI', special_instructions } = orderData;

  if (!items || items.length === 0) {
    throw new Error('Your cart is empty. Select at least one item.');
  }

  // Fetch items from DB to verify price and availability
  let totalAmount = 0;
  const lineItems = [];

  for (const cartItem of items) {
    const item = await getItemById(cartItem.item_id);
    if (!item) {
      throw new Error(`Item ID ${cartItem.item_id} not found.`);
    }
    if (!item.is_available) {
      throw new Error(`Item "${item.name}" is currently out of stock.`);
    }
    const qty = parseInt(cartItem.quantity, 10) || 1;
    const subtotal = Number(item.price) * qty;
    totalAmount += subtotal;

    lineItems.push({
      item_id: item.id,
      item_name: item.name,
      unit_price: item.price,
      quantity: qty,
      subtotal
    });
  }

  let orderNumber = generateOrderNumber();
  let isUnique = false;
  let retries = 0;
  while (!isUnique && retries < 5) {
    const [exist] = await db.pool.query('SELECT id FROM cafeteria_orders WHERE order_number = ?', [orderNumber]);
    if (exist.length === 0) isUnique = true;
    else { orderNumber = generateOrderNumber(); retries++; }
  }

  let hostelId = student.hostel_id || 1;

  const orderSql = `
    INSERT INTO cafeteria_orders (
      order_number, student_id, hostel_id, delivery_type,
      delivery_location, payment_method, payment_status,
      total_amount, status, special_instructions
    ) VALUES (?, ?, ?, ?, ?, ?, 'PAID', ?, 'PLACED', ?)
  `;

  const [orderResult] = await db.pool.query(orderSql, [
    orderNumber,
    student.id,
    hostelId,
    delivery_type,
    delivery_location || (delivery_type === 'ROOM_DELIVERY' ? `Room ${student.room_number || '101'}` : null),
    payment_method,
    totalAmount,
    special_instructions ? special_instructions.trim() : null
  ]);

  const orderId = orderResult.insertId;

  // Insert line items
  for (const line of lineItems) {
    await db.pool.query(
      `INSERT INTO cafeteria_order_items (order_id, item_id, item_name, unit_price, quantity, subtotal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, line.item_id, line.item_name, line.unit_price, line.quantity, line.subtotal]
    );
  }

  // Log activity
  await activityService.logActivity({
    actorId: user.id,
    action: 'PLACE_CAFETERIA_ORDER',
    module: 'CAFETERIA',
    entityType: 'ORDER',
    entityId: orderId,
    hostelId,
    studentId: student.id,
    description: `Placed cafeteria order ${orderNumber} for ₹${totalAmount.toFixed(2)}`
  });

  return getOrderById(user, orderId);
}

/**
 * Fetch Orders with role scoping & status filter
 */
async function getOrders(user, filters = {}) {
  const { status, page = 1, limit = 20 } = filters;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const whereClauses = [];
  const params = [];

  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student) return { data: [], total: 0, page: 1, limit: 20 };
    whereClauses.push('o.student_id = ?');
    params.push(student.id);
  }

  if (status) {
    whereClauses.push('o.status = ?');
    params.push(status);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) as total
    FROM cafeteria_orders o
    ${whereSql}
  `;
  const [countRows] = await db.pool.query(countSql, params);
  const total = countRows[0].total;

  const dataSql = `
    SELECT 
      o.*,
      s.full_name as student_name,
      s.roll_number,
      s.phone as student_phone,
      h.name as hostel_name
    FROM cafeteria_orders o
    JOIN students s ON o.student_id = s.id
    LEFT JOIN hostels h ON o.hostel_id = h.id
    ${whereSql}
    ORDER BY o.placed_at DESC
    LIMIT ? OFFSET ?
  `;

  const [orders] = await db.pool.query(dataSql, [...params, parseInt(limit, 10), offset]);

  // Enrich each order with line items
  for (const order of orders) {
    const [lineItems] = await db.pool.query(
      'SELECT * FROM cafeteria_order_items WHERE order_id = ?',
      [order.id]
    );
    order.items = lineItems;
  }

  return {
    data: orders,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
}

/**
 * Fetch Order by ID
 */
async function getOrderById(user, orderId) {
  const sql = `
    SELECT 
      o.*,
      s.full_name as student_name,
      s.roll_number,
      s.phone as student_phone,
      h.name as hostel_name
    FROM cafeteria_orders o
    JOIN students s ON o.student_id = s.id
    LEFT JOIN hostels h ON o.hostel_id = h.id
    WHERE o.id = ? OR o.order_number = ?
  `;

  const [rows] = await db.pool.query(sql, [orderId, orderId]);
  if (rows.length === 0) {
    throw new Error('Cafeteria Order not found.');
  }

  const order = rows[0];

  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student || student.id !== order.student_id) {
      throw new Error('Unauthorized to view this order.');
    }
  }

  const [lineItems] = await db.pool.query(
    'SELECT * FROM cafeteria_order_items WHERE order_id = ?',
    [order.id]
  );
  order.items = lineItems;

  return order;
}

/**
 * Update Order Status (Staff)
 */
async function updateOrderStatus(user, orderId, { status, payment_status }) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to update order status.');
  }

  const order = await getOrderById(user, orderId);

  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'PREPARING') {
      updates.push('prepared_at = NOW()');
    } else if (status === 'DELIVERED') {
      updates.push('delivered_at = NOW()');
    }
  }

  if (payment_status) {
    updates.push('payment_status = ?');
    params.push(payment_status);
  }

  if (updates.length === 0) {
    return order;
  }

  params.push(order.id);
  await db.pool.query(`UPDATE cafeteria_orders SET ${updates.join(', ')} WHERE id = ?`, params);

  await activityService.logActivity({
    actorId: user.id,
    action: 'UPDATE_CAFETERIA_ORDER',
    module: 'CAFETERIA',
    entityType: 'ORDER',
    entityId: order.id,
    hostelId: order.hostel_id,
    studentId: order.student_id,
    description: `Updated cafeteria order ${order.order_number} status to ${status || order.status}`
  });

  return getOrderById(user, order.id);
}

/**
 * Get Cafeteria Summary Statistics
 */
async function getCafeteriaStats(user) {
  let studentClause = '';
  const params = [];

  if (user.role === 'STUDENT') {
    const student = await getStudentByUserId(user.id);
    if (!student) return { active_orders: 0, total_placed: 0, delivered: 0, total_spent: 0 };
    studentClause = 'WHERE student_id = ?';
    params.push(student.id);
  }

  const sql = `
    SELECT
      COUNT(CASE WHEN status IN ('PLACED', 'PREPARING', 'READY') THEN 1 END) as active_orders,
      COUNT(CASE WHEN status = 'PLACED' THEN 1 END) as placed,
      COUNT(CASE WHEN status = 'PREPARING' THEN 1 END) as preparing,
      COUNT(CASE WHEN status = 'READY' THEN 1 END) as ready,
      COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered,
      COUNT(*) as total_orders,
      COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total_amount ELSE 0 END), 0) as total_revenue
    FROM cafeteria_orders
    ${studentClause}
  `;

  const [rows] = await db.pool.query(sql, params);
  return rows[0] || { active_orders: 0, placed: 0, preparing: 0, ready: 0, delivered: 0, total_orders: 0, total_revenue: 0 };
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
