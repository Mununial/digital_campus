const db = require('../config/db');

async function migrate() {
  try {
    console.log('--- Starting Student Schema Migration ---');

    // 1. Check current table structure
    const [cols] = await db.pool.query('DESCRIBE students');
    console.log('Current columns:', cols.map(c => `${c.Field} (${c.Type}, Null: ${c.Null}, Key: ${c.Key})`));

    // 2. Modify roll_number to be NULLable
    try {
      await db.pool.query('ALTER TABLE students MODIFY COLUMN roll_number VARCHAR(50) NULL DEFAULT NULL');
      console.log('✓ Modified roll_number column to VARCHAR(50) NULL DEFAULT NULL');
    } catch (err) {
      console.warn('Notice on modifying roll_number:', err.message);
    }

    // 3. Drop unique index on roll_number if it exists so multiple null/empty values are allowed
    try {
      const [indexes] = await db.pool.query('SHOW INDEX FROM students WHERE Column_name = "roll_number"');
      for (const idx of indexes) {
        if (idx.Key_name && idx.Key_name !== 'PRIMARY') {
          try {
            await db.pool.query(`ALTER TABLE students DROP INDEX \`${idx.Key_name}\``);
            console.log(`✓ Dropped index on roll_number: ${idx.Key_name}`);
          } catch (e) {
            console.warn(`Could not drop index ${idx.Key_name}:`, e.message);
          }
        }
      }
    } catch (err) {
      console.warn('Notice on inspecting indexes:', err.message);
    }

    // 4. Modify phone to be NULLable
    try {
      await db.pool.query('ALTER TABLE students MODIFY COLUMN phone VARCHAR(20) NULL DEFAULT NULL');
      console.log('✓ Modified phone column to VARCHAR(20) NULL DEFAULT NULL');
    } catch (err) {
      console.warn('Notice on modifying phone:', err.message);
    }

    // 5. Verify final structure
    const [finalCols] = await db.pool.query('DESCRIBE students');
    console.log('Updated columns:', finalCols.map(c => `${c.Field} (${c.Type}, Null: ${c.Null})`));

    console.log('✓ Migration finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
