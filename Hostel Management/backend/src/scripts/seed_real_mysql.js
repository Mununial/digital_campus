const db = require('../config/db');

async function seedRealDatabase() {
  console.log('=== SEEDING REAL MYSQL DATABASE WITH DEV DATA ===');

  try {
    // 1. Assign Superintendent (user_id = 1) to Hostels 1 and 2
    console.log('1. Seeding superintendent_hostels...');
    await db.pool.query(`
      INSERT INTO superintendent_hostels (id, user_id, hostel_id) VALUES
      (1, 1, 1),
      (2, 1, 2)
      ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), hostel_id = VALUES(hostel_id)
    `);
    console.log('   ✅ Superintendent hostels assigned.');

    // 2. Seed Notices
    console.log('2. Seeding notices...');
    const notices = [
      {
        id: 1,
        title: 'Semester Registration & Hostel Verification 2026',
        description: 'All resident students are requested to complete physical registration and submit clearance documents at the hostel office before September 30.',
        created_by: 2,
        hostel_id: null,
        priority: 'IMPORTANT',
        status: 'PUBLISHED',
        published_at: new Date('2026-09-01T10:00:00Z'),
        expires_at: new Date('2026-10-15T10:00:00Z')
      },
      {
        id: 2,
        title: 'Overhead Water Tank Cleaning - Baramunda Boys',
        description: 'Overhead water tanks in Baramunda Boys Hostel will undergo deep cleaning on Sunday from 8:00 AM to 1:00 PM. Water supply will be temporarily paused.',
        created_by: 1,
        hostel_id: 1,
        priority: 'URGENT',
        status: 'PUBLISHED',
        published_at: new Date('2026-09-10T08:00:00Z'),
        expires_at: new Date('2026-09-25T08:00:00Z')
      },
      {
        id: 3,
        title: 'Study Hall & Reading Room Extended Hours',
        description: 'Study hall and central library reading rooms will remain open until 11:00 PM during mid-semester examination week.',
        created_by: 2,
        hostel_id: null,
        priority: 'GENERAL',
        status: 'PUBLISHED',
        published_at: new Date('2026-09-12T09:00:00Z'),
        expires_at: new Date('2026-10-05T09:00:00Z')
      },
      {
        id: 4,
        title: 'Annual Inter-Hostel Sports Championship Draft',
        description: 'Draft schedule for upcoming Table Tennis, Chess, and Carrom tournaments.',
        created_by: 1,
        hostel_id: 1,
        priority: 'GENERAL',
        status: 'DRAFT',
        published_at: null,
        expires_at: null
      }
    ];

    for (const n of notices) {
      await db.pool.query(`
        INSERT INTO notices (id, title, description, created_by, hostel_id, priority, status, published_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          created_by = VALUES(created_by),
          hostel_id = VALUES(hostel_id),
          priority = VALUES(priority),
          status = VALUES(status),
          published_at = VALUES(published_at),
          expires_at = VALUES(expires_at)
      `, [n.id, n.title, n.description, n.created_by, n.hostel_id, n.priority, n.status, n.published_at, n.expires_at]);
    }
    console.log('   ✅ Notices seeded.');

    // 3. Seed Complaints & History
    console.log('3. Seeding complaints & history...');
    const complaints = [
      {
        id: 1,
        student_id: 1,
        hostel_id: 1,
        category: 'PLUMBING',
        priority: 'HIGH',
        title: 'Sink Pipe Leakage in Washroom',
        description: 'Water dripping continuously from sink drain pipe in Room 121 washroom.',
        status: 'IN_PROGRESS',
        assigned_to: 1
      },
      {
        id: 2,
        student_id: 2,
        hostel_id: 1,
        category: 'ELECTRICITY',
        priority: 'URGENT',
        title: 'Power Socket Sparking near Desk',
        description: 'Laptop wall adapter outlet sparking when switch turned on.',
        status: 'OPEN',
        assigned_to: null
      },
      {
        id: 3,
        student_id: 5,
        hostel_id: 1,
        category: 'FAN_AC',
        priority: 'MEDIUM',
        title: 'Ceiling Fan Making Squeaking Noise',
        description: 'Ceiling fan wobbling and making loud noise at speed level 4.',
        status: 'RESOLVED',
        assigned_to: 1,
        resolution: 'Replaced fan regulator and lubricated motor bearings.'
      },
      {
        id: 4,
        student_id: 7,
        hostel_id: 1,
        category: 'INTERNET',
        priority: 'MEDIUM',
        title: 'Wi-Fi Signal Weak on First Floor',
        description: 'Frequent Wi-Fi disconnects and slow download speed in Room 125.',
        status: 'OPEN',
        assigned_to: null
      }
    ];

    for (const c of complaints) {
      await db.pool.query(`
        INSERT INTO complaints (id, student_id, hostel_id, category, priority, title, description, status, assigned_to, resolution, resolved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          category = VALUES(category),
          priority = VALUES(priority),
          title = VALUES(title),
          description = VALUES(description),
          status = VALUES(status),
          assigned_to = VALUES(assigned_to),
          resolution = VALUES(resolution),
          resolved_at = VALUES(resolved_at)
      `, [c.id, c.student_id, c.hostel_id, c.category, c.priority, c.title, c.description, c.status, c.assigned_to, c.resolution || null, c.status === 'RESOLVED' ? new Date() : null]);

      await db.pool.query(`
        INSERT INTO complaint_history (id, complaint_id, changed_by, old_status, new_status, comment)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE comment = VALUES(comment)
      `, [c.id, c.id, c.student_id + 2, null, c.status, 'Initial status update recorded.']);
    }
    console.log('   ✅ Complaints & history seeded.');

    // 4. Seed Visitor Requests & History
    console.log('4. Seeding visits...');
    const visits = [
      {
        id: 1,
        student_id: 1,
        hostel_id: 1,
        visitor_name: 'Ramesh Behera',
        visitor_phone: '9876512345',
        visitor_email: 'ramesh.b@gmail.com',
        visitor_type: 'PARENT',
        purpose: 'Delivering semester textbooks and personal luggage.',
        identification_type: 'Aadhaar',
        identification_last4: '4321',
        visit_date: '2026-09-18',
        expected_check_in: new Date('2026-09-18T10:00:00Z'),
        expected_check_out: new Date('2026-09-18T14:00:00Z'),
        status: 'APPROVED',
        created_by: 3,
        approved_by: 1
      },
      {
        id: 2,
        student_id: 5,
        hostel_id: 1,
        visitor_name: 'Suresh Puntia',
        visitor_phone: '9812345678',
        visitor_email: null,
        visitor_type: 'RELATIVE',
        purpose: 'Meeting student during visiting hours.',
        identification_type: 'Voter ID',
        identification_last4: '8765',
        visit_date: '2026-09-17',
        expected_check_in: new Date('2026-09-17T11:00:00Z'),
        expected_check_out: new Date('2026-09-17T16:00:00Z'),
        actual_check_in: new Date('2026-09-17T11:15:00Z'),
        actual_check_out: new Date('2026-09-17T15:45:00Z'),
        status: 'CHECKED_OUT',
        created_by: 7,
        approved_by: 1
      }
    ];

    for (const v of visits) {
      await db.pool.query(`
        INSERT INTO visits (id, student_id, hostel_id, visitor_name, visitor_phone, visitor_email, visitor_type, purpose, identification_type, identification_last4, visit_date, expected_check_in, expected_check_out, actual_check_in, actual_check_out, status, created_by, approved_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          visitor_name = VALUES(visitor_name),
          visitor_phone = VALUES(visitor_phone),
          purpose = VALUES(purpose),
          status = VALUES(status),
          actual_check_in = VALUES(actual_check_in),
          actual_check_out = VALUES(actual_check_out)
      `, [v.id, v.student_id, v.hostel_id, v.visitor_name, v.visitor_phone, v.visitor_email, v.visitor_type, v.purpose, v.identification_type, v.identification_last4, v.visit_date, v.expected_check_in, v.expected_check_out, v.actual_check_in || null, v.actual_check_out || null, v.status, v.created_by, v.approved_by]);
    }
    console.log('   ✅ Visits seeded.');

    // 5. Seed Fee Structures & Student Fees
    console.log('5. Seeding fee structures & student fees...');
    await db.pool.query(`
      INSERT INTO fee_structures (id, hostel_id, fee_type, name, description, amount, frequency, academic_year, created_by)
      VALUES
      (1, 1, 'HOSTEL_FEE', 'Baramunda Boys Annual Accommodation Fee', 'Annual room & facility maintenance charge', 18000.00, 'YEARLY', '2026-2027', 2),
      (2, 1, 'MESS_FEE', 'Monthly Mess Advance Fee', 'Monthly food and catering charges', 3500.00, 'MONTHLY', '2026-2027', 2)
      ON DUPLICATE KEY UPDATE amount = VALUES(amount)
    `);

    // Assign sample fee to student 1 & 2
    await db.pool.query(`
      INSERT INTO student_fees (id, student_id, hostel_id, fee_structure_id, academic_year, amount, paid_amount, due_date, status)
      VALUES
      (1, 1, 1, 1, '2026-2027', 18000.00, 18000.00, '2026-10-31', 'PAID'),
      (2, 2, 1, 1, '2026-2027', 18000.00, 9000.00, '2026-10-31', 'PARTIAL')
      ON DUPLICATE KEY UPDATE status = VALUES(status), paid_amount = VALUES(paid_amount)
    `);
    console.log('   ✅ Fee structures & student fees seeded.');

    // 6. Seed Maintenance Requests & Room Inspections
    console.log('6. Seeding maintenance requests & room inspections...');
    await db.pool.query(`
      INSERT INTO maintenance_requests (id, hostel_id, floor_id, room_id, bed_id, category, title, description, priority, status, reported_by, student_id, assigned_to)
      VALUES
      (1, 1, 1, 1, 1, 'PLUMBING', 'Drain blockage in washroom', 'Water draining very slowly in shower area.', 'HIGH', 'IN_PROGRESS', 3, 1, 1),
      (2, 1, 1, 2, 5, 'ELECTRICAL', 'Switchboard replacement needed', 'Socket switch loose on study desk.', 'MEDIUM', 'OPEN', 7, 5, NULL)
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `);

    await db.pool.query(`
      INSERT INTO room_inspections (id, hostel_id, floor_id, room_id, inspected_by, inspection_date, cleanliness_status, electrical_status, plumbing_status, furniture_status, bed_status, safety_status, remarks)
      VALUES
      (1, 1, 1, 1, 1, '2026-09-15', 'GOOD', 'GOOD', 'ATTENTION_REQUIRED', 'GOOD', 'GOOD', 'GOOD', 'Plumbing drainage issue logged for repair.')
      ON DUPLICATE KEY UPDATE remarks = VALUES(remarks)
    `);
    console.log('   ✅ Maintenance & Inspections seeded.');

    console.log('=== REAL MYSQL SEEDING COMPLETE WITH 100% SUCCESS ===');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding MySQL database:', err);
    process.exit(1);
  }
}

seedRealDatabase();
