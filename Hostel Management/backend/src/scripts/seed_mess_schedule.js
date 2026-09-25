const db = require('../config/db');

const DEFAULT_WEEKLY_TIMETABLE = [
  {
    day_name: 'Monday',
    day_offset: 0, // Monday
    meals: {
      BREAKFAST: {
        meal_name: 'Puri Sabzi & Boiled Egg / Banana',
        description: 'Hot puris with spiced aloo chana sabzi, boiled egg or banana, and hot tea/coffee',
        timing: '07:30 AM - 09:30 AM'
      },
      LUNCH: {
        meal_name: 'Steamed Rice, Dal Tadka & Mix Veg',
        description: 'Basmati rice, yellow dal tadka, seasonal mixed vegetables, crispy papad, salad and fresh curd',
        timing: '12:30 PM - 02:30 PM'
      },
      DINNER: {
        meal_name: 'Tawa Roti, Egg Curry / Paneer Butter Masala',
        description: 'Fresh wheat rotis, rich egg curry or paneer butter masala, steamed rice, dal fry and pickle',
        timing: '07:30 PM - 09:30 PM'
      }
    }
  },
  {
    day_name: 'Tuesday',
    day_offset: 1, // Tuesday
    meals: {
      BREAKFAST: {
        meal_name: 'Idli Sambar & Coconut Chutney',
        description: 'Soft steamed idlis with piping hot vegetable sambar, fresh coconut chutney and tea/coffee',
        timing: '07:30 AM - 09:30 AM'
      },
      LUNCH: {
        meal_name: 'Rice, Dal Fry, Aloo Gobhi Matar & Salad',
        description: 'Steamed rice, arhar dal fry, homestyle aloo gobhi matar sabzi, green salad and curd',
        timing: '12:30 PM - 02:30 PM'
      },
      DINNER: {
        meal_name: 'Roti, Veg Pulao, Dal Makhani & Sweet Kheer',
        description: 'Soft rotis, aromatic veg pulao, creamy dal makhani, mix veg curry and sweet rice kheer',
        timing: '07:30 PM - 09:30 PM'
      }
    }
  },
  {
    day_name: 'Wednesday',
    day_offset: 2, // Wednesday
    meals: {
      BREAKFAST: {
        meal_name: 'Aloo Paratha with Curd & Pickle',
        description: 'Stuffed aloo parathas served with fresh curd, mango pickle, butter and hot masala chai',
        timing: '07:30 AM - 09:30 AM'
      },
      LUNCH: {
        meal_name: 'Rice, Odia Dalma / Dal Fry & Bhindi Kurkuri',
        description: 'Steamed rice, authentic vegetable dalma, crispy bhindi fry, papad, curd and lemon',
        timing: '12:30 PM - 02:30 PM'
      },
      DINNER: {
        meal_name: 'Roti, Chicken Curry / Shahi Paneer & Rice',
        description: 'Hot rotis, special chicken curry or shahi paneer, jeera rice, dal tadka and onions',
        timing: '07:30 PM - 09:30 PM'
      }
    }
  },
  {
    day_name: 'Thursday',
    day_offset: 3, // Thursday
    meals: {
      BREAKFAST: {
        meal_name: 'Uttapam / Masala Dosa with Sambar & Chutney',
        description: 'Crispy dosa / onion uttapam served with lentil sambar, tomato chutney and tea',
        timing: '07:30 AM - 09:30 AM'
      },
      LUNCH: {
        meal_name: 'Rice, Chana Dal, Aloo Baingan & Dahi',
        description: 'Steamed rice, chana dal fry, spiced aloo baingan bhaja, cucumber salad and fresh dahi',
        timing: '12:30 PM - 02:30 PM'
      },
      DINNER: {
        meal_name: 'Roti, Jeera Rice, Kadai Sabzi & Gulab Jamun',
        description: 'Phulka rotis, jeera rice, seasonal kadai veg curry, dal fry, and warm gulab jamun',
        timing: '07:30 PM - 09:30 PM'
      }
    }
  },
  {
    day_name: 'Friday',
    day_offset: 4, // Friday
    meals: {
      BREAKFAST: {
        meal_name: 'Poha with Peanuts, Sev & Boiled Egg / Fruit',
        description: 'Indori poha garnished with roasted peanuts, coriander and sev, boiled egg or seasonal fruit, tea',
        timing: '07:30 AM - 09:30 AM'
      },
      LUNCH: {
        meal_name: 'Rice, Yellow Moong Dal, Soyabean Aloo Curry',
        description: 'Steamed rice, yellow moong dal, soya chunks aloo curry, roasted papad and curd',
        timing: '12:30 PM - 02:30 PM'
      },
      DINNER: {
        meal_name: 'Roti, Egg Curry / Kadai Paneer, Rice & Dal',
        description: 'Fresh wheat rotis, egg curry or kadai paneer, steamed rice, dal fry and green salad',
        timing: '07:30 PM - 09:30 PM'
      }
    }
  },
  {
    day_name: 'Saturday',
    day_offset: 5, // Saturday
    meals: {
      BREAKFAST: {
        meal_name: 'Bread Butter Jam, Veg Cutlet / Omelette',
        description: 'Toasted bread with butter & fruit jam, crispy vegetable cutlet or masala omelette, tea/coffee',
        timing: '07:30 AM - 09:30 AM'
      },
      LUNCH: {
        meal_name: 'Rice, Dal Makhani, Aloo Dum & Salad',
        description: 'Steamed rice, rich dal makhani, Kashmiri aloo dum, cucumber tomato salad and curd',
        timing: '12:30 PM - 02:30 PM'
      },
      DINNER: {
        meal_name: 'Roti, Veg Fried Rice, Manchurian / Chilli Paneer',
        description: 'Soft rotis, Indo-Chinese veg fried rice, veg manchurian gravy / chilli paneer, and soup',
        timing: '07:30 PM - 09:30 PM'
      }
    }
  },
  {
    day_name: 'Sunday',
    day_offset: 6, // Sunday
    meals: {
      BREAKFAST: {
        meal_name: 'Chole Bhature / Masala Dosa & Hot Chai',
        description: 'Fluffy bhaturas with Punjabi chole, sliced onions & green chillies, and special masala tea',
        timing: '08:00 AM - 10:00 AM'
      },
      LUNCH: {
        meal_name: 'Sunday Feast: Special Chicken / Paneer, Rice, Raita & Sweet',
        description: 'Weekend special biryani / ghee rice, chicken masala / shahi paneer, boondi raita, papad, and sweet dish',
        timing: '12:30 PM - 02:30 PM'
      },
      DINNER: {
        meal_name: 'Roti, Khichdi / Rice, Aloo Bhaja, Dal & Ice Cream',
        description: 'Light comfort dinner: Roti, special bhog khichdi / steamed rice, aloo bhaja, dal, and ice cream',
        timing: '07:30 PM - 09:30 PM'
      }
    }
  }
];

