const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool } = require('../config/db');

async function fixDuplicateBedPrefix() {
  console.log('--- Cleaning Bed Numbers in Hostinger MySQL Database ---');

  // Strip 'Bed ' or 'bed ' prefix from all bed_number records in beds table
  const [updateResult] = await pool.query(`
    UPDATE beds 
    SET bed_number = TRIM(REPLACE(REPLACE(bed_number, 'Bed ', ''), 'bed ', ''))
    WHERE bed_number LIKE 'Bed %' OR bed_number LIKE 'bed %'
  `);

  console.log(`Updated beds table records: ${updateResult.affectedRows} rows cleaned.`);

  // Verify updated beds
  const [sampleBeds] = await pool.query('SELECT id, room_id, bed_number, status FROM beds LIMIT 15');
  console.log('\nSample Cleaned Beds in DB:');
  sampleBeds.forEach(b => {
    console.log(`  └─ Bed ID ${b.id}: room_id=${b.room_id}, bed_number='${b.bed_number}', status=${b.status}`);
  });

  process.exit(0);
}

fixDuplicateBedPrefix().catch(err => {
  console.error('Error fixing bed numbers:', err);
  process.exit(1);
});
