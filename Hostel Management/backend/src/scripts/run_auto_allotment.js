const mysql = require('C:/Users/munun/Downloads/COLLEGE ERP/COLLEGE ERP/campus-portal/node_modules/mysql2/promise');
require('dotenv').config({ path: 'C:/Users/munun/Downloads/COLLEGE ERP/COLLEGE ERP/Hostel Management/backend/.env' });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'srv1334.hstgr.io',
  user: process.env.DB_USER || 'u847513759_ERP_COLLEGE',
  password: process.env.DB_PASSWORD || 'Ayushtech@26',
  database: process.env.DB_NAME || 'u847513759_ERP_COLLEGE',
  port: parseInt(process.env.DB_PORT, 10) || 3306
};

async function executeAutoAllotment() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('--- STARTING HOSTEL AUTO-ALLOTMENT EXECUTION ---');

  // 1. Verify Hostels
  const [hostels] = await conn.query('SELECT id, name, code, gender FROM hostels ORDER BY id ASC');
  console.log('Hostels detected in DB:', hostels);
  const boysHostel = hostels.find(h => h.gender === 'MALE') || hostels[0];
  const girlsHostel = hostels.find(h => h.gender === 'FEMALE') || hostels[1];

  console.log(`Boys Hostel: ID ${boysHostel.id} (${boysHostel.name})`);
  console.log(`Girls Hostel: ID ${girlsHostel.id} (${girlsHostel.name})`);

  // 2. Setup Floors
  await conn.query(`
    INSERT IGNORE INTO floors (id, hostel_id, floor_name, floor_number, status) VALUES
    (1, ${boysHostel.id}, 'Ground Floor', 1, 'ACTIVE'),
    (2, ${boysHostel.id}, 'First Floor', 2, 'ACTIVE'),
    (3, ${boysHostel.id}, 'Second Floor', 3, 'ACTIVE'),
    (4, ${girlsHostel.id}, 'Ground Floor', 1, 'ACTIVE')
  `);

  // 3. Clear any existing test beds/allocations for clean deterministic allotment
  await conn.query('UPDATE students SET bed_id = NULL, hostel_id = NULL');
  await conn.query('DELETE FROM student_allocations');
  await conn.query('DELETE FROM beds');
  await conn.query('DELETE FROM rooms');

  // 4. Fetch Eligible Students (Hostel Required = 'Yes' only!)
  const [hostellers] = await conn.query(`
    SELECT id, user_id, student_id, roll_number, full_name, gender, branch, hostel_required, photo_url
    FROM students
    WHERE hostel_required = 'Yes' AND status = 'ACTIVE'
    ORDER BY 
      CASE WHEN UPPER(TRIM(gender)) LIKE 'F%' THEN 2 ELSE 1 END,
      branch ASC,
      roll_number ASC
  `);

  console.log(`Total hostellers to allocate: ${hostellers.length}`);

  const boys = hostellers.filter(s => !String(s.gender).trim().toUpperCase().startsWith('F'));
  const girls = hostellers.filter(s => String(s.gender).trim().toUpperCase().startsWith('F'));

  console.log(`  Boys: ${boys.length}`);
  console.log(`  Girls: ${girls.length}`);

  // Helper to create rooms & beds and allocate students
  async function allocateCohort(studentList, hostelId, startRoomNumber, floorMappings) {
    const ROOM_CAPACITY = 3;
    const totalRooms = Math.ceil(studentList.length / ROOM_CAPACITY);
    let studentIdx = 0;

    for (let r = 0; r < totalRooms; r++) {
      const roomNumStr = String(startRoomNumber + r);
      // Determine floor based on floorMappings
      const floorId = floorMappings(r);

      // Create Room
      const [roomRes] = await conn.query(`
        INSERT INTO rooms (hostel_id, floor_id, room_number, capacity, status)
        VALUES (?, ?, ?, ?, 'ACTIVE')
      `, [hostelId, floorId, roomNumStr, ROOM_CAPACITY]);
      const roomId = roomRes.insertId;

      // Create Beds: A, B, C
      const bedLetters = ['A', 'B', 'C'];
      for (let b = 0; b < ROOM_CAPACITY; b++) {
        const bedNum = `${roomNumStr}-${bedLetters[b]}`;
        const hasStudent = studentIdx < studentList.length;
        const bedStatus = hasStudent ? 'OCCUPIED' : 'AVAILABLE';

        const [bedRes] = await conn.query(`
          INSERT INTO beds (room_id, bed_number, status)
          VALUES (?, ?, ?)
        `, [roomId, bedNum, bedStatus]);
        const bedId = bedRes.insertId;

        if (hasStudent) {
          const student = studentList[studentIdx];
          // Update student
          await conn.query(`
            UPDATE students 
            SET bed_id = ?, hostel_id = ?
            WHERE id = ?
          `, [bedId, hostelId, student.id]);

          // Insert active student allocation
          await conn.query(`
            INSERT INTO student_allocations (
              student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by
            ) VALUES (?, ?, ?, ?, CURDATE(), 'ACTIVE', 1)
          `, [student.id, hostelId, roomId, bedId]);

          studentIdx++;
        }
      }
    }
    return { roomsCreated: totalRooms, studentsAllocated: studentIdx };
  }

  // Allocate Boys (Campus 1, Rooms 101 to 151)
  console.log('Allocating Boys into Campus 1 (Boys Hostel)...');
  const boysRes = await allocateCohort(boys, boysHostel.id, 101, (rIndex) => {
    if (rIndex < 20) return 1; // Floor 1 (Rooms 101-120)
    if (rIndex < 40) return 2; // Floor 2 (Rooms 121-140)
    return 3;                  // Floor 3 (Rooms 141-151)
  });
  console.log(`Boys allocation complete: ${boysRes.studentsAllocated} boys in ${boysRes.roomsCreated} rooms.`);

  // Allocate Girls (Campus 2, Rooms 101 to 109)
  console.log('Allocating Girls into Campus 2 (Girls Hostel)...');
  const girlsRes = await allocateCohort(girls, girlsHostel.id, 101, () => 4);
  console.log(`Girls allocation complete: ${girlsRes.studentsAllocated} girls in ${girlsRes.roomsCreated} rooms.`);

  // Verify allocations from DB
  const [allocCount] = await conn.query('SELECT count(*) as c FROM student_allocations WHERE status = "ACTIVE"');
  console.log(`Total active allocations in DB: ${allocCount[0].c}`);

  const [occBeds] = await conn.query('SELECT count(*) as c FROM beds WHERE status = "OCCUPIED"');
  console.log(`Total occupied beds in DB: ${occBeds[0].c}`);

  const [allocatedStudents] = await conn.query('SELECT count(*) as c FROM students WHERE bed_id IS NOT NULL');
  console.log(`Total students with bed_id in DB: ${allocatedStudents[0].c}`);

  // Test Day Scholars (must have 0 allocations)
  const [dayScholarAlloc] = await conn.query(`
    SELECT count(*) as c 
    FROM students s 
    JOIN student_allocations sa ON s.id = sa.student_id 
    WHERE s.hostel_required = "No"
  `);
  console.log(`Day scholars with allocation (MUST BE 0): ${dayScholarAlloc[0].c}`);

  await conn.end();
  console.log('--- HOSTEL AUTO-ALLOTMENT EXECUTION FINISHED SUCCESSFULLY ---');
}

executeAutoAllotment().catch(err => {
  console.error('Auto-allotment fatal error:', err);
  process.exit(1);
});
