const mysql = require('../campus-portal/node_modules/mysql2/promise');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const pool = mysql.createPool({
      host: 'srv1334.hstgr.io',
      user: 'u847513759_ERP_COLLEGE',
      password: 'Ayushtech@26',
      database: 'u847513759_ERP_COLLEGE',
      port: 3306
    });

    const [allocs] = await pool.query(`
      SELECT 
        sa.id as allocation_id,
        sa.student_id,
        sa.allocated_from,
        sa.status as allocation_status,
        s.roll_number,
        s.full_name,
        s.email,
        s.branch,
        s.year,
        s.gender,
        s.photo_url,
        s.hostel_required,
        r.id as room_id,
        r.room_number,
        b.id as bed_id,
        b.bed_number,
        f.floor_name,
        h.id as hostel_id,
        h.name as hostel_name,
        h.code as hostel_code
      FROM student_allocations sa
      JOIN students s ON sa.student_id = s.id
      JOIN beds b ON sa.bed_id = b.id
      JOIN rooms r ON sa.room_id = r.id
      JOIN hostels h ON sa.hostel_id = h.id
      LEFT JOIN floors f ON r.floor_id = f.id
      WHERE sa.status = 'ACTIVE'
    `);

    console.log('Total Active Allocations Queried from MySQL:', allocs.length);

    // Group by room_id to build roommates
    const roomMap = {};
    for (const a of allocs) {
      if (!roomMap[a.room_id]) roomMap[a.room_id] = [];
      roomMap[a.room_id].push({
        id: a.student_id,
        full_name: a.full_name,
        student_id: a.roll_number,
        roll_number: a.roll_number,
        branch: a.branch,
        year: a.year || 1,
        photo_url: a.photo_url,
        bed_number: a.bed_number
      });
    }

    // Build master mapping
    const master = {};
    for (const a of allocs) {
      const roommates = (roomMap[a.room_id] || []).filter(rm => rm.roll_number !== a.roll_number);
      const allocRecord = {
        student: {
          id: a.student_id,
          full_name: a.full_name,
          roll_number: a.roll_number,
          branch: a.branch,
          email: a.email,
          hostel_required: 'Yes'
        },
        currentAllocation: {
          id: a.allocation_id,
          student_id: a.student_id,
          hostel_id: a.hostel_id,
          room_id: a.room_id,
          bed_id: a.bed_id,
          allocated_from: a.allocated_from,
          status: 'ACTIVE',
          hostel_name: a.hostel_name,
          hostel_code: a.hostel_code,
          room_number: a.room_number,
          floor_name: a.floor_name || 'First Floor',
          bed_number: a.bed_number
        },
        roommates: roommates,
        history: [
          {
            id: a.allocation_id,
            student_id: a.student_id,
            hostel_id: a.hostel_id,
            room_id: a.room_id,
            bed_id: a.bed_id,
            allocated_from: a.allocated_from,
            status: 'ACTIVE',
            hostel_name: a.hostel_name,
            hostel_code: a.hostel_code,
            room_number: a.room_number,
            floor_name: a.floor_name || 'First Floor',
            bed_number: a.bed_number
          }
        ]
      };

      master[a.roll_number.toLowerCase()] = allocRecord;
      if (a.email) master[a.email.toLowerCase()] = allocRecord;
      master[a.student_id] = allocRecord;
    }

    const destDirs = [
      path.join(__dirname, '../campus-portal/public/data'),
      path.join(__dirname, '../Hostel Management/frontend/public/data')
    ];

    for (const d of destDirs) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'allocationsMaster.json'), JSON.stringify(master, null, 2));
    }

    console.log('✅ Exported allocationsMaster.json to campus-portal and frontend public dirs.');
    console.log('Sample Bablu Bag (bec26081) exists:', !!master['bec26081']);
    if (master['bec26081']) {
      console.log('Bablu Bag Room:', master['bec26081'].currentAllocation.room_number, 'Bed:', master['bec26081'].currentAllocation.bed_number);
      console.log('Bablu Bag Roommates:', master['bec26081'].roommates.map(r => r.full_name));
    }

    await pool.end();
  } catch (err) {
    console.error('Export error:', err);
    process.exit(1);
  }
})();
