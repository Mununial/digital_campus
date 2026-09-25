const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const messService = require('../services/messService');

// Colors for terminal logs
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function logPass(msg) {
  console.log(`${GREEN}✔ PASS: ${msg}${RESET}`);
}

function logFail(msg, err) {
  console.error(`${RED}✖ FAIL: ${msg}${RESET}`, err ? err.message || err : '');
  process.exitCode = 1;
}

async function runMessEndToEndTests() {
  console.log(`${YELLOW}====================================================${RESET}`);
  console.log(`${YELLOW}   MESS MENU END-TO-END AUTOMATED TEST SUITE        ${RESET}`);
  console.log(`${YELLOW}====================================================${RESET}`);

  let testHostelId = 1;
  let adminUser = { id: 1, role: 'SUPER_ADMIN', username: 'superadmin' };
  let studentUser = { id: 100, role: 'STUDENT', username: 'teststudent' };
  let unassignedSuperintendent = { id: 99, role: 'SUPERINTENDENT', username: 'otherwarden' };

  try {
    // Check DB connection
    const [hostels] = await pool.query('SELECT id, name FROM hostels LIMIT 2');
    if (hostels.length > 0) {
      testHostelId = hostels[0].id;
      console.log(`Using test hostel: ${hostels[0].name} (ID: ${testHostelId})`);
    }

    // Determine current Monday's date string YYYY-MM-DD
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMon = (currentDay === 0 ? -6 : 1 - currentDay);
    const monDateObj = new Date(now);
    monDateObj.setDate(now.getDate() + distanceToMon);
    const mondayStr = monDateObj.toISOString().split('T')[0];

    const tueDateObj = new Date(monDateObj); tueDateObj.setDate(monDateObj.getDate() + 1);
    const tuesdayStr = tueDateObj.toISOString().split('T')[0];

    const wedDateObj = new Date(monDateObj); wedDateObj.setDate(monDateObj.getDate() + 2);
    const wednesdayStr = wedDateObj.toISOString().split('T')[0];

    console.log(`Test week dates -> Monday: ${mondayStr}, Tuesday: ${tuesdayStr}, Wednesday: ${wednesdayStr}`);

    // Clean up test data for these dates first
    await pool.query(
      'DELETE FROM mess_menus WHERE hostel_id = ? AND menu_date IN (?, ?, ?)',
      [testHostelId, mondayStr, tuesdayStr, wednesdayStr]
    );

    // ==========================================
    // TEST 1: POST Add Food Item (Multiple Items)
    // ==========================================
    console.log(`\n--- TEST 1: POST Add Food Item ---`);
    const addPayload = {
      hostelId: testHostelId,
      menuDate: mondayStr,
      mealType: 'BREAKFAST',
      mealName: 'Puri Bhaji, Masala Chai, Banana',
      description: 'Breakfast special',
      isAvailable: true,
      createdBy: adminUser.id
    };

    const createdItem = await messService.createMenuItem(addPayload);
    if (createdItem && createdItem.id) {
      logPass(`Created Breakfast menu (ID: ${createdItem.id}) with items: ${createdItem.meal_name}`);
    } else {
      throw new Error('createMenuItem did not return a valid record with ID.');
    }

    // Verify in database directly
    const [dbRows1] = await pool.query('SELECT * FROM mess_menus WHERE id = ?', [createdItem.id]);
    if (dbRows1.length === 1 && dbRows1[0].meal_name.includes('Puri Bhaji')) {
      logPass(`Database record verified in mess_menus table directly.`);
    } else {
      throw new Error('Database verification failed for created menu item.');
    }

    // ==========================================
    // TEST 2: GET Fetch Weekly Menu
    // ==========================================
    console.log(`\n--- TEST 2: GET Fetch Weekly Menu ---`);
    const weeklyData = await messService.getWeeklyMenu(testHostelId, mondayStr);
    if (weeklyData && weeklyData.items && Array.isArray(weeklyData.items)) {
      const foundItem = weeklyData.items.find(i => String(i.menu_date).substring(0,10) === mondayStr && i.meal_type === 'BREAKFAST');
      if (foundItem) {
        logPass(`Successfully fetched weekly menu containing Monday Breakfast items: ${foundItem.meal_name}`);
      } else {
        throw new Error('Monday Breakfast item not found in weekly menu payload.');
      }
    } else {
      throw new Error('getWeeklyMenu failed to return valid items array.');
    }

    // ==========================================
    // TEST 3: PUT Edit Food Item
    // ==========================================
    console.log(`\n--- TEST 3: PUT Edit Food Item ---`);
    const editData = {
      mealName: 'Aloo Paratha, Fresh Curd, Special Tea',
      description: 'Updated Breakfast',
      isAvailable: true
    };

    const updatedItem = await messService.updateMenuItem(createdItem.id, editData, adminUser);
    const [dbRows2] = await pool.query('SELECT * FROM mess_menus WHERE id = ?', [createdItem.id]);
    if (dbRows2.length === 1 && dbRows2[0].meal_name.includes('Aloo Paratha')) {
      logPass(`Successfully updated menu item ID ${createdItem.id} to: ${dbRows2[0].meal_name}`);
    } else {
      throw new Error('Failed to verify updated menu item in database.');
    }

    // ==========================================
    // TEST 4: DELETE Remove Food Item
    // ==========================================
    console.log(`\n--- TEST 4: DELETE Remove Food Item ---`);
    const deleteRes = await messService.deleteMenuItem(createdItem.id, adminUser);
    const [dbRows3] = await pool.query('SELECT * FROM mess_menus WHERE id = ?', [createdItem.id]);
    if (dbRows3.length === 0) {
      logPass(`Successfully deleted menu item ID ${createdItem.id} from mess_menus table.`);
    } else {
      throw new Error('Deleted item still exists in database.');
    }

    // ==========================================
    // TEST 5: Copy Day Menu (Bulk Day Copy)
    // ==========================================
    console.log(`\n--- TEST 5: Copy Day Menu (Bulk Copy) ---`);
    // First setup Monday full day menu (Breakfast, Lunch, Dinner)
    await messService.createMenuItem({
      hostelId: testHostelId, menuDate: mondayStr, mealType: 'BREAKFAST',
      mealName: 'Poha, Jalebi, Tea', createdBy: adminUser.id
    });
    await messService.createMenuItem({
      hostelId: testHostelId, menuDate: mondayStr, mealType: 'LUNCH',
      mealName: 'Rice, Dal Tadka, Paneer Butter Masala, Salad', createdBy: adminUser.id
    });
    await messService.createMenuItem({
      hostelId: testHostelId, menuDate: mondayStr, mealType: 'DINNER',
      mealName: 'Roti, Mix Veg, Gulab Jamun', createdBy: adminUser.id
    });

    logPass(`Created source menu for Monday (${mondayStr}) with 3 meals.`);

    // Copy Monday menu to Tuesday & Wednesday
    const copyRes = await messService.copyDayMenu({
      hostelId: testHostelId,
      sourceDate: mondayStr,
      targetDates: [tuesdayStr, wednesdayStr],
      user: adminUser
    });

    logPass(`Executed copyDayMenu service: ${copyRes.message}`);

    // Verify Tuesday & Wednesday menus in DB
    const [copiedRows] = await pool.query(
      'SELECT menu_date, meal_type, meal_name FROM mess_menus WHERE hostel_id = ? AND menu_date IN (?, ?) ORDER BY menu_date, meal_type',
      [testHostelId, tuesdayStr, wednesdayStr]
    );

    if (copiedRows.length === 6) {
      logPass(`Verified 6 copied meal slots across Tuesday and Wednesday in database.`);
      copiedRows.forEach(r => {
        const dStr = String(r.menu_date).substring(0,10);
        console.log(`   └─ ${dStr} [${r.meal_type}]: ${r.meal_name}`);
      });
    } else {
      throw new Error(`Expected 6 copied menu entries in DB, but found ${copiedRows.length}`);
    }

    // ==========================================
    // TEST 6: Security Check (Student Write Block)
    // ==========================================
    console.log(`\n--- TEST 6: Security Check - Student Write Block ---`);
    // Testing controller logic for student RBAC rejection
    const mockStudentRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(payload) {
        this.payload = payload;
        return this;
      }
    };

    const messController = require('../controllers/messController');
    const studentReq = {
      user: studentUser,
      body: {
        hostel_id: testHostelId,
        menu_date: mondayStr,
        meal_type: 'BREAKFAST',
        meal_name: 'Unauthorized Food'
      }
    };

    await messController.createMenuItem(studentReq, mockStudentRes, (err) => {});
    if (mockStudentRes.statusCode === 403) {
      logPass(`Student write attempt correctly rejected with status 403: ${mockStudentRes.payload.message}`);
    } else {
      throw new Error(`Expected status 403 for student write attempt, but got ${mockStudentRes.statusCode}`);
    }

    // ==========================================
    // TEST 7: Superintendent Hostel Scoping Check
    // ==========================================
    console.log(`\n--- TEST 7: Security Check - Superintendent Hostel Isolation ---`);
    const mockWardenRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(payload) {
        this.payload = payload;
        return this;
      }
    };

    const wardenReq = {
      user: unassignedSuperintendent,
      body: {
        hostel_id: 99999, // Unassigned hostel ID
        menu_date: mondayStr,
        meal_type: 'BREAKFAST',
        meal_name: 'Illegal Hostel Food'
      }
    };

    await messController.createMenuItem(wardenReq, mockWardenRes, (err) => {});
    if (mockWardenRes.statusCode === 403) {
      logPass(`Superintendent unassigned hostel write attempt correctly rejected with 403: ${mockWardenRes.payload.message}`);
    } else {
      throw new Error(`Expected status 403 for unassigned hostel write, but got ${mockWardenRes.statusCode}`);
    }

    // Cleanup test data created during test run
    await pool.query(
      'DELETE FROM mess_menus WHERE hostel_id = ? AND menu_date IN (?, ?, ?)',
      [testHostelId, mondayStr, tuesdayStr, wednesdayStr]
    );
    console.log(`\nCleaned up test entries from mess_menus table.`);

    console.log(`\n${GREEN}====================================================${RESET}`);
    console.log(`${GREEN}   ALL 7 MESS MENU TEST SCENARIOS PASSED!           ${RESET}`);
    console.log(`${GREEN}====================================================${RESET}\n`);

  } catch (err) {
    logFail('Mess Menu End-to-End Test Suite', err);
  } finally {
    process.exit(process.exitCode || 0);
  }
}

runMessEndToEndTests();
