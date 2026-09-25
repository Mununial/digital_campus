const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const messService = require('../services/messService');

async function seedCurrentMessMenus() {
  console.log('--- Seeding Default Mess Menus for Current and Upcoming Weeks ---');

  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const currentMonday = new Date(now.setDate(diff));

  // Seed for current week, previous week, and next 2 weeks
  for (let weekOffset = -1; weekOffset <= 3; weekOffset++) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() + (weekOffset * 7));
    const startStr = monday.toISOString().split('T')[0];

    console.log(`\nSeeding week starting ${startStr}:`);
    
    // Seed for Hostel 1 (BBH)
    await messService.ensureDefaultWeeklyMenu(1, startStr);
    console.log(`  ✔ Hostel 1 (BBH) seeded.`);

    // Seed for Hostel 2 (BGH)
    await messService.ensureDefaultWeeklyMenu(2, startStr);
    console.log(`  ✔ Hostel 2 (BGH) seeded.`);

    // Seed for Hostel null (Common)
    await messService.ensureDefaultWeeklyMenu(null, startStr);
    console.log(`  ✔ Common Hostel Schedule seeded.`);
  }

  console.log('\n--- All Mess Menus Seeded Successfully ---');
  process.exit(0);
}

seedCurrentMessMenus().catch(err => {
  console.error('Error seeding mess menus:', err);
  process.exit(1);
});
