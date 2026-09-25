const MessService = require('./services/messService');
const { pool } = require('./config/db');

const runAudit = async () => {
  console.log('\n====================================================');
  console.log('   PHASE 10 — HOSTEL MESS & FOOD MANAGEMENT AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (title, fn) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${title}:`, err.message);
      failed++;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Menu Creation Test
  await test('Super Admin can create menu item with valid meal type', async () => {
    const item = await MessService.createMenuItem({
      hostelId: 1,
      menuDate: '2026-08-30',
      mealType: 'BREAKFAST',
      mealName: 'Puri Sambar',
      description: 'Hot puris served with potato bhaji and sambar',
      isAvailable: 1,
      createdBy: 1
    });
    if (!item || item.meal_type !== 'BREAKFAST' || item.meal_name !== 'Puri Sambar') {
      throw new Error('Menu item creation returned invalid data');
    }
  });

  // 2. Invalid Meal Type Test
  await test('Reject invalid meal type with 400 validation error', async () => {
    try {
      await MessService.createMenuItem({
        hostelId: 1,
        menuDate: '2026-08-30',
        mealType: 'BRUNCH',
        mealName: 'Invalid Meal',
        createdBy: 1
      });
      throw new Error('Should have failed for invalid meal type');
    } catch (err) {
      if (!err.message.includes('Invalid meal type')) {
        throw err;
      }
    }
  });

  // 3. Duplicate Prevention Test
  await test('Prevent duplicate meal entry for same date, hostel, and meal type', async () => {
    try {
      await MessService.createMenuItem({
        hostelId: 1,
        menuDate: '2026-08-30',
        mealType: 'BREAKFAST',
        mealName: 'Duplicate Puri',
        createdBy: 1
      });
      throw new Error('Should have prevented duplicate menu item');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }
  });

  // 4. Update Menu Item Test
  await test('Staff can update menu item details', async () => {
    const menus = await MessService.getMenus({ hostelId: 1, date: '2026-08-30' });
    const target = menus.find(m => m.meal_type === 'BREAKFAST');
    if (!target) throw new Error('Target menu item not found for update');

    const updated = await MessService.updateMenuItem(
      target.id,
      { mealName: 'Puri Bhaji Special', description: 'Updated recipe' },
      { id: 1, role: 'SUPER_ADMIN' }
    );
    if (updated.meal_name !== 'Puri Bhaji Special') {
      throw new Error('Menu item was not updated correctly');
    }
  });

  // 5. Delete Menu Item Test
  await test('Staff can delete menu item', async () => {
    const menus = await MessService.getMenus({ hostelId: 1, date: '2026-08-30' });
    const target = menus.find(m => m.meal_type === 'BREAKFAST');
    if (!target) throw new Error('Target menu item not found for deletion');

    await MessService.deleteMenuItem(target.id, { id: 1, role: 'SUPER_ADMIN' });
    const remaining = await MessService.getMenus({ hostelId: 1, date: '2026-08-30' });
    if (remaining.some(m => m.id === target.id)) {
      throw new Error('Menu item still exists after deletion');
    }
  });

  // 6. Student Meal Participation Upsert Test
  await test('Student can mark meal participation (TAKING / NOT_TAKING)', async () => {
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const rec = await MessService.setMealParticipation({
      studentId: 1,
      hostelId: 1,
      mealDate: tomorrowStr,
      mealType: 'LUNCH',
      status: 'NOT_TAKING',
      isStudentRole: true
    });
    if (!rec || rec.status !== 'NOT_TAKING') {
      throw new Error('Meal participation status was not saved correctly');
    }
  });

  // 7. Cutoff Enforcement Test
  await test('Cutoff enforcement blocks student from updating past meal participation', async () => {
    try {
      await MessService.setMealParticipation({
        studentId: 1,
        hostelId: 1,
        mealDate: '2026-01-01', // Past date
        mealType: 'LUNCH',
        status: 'TAKING',
        isStudentRole: true
      });
      throw new Error('Should have blocked participation modification after cutoff');
    } catch (err) {
      if (!err.message.includes('Cutoff time')) {
        throw err;
      }
    }
  });

  // 8. Mess Summary Calculation Test
  await test('Mess summary calculates active student meal counts', async () => {
    const summary = await MessService.getMessSummary(1, todayStr);
    if (!summary || !summary.meals || !summary.meals.BREAKFAST) {
      throw new Error('Mess summary failed to generate expected structure');
    }
    if (typeof summary.meals.BREAKFAST.taking !== 'number') {
      throw new Error('Invalid numeric count for breakfast taking count');
    }
  });

  // 9. Mess Analytics Test
  await test('Mess analytics returns participation percentage statistics', async () => {
    const analytics = await MessService.getMessAnalytics(1);
    if (!analytics || !analytics.analytics || !analytics.analytics.LUNCH) {
      throw new Error('Mess analytics structure invalid');
    }
    if (typeof analytics.analytics.LUNCH.participationPercentage !== 'number') {
      throw new Error('Participation percentage must be numeric');
    }
  });

  // 10. Complaint Category Test
  await test('Existing complaints table accepts FOOD_MESS category', async () => {
    const [rows] = await pool.query(`SHOW COLUMNS FROM complaints LIKE 'category'`);
    if (rows.length > 0) {
      const typeStr = rows[0].Type;
      if (!typeStr.includes('FOOD_MESS')) {
        throw new Error('Complaints category ENUM missing FOOD_MESS');
      }
    }
  });

  console.log('\n====================================================');
  console.log(`   MESS SYSTEM AUDIT COMPLETED: ${passed}/${passed + failed} PASSED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runAudit().catch(err => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
