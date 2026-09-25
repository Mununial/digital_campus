const db = require('../config/db');

async function runMigration() {
  try {
    console.log('Running Room Applications migration on Hostinger MySQL database...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \`room_applications\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`application_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`student_id\` INT NOT NULL,
        \`preferred_hostel_id\` INT NOT NULL,
        \`room_type_preference\` ENUM('AC', 'NON_AC', 'SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_BED') NOT NULL DEFAULT 'NON_AC',
        \`preferred_roommate_roll_no\` VARCHAR(50) NULL DEFAULT NULL,
        \`special_requests\` TEXT NULL DEFAULT NULL,
        \`academic_year\` INT NOT NULL DEFAULT 1,
        \`status\` ENUM('PENDING', 'APPROVED', 'ALLOCATED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
        \`allocated_bed_id\` INT NULL DEFAULT NULL,
        \`reviewed_by\` INT NULL DEFAULT NULL,
        \`reviewed_at\` DATETIME NULL DEFAULT NULL,
        \`rejection_reason\` TEXT NULL DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`student_id\`) REFERENCES \`students\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (\`preferred_hostel_id\`) REFERENCES \`hostels\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY (\`allocated_bed_id\`) REFERENCES \`beds\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX \`idx_room_app_student_status\` (\`student_id\`, \`status\`),
        INDEX \`idx_room_app_hostel_status\` (\`preferred_hostel_id\`, \`status\`),
        INDEX \`idx_room_app_number\` (\`application_number\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.pool.query(createTableQuery);
    console.log('✓ Successfully created `room_applications` table with indexes and constraints.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