async function seedMessSchedule() {
  console.log('--- Starting Mess Weekly Time-Table Seeding ---');

  // Get admin user for created_by
  const [adminUsers] = await db.pool.query(
    `SELECT id FROM users WHERE role_id IN (1, 2) ORDER BY role_id ASC LIMIT 1`
  );
  const adminId = adminUsers.length > 0 ? adminUsers[0].id : 1;

  // Get current Monday
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = (currentDayOfWeek + 6) % 7; // distance from Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  // Seed for current week, previous week, and next 4 weeks (total 6 weeks of schedule)
  for (let weekOffset = -1; weekOffset <= 4; weekOffset++) {
    const weekMonday = new Date(monday);
    weekMonday.setDate(monday.getDate() + (weekOffset * 7));

    for (const dayEntry of DEFAULT_WEEKLY_TIMETABLE) {
      const targetDate = new Date(weekMonday);
      targetDate.setDate(weekMonday.getDate() + dayEntry.day_offset);
      const dateStr = targetDate.toISOString().slice(0, 10);

      for (const mealType of ['BREAKFAST', 'LUNCH', 'DINNER']) {
        const mealInfo = dayEntry.meals[mealType];
        
        // Check if menu exists for this date and meal_type
        const [existing] = await db.pool.query(
          `SELECT id FROM mess_menus WHERE menu_date = ? AND meal_type = ?`,
          [dateStr, mealType]
        );

        if (existing.length === 0) {
          await db.pool.query(
            `INSERT INTO mess_menus (hostel_id, menu_date, meal_type, meal_name, description, is_available, created_by)
             VALUES (NULL, ?, ?, ?, ?, 1, ?)`,
            [dateStr, mealType, mealInfo.meal_name, `${mealInfo.description} (Timing: ${mealInfo.timing})`, adminId]
          );
        }
      }
    }
  }

  console.log('✓ Successfully seeded 3-meal weekly time-tables for current and upcoming weeks!');
  process.exit(0);
}

seedMessSchedule().catch(err => {
  console.error('Error seeding mess schedule:', err);
  process.exit(1);
});
