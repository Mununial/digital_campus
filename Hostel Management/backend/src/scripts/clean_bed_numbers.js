const db = require('../config/db');

async function cleanBedNumbers() {
  console.log('--- Cleaning Bed Numbers in Database ---');

  // Fix Room 3 beds: 3 -> 1, 4 -> 2, 5 -> 3, 6 -> 4
  await db.pool.query("UPDATE beds SET bed_number = 'temp-4' WHERE id = 3");
  await db.pool.query("UPDATE beds SET bed_number = '4' WHERE id = 6");
  await db.pool.query("UPDATE beds SET bed_number = '1' WHERE id = 3");
  await db.pool.query("UPDATE beds SET bed_number = '2' WHERE id = 4");
  await db.pool.query("UPDATE beds SET bed_number = '3' WHERE id = 5");

  // Fix Room 5 beds: 12 -> 1, 13 -> 2, 14 -> 3, 15 -> 4, 16 -> 5
  await db.pool.query("UPDATE beds SET bed_number = '1' WHERE id = 12");
  await db.pool.query("UPDATE beds SET bed_number = '2' WHERE id = 13");
  await db.pool.query("UPDATE beds SET bed_number = '3' WHERE id = 14");
  await db.pool.query("UPDATE beds SET bed_number = '4' WHERE id = 15");
  await db.pool.query("UPDATE beds SET bed_number = '5' WHERE id = 16");

  // Clean any other beds
  const [beds] = await db.pool.query('SELECT id, bed_number FROM beds');
  for (const b of beds) {
    let clean = b.bed_number.trim();
    if (clean.toLowerCase().startsWith('bed ')) {
      clean = clean.substring(4).trim();
      await db.pool.query('UPDATE beds SET bed_number = ? WHERE id = ?', [clean, b.id]);
    }
  }

  const [allBeds] = await db.pool.query('SELECT b.id, b.room_id, r.room_number, b.bed_number, b.status FROM beds b JOIN rooms r ON b.room_id = r.id ORDER BY b.room_id ASC, b.id ASC');
  console.log('All Cleaned Beds in System:\n', allBeds);
  process.exit(0);
}

cleanBedNumbers().catch(err => {
  console.error('Error cleaning bed numbers:', err);
  process.exit(1);
});
