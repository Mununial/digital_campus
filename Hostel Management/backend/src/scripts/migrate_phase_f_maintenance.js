const db = require('../config/db');

async function migratePhaseF() {
  console.log('--- STARTING PHASE F ADVANCED MAINTENANCE DATABASE MIGRATION ---');

  try {
    // 1. Create technicians table
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100) NULL,
        skill_category ENUM('ELECTRICAL', 'PLUMBING', 'CARPENTRY', 'FAN_AC', 'NETWORK', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
        assigned_hostel_id INT NULL,
        status ENUM('AVAILABLE', 'ON_JOB', 'ON_LEAVE', 'INACTIVE') DEFAULT 'AVAILABLE',
        rating DECIMAL(3,2) DEFAULT 5.00,
        total_jobs_done INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_hostel_id) REFERENCES hostels(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table technicians created or verified.');

    // 2. Create maintenance_upvotes table
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_upvotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        maintenance_id INT NOT NULL,
        user_id INT NOT NULL,
        student_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (maintenance_id) REFERENCES maintenance_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY uk_maint_user_upvote (maintenance_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Table maintenance_upvotes created or verified.');

    // 3. Add columns to maintenance_requests dynamically
    const [cols] = await db.pool.query(`SHOW COLUMNS FROM maintenance_requests`);
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('technician_id')) {
      await db.pool.query(`ALTER TABLE maintenance_requests ADD COLUMN technician_id INT NULL AFTER assigned_to`);
      await db.pool.query(`ALTER TABLE maintenance_requests ADD FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE SET NULL`);
      console.log('✓ Column technician_id added to maintenance_requests.');
    }

    if (!colNames.includes('is_duplicate')) {
      await db.pool.query(`ALTER TABLE maintenance_requests ADD COLUMN is_duplicate TINYINT(1) DEFAULT 0 AFTER priority`);
      console.log('✓ Column is_duplicate added to maintenance_requests.');
    }

    if (!colNames.includes('duplicate_of_id')) {
      await db.pool.query(`ALTER TABLE maintenance_requests ADD COLUMN duplicate_of_id INT NULL AFTER is_duplicate`);
      console.log('✓ Column duplicate_of_id added to maintenance_requests.');
    }

    if (!colNames.includes('upvote_count')) {
      await db.pool.query(`ALTER TABLE maintenance_requests ADD COLUMN upvote_count INT DEFAULT 0 AFTER duplicate_of_id`);
      console.log('✓ Column upvote_count added to maintenance_requests.');
    }

    // 4. Seed initial campus technicians if table is empty
    const [existingTechs] = await db.pool.query('SELECT COUNT(*) as count FROM technicians');
    if (existingTechs[0].count === 0) {
      console.log('Seeding initial campus maintenance technicians...');
      const technicians = [
        { full_name: 'Ramesh Kumar', phone: '9876543210', email: 'ramesh.electrician@bec.ac.in', skill_category: 'ELECTRICAL', status: 'AVAILABLE', rating: 4.85 },
        { full_name: 'Suresh Swain', phone: '9876543211', email: 'suresh.plumber@bec.ac.in', skill_category: 'PLUMBING', status: 'AVAILABLE', rating: 4.90 },
        { full_name: 'Prakash Behera', phone: '9876543212', email: 'prakash.ac@bec.ac.in', skill_category: 'FAN_AC', status: 'AVAILABLE', rating: 4.75 },
        { full_name: 'Bikash Sahoo', phone: '9876543213', email: 'bikash.carpenter@bec.ac.in', skill_category: 'CARPENTRY', status: 'AVAILABLE', rating: 4.80 },
        { full_name: 'Deepak Mohanty', phone: '9876543214', email: 'deepak.net@bec.ac.in', skill_category: 'NETWORK', status: 'AVAILABLE', rating: 4.95 }
      ];

      for (const t of technicians) {
        await db.pool.query(
          `INSERT INTO technicians (full_name, phone, email, skill_category, status, rating)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [t.full_name, t.phone, t.email, t.skill_category, t.status, t.rating]
        );
      }
      console.log('✓ Initial campus technicians seeded successfully.');
    }

    console.log('--- PHASE F MIGRATION COMPLETED SUCCESSFULLY ---');
    process.exit(0);

  } catch (err) {
    console.error('❌ PHASE F MIGRATION FAILED:', err);
    process.exit(1);
  }
}

migratePhaseF();
