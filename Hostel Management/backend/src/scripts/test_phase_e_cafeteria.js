const db = require('../config/db');
const cafeteriaService = require('../services/cafeteriaService');

async function testPhaseE() {
  console.log('--- STARTING PHASE E CAFETERIA E2E VERIFICATION TEST ---');
  let testOrderId = null;
  let testItemId = null;

  try {
    // 1. Fetch test student & admin users
    const [students] = await db.pool.query(`
      SELECT s.id, s.user_id, u.full_name 
      FROM students s 
      JOIN users u ON s.user_id = u.id 
      LIMIT 1
    `);

    if (!students || students.length === 0) {
      throw new Error('No student found for testing cafeteria');
    }

    const testStudent = students[0];
    const studentUser = { id: testStudent.user_id, role: 'STUDENT' };

    const [admins] = await db.pool.query(`
      SELECT u.id, u.full_name, r.name as role 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'SUPERINTENDENT') 
      LIMIT 1
    `);
    const testAdmin = admins.length > 0 ? admins[0] : { id: 1, full_name: 'Admin User', role: 'ADMIN' };
    const adminUser = { id: testAdmin.id, role: testAdmin.role || 'ADMIN' };

    console.log(`Test Student: ID=${testStudent.id}, UserID=${testStudent.user_id}`);
    console.log(`Test Admin: ID=${testAdmin.id}, Role=${testAdmin.role}`);

    // 2. Fetch categories & menu items
    console.log('\n[TEST 1] Fetching cafeteria categories & menu items...');
    const categories = await cafeteriaService.getCafeteriaCategories();
    console.log(`SUCCESS: Found ${categories.length} category(ies).`);

    const menu = await cafeteriaService.getCafeteriaMenu();
    console.log(`SUCCESS: Found ${menu.length} food item(s) in catalog.`);

    if (menu.length === 0) {
      throw new Error('No cafeteria menu items found.');
    }

    // 3. Admin creates a new custom food item
    console.log('\n[TEST 2] Creating new food item as Admin...');
    const newItem = await cafeteriaService.createCafeteriaItem(adminUser, {
      category_id: categories[0].id,
      name: 'Test Chocolate Donut',
      description: 'Fresh baked glaze chocolate donut',
      price: 45.00,
      is_vegetarian: 1,
      preparation_time_mins: 5
    });
    testItemId = newItem.id;
    console.log(`SUCCESS: Created food item ID=${testItemId}, Name=${newItem.name}, Price=₹${newItem.price}`);

    // 4. Student places an order
    console.log('\n[TEST 3] Placing cafeteria order as Student...');
    const orderData = {
      items: [
        { item_id: menu[0].id, quantity: 2 },
        { item_id: testItemId, quantity: 1 }
      ],
      delivery_type: 'ROOM_DELIVERY',
      payment_method: 'UPI',
      special_instructions: 'Less spicy, deliver quickly'
    };

    const newOrder = await cafeteriaService.placeOrder(studentUser, orderData);
    testOrderId = newOrder.id;
    console.log(`SUCCESS: Order placed! Order No=${newOrder.order_number}, Total=₹${newOrder.total_amount}, Status=${newOrder.status}`);

    // 5. Fetch orders list & stats
    console.log('\n[TEST 4] Fetching order list and stats...');
    const ordersList = await cafeteriaService.getOrders(studentUser, {});
    console.log(`SUCCESS: Student sees ${ordersList.data.length} order(s).`);

    const stats = await cafeteriaService.getCafeteriaStats(adminUser);
    console.log('SUCCESS: Cafeteria stats:', stats);

    // 6. Admin updates order status (PLACED -> PREPARING -> DELIVERED)
    console.log('\n[TEST 5] Updating order status as Admin...');
    const updatedOrder = await cafeteriaService.updateOrderStatus(adminUser, testOrderId, {
      status: 'DELIVERED',
      payment_status: 'PAID'
    });
    console.log(`SUCCESS: Order status updated to=${updatedOrder.status}, Payment=${updatedOrder.payment_status}`);

    // 7. Security check - Student write block
    console.log('\n[TEST 6] Testing security block for student menu creation...');
    try {
      await cafeteriaService.createCafeteriaItem(studentUser, {
        category_id: categories[0].id,
        name: 'Unauthorized Item',
        price: 10.00
      });
      throw new Error('SECURITY FAIL: Student was able to create menu item');
    } catch (err) {
      if (err.message.includes('not authorized')) {
        console.log('SUCCESS: Student menu item creation correctly blocked by security layer.');
      } else {
        throw err;
      }
    }

    // Cleanup
    console.log('\nCleaning up test artifacts...');
    if (testOrderId) {
      await db.pool.query('DELETE FROM cafeteria_orders WHERE id = ?', [testOrderId]);
    }
    if (testItemId) {
      await db.pool.query('DELETE FROM cafeteria_items WHERE id = ?', [testItemId]);
    }

    console.log('\n--- PHASE E TEST CLEANUP COMPLETED SUCCESSFULLY ---');
    console.log('ALL 6 E2E TEST SCENARIOS PASSED FOR PHASE E CAFETERIA SYSTEM!');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ PHASE E E2E TEST FAILED:', err);
    if (testOrderId) await db.pool.query('DELETE FROM cafeteria_orders WHERE id = ?', [testOrderId]).catch(() => {});
    if (testItemId) await db.pool.query('DELETE FROM cafeteria_items WHERE id = ?', [testItemId]).catch(() => {});
    process.exit(1);
  }
}

testPhaseE();
