const db = require('../config/db');

async function migrate() {
  try {
    console.log('Checking users table columns on Hostinger MySQL...');
    const [cols] = await db.pool.query('DESCRIBE users');
    const fieldNames = cols.map(c => c.Field);
    console.log('Existing columns:', fieldNames);

    if (!fieldNames.includes('full_name')) {
      await db.pool.query('ALTER TABLE users ADD COLUMN full_name VARCHAR(150) NULL DEFAULT NULL AFTER email');
      console.log('✓ Added full_name column');
    } else {
      console.log('• full_name column already exists');
    }

    if (!fieldNames.includes('gender')) {
      await db.pool.query("ALTER TABLE users ADD COLUMN gender ENUM('MALE', 'FEMALE', 'OTHER') NULL DEFAULT NULL AFTER full_name");
      console.log('✓ Added gender column');
    } else {
      console.log('• gender column already exists');
    }

    if (!fieldNames.includes('phone')) {
      await db.pool.query('ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL DEFAULT NULL AFTER gender');
      console.log('✓ Added phone column');
    } else {
      console.log('• phone column already exists');
    }

    // Update existing warden with initial values if currently null
    await db.pool.query("UPDATE users SET full_name = 'Chief Hostel Warden', gender = 'MALE', phone = '9876543210' WHERE username = 'warden' AND (gender IS NULL OR full_name IS NULL)");
    console.log('✓ Initialized warden user data');

    const [users] = await db.pool.query('SELECT id, username, email, full_name, gender, phone FROM users');
    console.log('Users in database:', users);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
