const { pool } = require('../config/db');

const WEEKLY_MENUS = [
  {
    day_offset: 0, // Monday
    BREAKFAST: {
      meal_name: 'Puri Sabzi & Boiled Egg / Banana',
      description: 'Hot puffed puris served with spiced aloo chana gravy, boiled egg or fresh banana, and hot masala chai.'
    },
    LUNCH: {
      meal_name: 'Steamed Rice, Dal Tadka & Mix Veg Fry',
      description: 'Basmati steamed rice, yellow moong dal tadka, seasonal mixed veg fry, crispy papad, green salad and fresh curd.'
    },
    DINNER: {
      meal_name: 'Tawa Roti, Egg Curry / Paneer Butter Masala',
      description: 'Fresh wheat rotis, homestyle egg curry or paneer butter masala, steamed rice, dal fry and mango pickle.'
    }
  },
  {
    day_offset: 1, // Tuesday
    BREAKFAST: {
      meal_name: 'Idli Sambar & Coconut Chutney',
      description: 'Soft steamed rice idlis served with piping hot vegetable sambar, fresh coconut chutney and filter coffee or tea.'
    },
    LUNCH: {
      meal_name: 'Rice, Dal Fry, Aloo Gobhi Matar & Salad',
      description: 'Steamed rice, arhar dal fry, homestyle aloo gobhi matar sabzi, roasted papad, cucumber salad and curd.'
    },
    DINNER: {
      meal_name: 'Phulka Roti, Veg Pulao, Dal Makhani & Kheer',
      description: 'Soft phulkas, aromatic veg pulao, creamy slow-cooked dal makhani, mixed veg curry and sweet rice kheer.'
    }
  },
  {
    day_offset: 2, // Wednesday
    BREAKFAST: {
      meal_name: 'Aloo Paratha with Fresh Curd & Butter',
      description: 'Stuffed spiced aloo parathas served with fresh dahi, mango pickle, white butter and ginger tea.'
    },
    LUNCH: {
      meal_name: 'Rice, Odia Special Dalma & Bhindi Kurkuri',
      description: 'Steamed rice, authentic vegetable dalma with roasted cumin ghee, crispy bhindi fry, papad, lemon and curd.'
    },
    DINNER: {
      meal_name: 'Roti, Chicken Curry / Shahi Paneer & Jeera Rice',
      description: 'Wheat rotis, special chicken curry or rich shahi paneer, fragrant jeera rice, yellow dal and sliced onions.'
    }
  },
  {
    day_offset: 3, // Thursday
    BREAKFAST: {
      meal_name: 'Uttapam / Masala Dosa with Sambar & Chutney',
      description: 'Crispy masala dosa or onion uttapam served with vegetable sambar, red tomato chutney and hot tea.'
    },
    LUNCH: {
      meal_name: 'Rice, Chana Dal, Aloo Baingan Bhaja & Dahi',
      description: 'Steamed rice, chana dal fry, spiced aloo baingan bhaja, onion tomato salad and fresh curd.'
    },
    DINNER: {
      meal_name: 'Phulka Roti, Jeera Rice, Kadai Sabzi & Gulab Jamun',
      description: 'Hot phulkas, jeera rice, seasonal kadai veg curry, dal tadka, and warm gulab jamun sweet.'
    }
  },
  {
    day_offset: 4, // Friday
    BREAKFAST: {
      meal_name: 'Poha with Peanuts, Sev & Boiled Egg / Fruit',
      description: 'Indori poha garnished with roasted peanuts, coriander and sev, boiled egg or seasonal fruit, and masala tea.'
    },
    LUNCH: {
      meal_name: 'Rice, Yellow Moong Dal, Soyabean Aloo Curry',
      description: 'Steamed rice, yellow moong dal, soya chunks aloo curry, roasted papad, salad and curd.'
    },
    DINNER: {
      meal_name: 'Tawa Roti, Egg Masala / Kadai Paneer & Dal Fry',
      description: 'Fresh wheat rotis, egg masala or kadai paneer, steamed rice, yellow dal fry and green salad.'
    }
  },
  {
    day_offset: 5, // Saturday
    BREAKFAST: {
      meal_name: 'Bread Butter Jam, Veg Cutlet / Masala Omelette',
      description: 'Toasted bread with butter & fruit jam, crispy vegetable cutlet or masala omelette, tea/coffee.'
    },
    LUNCH: {
      meal_name: 'Rice, Dal Makhani, Kashmiri Aloo Dum & Salad',
      description: 'Steamed rice, rich dal makhani, Kashmiri aloo dum, cucumber tomato salad and fresh dahi.'
    },
    DINNER: {
      meal_name: 'Roti, Veg Fried Rice & Manchurian / Chilli Paneer',
      description: 'Soft rotis, Indo-Chinese veg fried rice, veg manchurian gravy or chilli paneer, and hot veg soup.'
    }
  },
  {
    day_offset: 6, // Sunday
    BREAKFAST: {
      meal_name: 'Chole Bhature / Onion Dosa & Masala Chai',
      description: 'Fluffy bhaturas with Punjabi chole, sliced onions & green chillies, and special masala tea.'
    },
    LUNCH: {
      meal_name: 'Sunday Special: Biryani / Chicken Curry / Shahi Paneer',
      description: 'Weekend special biryani / ghee rice, chicken curry or shahi paneer, boondi raita, papad, and sweet dish.'
    },
    DINNER: {
      meal_name: 'Roti, Special Bhog Khichdi, Aloo Bhaja & Ice Cream',
      description: 'Light comfort dinner: Roti, special bhog khichdi / steamed rice, aloo bhaja, dal, and chocolate ice cream.'
    }
  }
];

