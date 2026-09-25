const db = require('../config/db');

async function migrate() {
  try {
    console.log('Checking students table columns on Hostinger MySQL...');
    const [cols] = await db.pool.query('DESCRIBE students');
    const fieldNames = cols.map(c => c.Field);
    console.log('Existing columns in students:', fieldNames);

    if (!fieldNames.includes('date_of_birth')) {
      await db.pool.query('ALTER TABLE students ADD COLUMN date_of_birth DATE NULL DEFAULT NULL AFTER full_name');
      console.log('✓ Added date_of_birth column to students table');
    } else {
      console.log('• date_of_birth column already exists in students table');
    }

    const [updatedCols] = await db.pool.query('DESCRIBE students');
    console.log('Updated students table columns:', updatedCols.map(c => c.Field));

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
