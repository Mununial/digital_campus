const db = require('../config/db');

async function migratePhaseE() {
  console.log('--- STARTING PHASE E CAFETERIA DATABASE MIGRATION ---');

  try {
    // 1. Create categories table
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS cafeteria_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table cafeteria_categories created or verified.');

    // 2. Create items table
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS cafeteria_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        is_vegetarian TINYINT(1) DEFAULT 1,
        image_url VARCHAR(255) NULL,
        is_available TINYINT(1) DEFAULT 1,
        preparation_time_mins INT DEFAULT 15,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES cafeteria_categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table cafeteria_items created or verified.');

    // 3. Create orders master table
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS cafeteria_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        student_id INT NOT NULL,
        hostel_id INT NULL,
        delivery_type ENUM('PICKUP', 'ROOM_DELIVERY') DEFAULT 'PICKUP',
        delivery_location VARCHAR(255) NULL,
        payment_method ENUM('UPI', 'CASH', 'MESS_CREDIT') DEFAULT 'UPI',
        payment_status ENUM('PENDING', 'PAID', 'REFUNDED') DEFAULT 'PENDING',
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        status ENUM('PLACED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED') DEFAULT 'PLACED',
        special_instructions TEXT NULL,
        placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        prepared_at TIMESTAMP NULL,
        delivered_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table cafeteria_orders created or verified.');

    // 4. Create order items detail table
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS cafeteria_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        item_id INT NOT NULL,
        item_name VARCHAR(150) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        subtotal DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES cafeteria_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES cafeteria_items(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table cafeteria_order_items created or verified.');

    // 5. Seed default food categories if empty
    const [existingCats] = await db.pool.query('SELECT COUNT(*) as count FROM cafeteria_categories');
    if (existingCats[0].count === 0) {
      console.log('Seeding initial cafeteria categories...');
      const categories = [
        { name: 'Snacks & Quick Bites', display_order: 1 },
        { name: 'Beverages & Shakes', display_order: 2 },
        { name: 'North Indian Thali & Meals', display_order: 3 },
        { name: 'South Indian Specials', display_order: 4 },
        { name: 'Rolls & Sandwiches', display_order: 5 },
        { name: 'Desserts & Sweets', display_order: 6 }
      ];

      for (const cat of categories) {
        await db.pool.query(
          'INSERT INTO cafeteria_categories (name, display_order) VALUES (?, ?)',
          [cat.name, cat.display_order]
        );
      }
      console.log('✓ Cafeteria categories seeded.');
    }

    // 6. Seed default food items if empty
    const [existingItems] = await db.pool.query('SELECT COUNT(*) as count FROM cafeteria_items');
    if (existingItems[0].count === 0) {
      console.log('Seeding initial cafeteria food items...');
      const [cats] = await db.pool.query('SELECT id, name FROM cafeteria_categories');
      const catMap = {};
      cats.forEach(c => { catMap[c.name] = c.id; });

      const items = [
        // Snacks
        { category_id: catMap['Snacks & Quick Bites'], name: 'Crispy Samosa (2 Pcs)', description: 'Hot potato samosa served with green chutney & tamarind sauce', price: 20.00, is_vegetarian: 1, prep_time: 5 },
        { category_id: catMap['Snacks & Quick Bites'], name: 'Paneer Pakoda Platter', description: 'Deep fried cottage cheese fritters with chaat masala', price: 60.00, is_vegetarian: 1, prep_time: 10 },
        { category_id: catMap['Snacks & Quick Bites'], name: 'French Fries (Large)', description: 'Crispy salted potato fries with tomato ketchup', price: 50.00, is_vegetarian: 1, prep_time: 8 },

        // Beverages
        { category_id: catMap['Beverages & Shakes'], name: 'Masala Chai', description: 'Traditional Indian spiced milk tea', price: 15.00, is_vegetarian: 1, prep_time: 5 },
        { category_id: catMap['Beverages & Shakes'], name: 'Cold Coffee with Ice Cream', description: 'Rich blended thick cold coffee topped with vanilla ice cream', price: 50.00, is_vegetarian: 1, prep_time: 7 },
        { category_id: catMap['Beverages & Shakes'], name: 'Fresh Lemon Soda', description: 'Sweet and salted refreshing lemon fizz', price: 25.00, is_vegetarian: 1, prep_time: 3 },

        // Meals
        { category_id: catMap['North Indian Thali & Meals'], name: 'Special Veg Thali', description: 'Paneer Butter Masala, Dal Makhani, 3 Roti, Rice, Salad & Sweet', price: 120.00, is_vegetarian: 1, prep_time: 15 },
        { category_id: catMap['North Indian Thali & Meals'], name: 'Chole Bhature (2 Pcs)', description: 'Spicy Punjabi chole served with fluffy hot bhaturas & pickle', price: 80.00, is_vegetarian: 1, prep_time: 12 },

        // South Indian
        { category_id: catMap['South Indian Specials'], name: 'Masala Dosa', description: 'Crispy rice crepe stuffed with spiced potato mash served with sambar & coconut chutney', price: 60.00, is_vegetarian: 1, prep_time: 10 },
        { category_id: catMap['South Indian Specials'], name: 'Steamed Idli (3 Pcs)', description: 'Soft rice idlis served with spicy sambar', price: 40.00, is_vegetarian: 1, prep_time: 5 },

        // Rolls & Sandwiches
        { category_id: catMap['Rolls & Sandwiches'], name: 'Grilled Paneer Cheese Sandwich', description: 'Triple layer toasted sandwich loaded with paneer & melted mozzarella cheese', price: 70.00, is_vegetarian: 1, prep_time: 10 },
        { category_id: catMap['Rolls & Sandwiches'], name: 'Veg Kathi Roll', description: 'Whole wheat flatbread wrap stuffed with sautÃ©ed veggies & mint mayo', price: 50.00, is_vegetarian: 1, prep_time: 8 },

        // Desserts
        { category_id: catMap['Desserts & Sweets'], name: 'Hot Gulab Jamun (2 Pcs)', description: 'Warm fried milk dumplings soaked in cardamom sugar syrup', price: 30.00, is_vegetarian: 1, prep_time: 3 },
        { category_id: catMap['Desserts & Sweets'], name: 'Chocolate Brownie with Fudge', description: 'Rich chocolate brownie topped with chocolate syrup', price: 60.00, is_vegetarian: 1, prep_time: 5 }
      ];

      for (const item of items) {
        await db.pool.query(
          `INSERT INTO cafeteria_items (category_id, name, description, price, is_vegetarian, preparation_time_mins, is_available)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [item.category_id, item.name, item.description, item.price, item.is_vegetarian, item.prep_time]
        );
      }
      console.log('✓ Cafeteria food items seeded successfully.');
    }

    console.log('--- PHASE E MIGRATION COMPLETED SUCCESSFULLY ---');
    process.exit(0);

  } catch (err) {
    console.error('❌ PHASE E MIGRATION FAILED:', err);
    process.exit(1);
  }
}

migratePhaseE();
