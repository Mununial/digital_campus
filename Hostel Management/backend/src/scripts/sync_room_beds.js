const db = require('../config/db');

async function syncRoomBeds() {
  console.log('--- Syncing Rooms and Auto-creating Missing Beds ---');

  const [rooms] = await db.pool.query('SELECT id, room_number, capacity FROM rooms');

  for (const room of rooms) {
    const [existingBeds] = await db.pool.query(
      'SELECT id, bed_number FROM beds WHERE room_id = ? ORDER BY id ASC',
      [room.id]
    );

    const existingCount = existingBeds.length;
    const capacity = room.capacity || 1;

    console.log(`Room #${room.id} (${room.room_number}): Capacity = ${capacity}, Existing Beds = ${existingCount}`);

    if (existingCount < capacity) {
      const missing = capacity - existingCount;
      console.log(` -> Adding ${missing} missing beds for Room ${room.room_number}...`);

      for (let i = 1; i <= missing; i++) {
        const bedNum = `Bed ${existingCount + i}`;
        await db.pool.query(
          'INSERT INTO beds (room_id, bed_number, status) VALUES (?, ?, ?)',
          [room.id, bedNum, 'AVAILABLE']
        );
      }
    }
  }

  console.log('✓ All room beds successfully synchronized!');
  process.exit(0);
}

syncRoomBeds().catch(err => {
  console.error('Error syncing room beds:', err);
  process.exit(1);
});
