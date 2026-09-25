const mysql = require('C:/Users/munun/Downloads/COLLEGE ERP/COLLEGE ERP/campus-portal/node_modules/mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'srv1334.hstgr.io',
    user: 'u847513759_ERP_COLLEGE',
    password: 'Ayushtech@26',
    database: 'u847513759_ERP_COLLEGE',
    port: 3306
  });

  console.log('--- TEST 1: HOSTELLER BOY (BEC26306) ---');
  const [st1] = await conn.query(`
    SELECT s.id, s.full_name, s.roll_number, s.branch, s.photo_url, s.bed_id, r.id as room_id, r.room_number, b.bed_number, h.name as hostel_name 
    FROM students s 
    JOIN beds b ON s.bed_id = b.id 
    JOIN rooms r ON b.room_id = r.id 
    JOIN hostels h ON s.hostel_id = h.id 
    WHERE s.roll_number = 'BEC26306'
  `);
  console.log('Student:', st1[0]);

  const [rm1] = await conn.query(`
    SELECT s.id, s.full_name, s.student_id, s.roll_number, s.branch, s.year, s.photo_url, b.bed_number 
    FROM students s 
    JOIN beds b ON s.bed_id = b.id 
    WHERE b.room_id = ? AND s.id != ? AND s.status = 'ACTIVE'
  `, [st1[0].room_id, st1[0].id]);
  console.log('Roommates for BEC26306:', rm1);

  console.log('\n--- TEST 2: HOSTELLER GIRL (BEC26090) ---');
  const [st2] = await conn.query(`
    SELECT s.id, s.full_name, s.roll_number, s.branch, s.photo_url, s.bed_id, r.id as room_id, r.room_number, b.bed_number, h.name as hostel_name 
    FROM students s 
    JOIN beds b ON s.bed_id = b.id 
    JOIN rooms r ON b.room_id = r.id 
    JOIN hostels h ON s.hostel_id = h.id 
    WHERE s.roll_number = 'BEC26090'
  `);
  console.log('Student:', st2[0]);

  const [rm2] = await conn.query(`
    SELECT s.id, s.full_name, s.student_id, s.roll_number, s.branch, s.year, s.photo_url, b.bed_number 
    FROM students s 
    JOIN beds b ON s.bed_id = b.id 
    WHERE b.room_id = ? AND s.id != ? AND s.status = 'ACTIVE'
  `, [st2[0].room_id, st2[0].id]);
  console.log('Roommates for BEC26090:', rm2);

  console.log('\n--- TEST 3: DAY SCHOLAR (BEC26328) ---');
  const [ds] = await conn.query(`
    SELECT s.id, s.full_name, s.roll_number, s.branch, s.hostel_required, s.bed_id, s.hostel_id 
    FROM students s 
    WHERE s.roll_number = 'BEC26328'
  `);
  console.log('Day scholar (bed_id and hostel_id should be NULL):', ds[0]);

  await conn.end();
})();
