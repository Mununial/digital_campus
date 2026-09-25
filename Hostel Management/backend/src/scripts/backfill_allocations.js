const db = require('../config/db');

async function backfillAllocations() {
  console.log('--- Starting Student Allocations Backfill ---');
  
  // Find a default admin user ID for allocated_by
  const [adminUsers] = await db.pool.query(
    `SELECT id FROM users WHERE role_id IN (1, 2) ORDER BY role_id ASC LIMIT 1`
  );
  const adminId = adminUsers.length > 0 ? adminUsers[0].id : 1;

  const [studentsWithBed] = await db.pool.query(
    `SELECT s.id as student_id, s.full_name, s.admission_date, s.bed_id,
            b.room_id, b.bed_number,
            r.hostel_id, r.room_number,
            h.name as hostel_name
     FROM students s
     JOIN beds b ON s.bed_id = b.id
     JOIN rooms r ON b.room_id = r.id
     JOIN hostels h ON r.hostel_id = h.id
     WHERE s.bed_id IS NOT NULL AND s.status = 'ACTIVE'`
  );

  console.log(`Found ${studentsWithBed.length} active students with assigned beds. Using admin user #${adminId} for allocated_by.`);

  for (const st of studentsWithBed) {
    const [existing] = await db.pool.query(
      `SELECT id FROM student_allocations WHERE student_id = ? AND status = 'ACTIVE'`,
      [st.student_id]
    );

    if (existing.length === 0) {
      const allocDate = st.admission_date ? new Date(st.admission_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const [res] = await db.pool.query(
        `INSERT INTO student_allocations (student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
        [st.student_id, st.hostel_id, st.room_id, st.bed_id, allocDate, adminId]
      );
      console.log(`✓ Created allocation #${res.insertId} for ${st.full_name} (${st.hostel_name}, Room ${st.room_number}, Bed ${st.bed_number})`);
    } else {
      console.log(`- Allocation already exists for student #${st.student_id} (${st.full_name})`);
    }
  }

  console.log('--- Backfill Complete ---');
  process.exit(0);
}

backfillAllocations().catch(err => {
  console.error('Error during backfill:', err);
  process.exit(1);
});