async function seedHostelMessData() {
  console.log('--- Starting Hostel Mess Schedule Seeding ---');

  // Get admin user for created_by
  const [adminUsers] = await pool.query(
    `SELECT id FROM users WHERE role_id IN (1, 2) ORDER BY role_id ASC LIMIT 1`
  );
  const adminId = adminUsers.length > 0 ? adminUsers[0].id : 1;

  // Compute Monday of current week
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = (currentDayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  // Targets: NULL (all hostels), 1 (Baramunda Boys Hostel), 2 (Baramunda Girls Hostel)
  const hostelTargets = [null, 1, 2];

  for (const hostelId of hostelTargets) {
    console.log(`Seeding schedule for hostel_id = ${hostelId === null ? 'NULL (Common)' : hostelId}...`);

    for (let weekOffset = -1; weekOffset <= 4; weekOffset++) {
      const weekMonday = new Date(monday);
      weekMonday.setDate(monday.getDate() + (weekOffset * 7));

      for (const dayEntry of WEEKLY_MENUS) {
        const targetDate = new Date(weekMonday);
        targetDate.setDate(weekMonday.getDate() + dayEntry.day_offset);
        const dateStr = targetDate.toISOString().slice(0, 10);

        for (const mealType of ['BREAKFAST', 'LUNCH', 'DINNER']) {
          const mealInfo = dayEntry[mealType];

          const dupCheckSql = `
            SELECT id FROM mess_menus
            WHERE menu_date = ? AND meal_type = ? AND (hostel_id = ? OR (hostel_id IS NULL AND ? IS NULL))
          `;
          const [existing] = await pool.query(dupCheckSql, [dateStr, mealType, hostelId, hostelId]);

          if (existing.length === 0) {
            await pool.query(
              `INSERT INTO mess_menus (hostel_id, menu_date, meal_type, meal_name, description, is_available, created_by)
               VALUES (?, ?, ?, ?, ?, 1, ?)`,
              [hostelId, dateStr, mealType, mealInfo.meal_name, mealInfo.description, adminId]
            );
          } else {
            // Update existing with clean description and name
            await pool.query(
              `UPDATE mess_menus 
               SET meal_name = ?, description = ? 
               WHERE id = ?`,
              [mealInfo.meal_name, mealInfo.description, existing[0].id]
            );
          }
        }
      }
    }
  }

  console.log('✓ Successfully seeded and updated 7-day mess timetables for all hostels!');
  process.exit(0);
}

seedHostelMessData().catch(err => {
  console.error('Error seeding hostel mess data:', err);
  process.exit(1);
});
