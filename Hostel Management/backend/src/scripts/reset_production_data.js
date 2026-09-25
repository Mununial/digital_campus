const db = require('../config/db');

async function resetProductionData() {
  console.log(' Starting Complete Production Data Cleanup & Reset...');
  const connection = await db.pool.getConnection();

  try {
    await connection.beginTransaction();

    // Disable Foreign Key Checks temporarily for clean truncation
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToClear = [
      'activity_log',
      'attendance',
      'complaint_comments',
      'complaint_history',
      'complaints',
      'fee_history',
      'fee_payments',
      'fee_structures',
      'maintenance_requests',
      'maintenance_updates',
      'meal_attendance',
      'notice_reads',
      'notices',
      'room_inspections',
      'security_audit_log',
      'student_allocations',
      'student_fees',
      'students',
      'superintendent_hostels',
      'visitor_history',
      'visits',
      'beds',
      'rooms',
      'floors',
      'hostels'
    ];

    for (const table of tablesToClear) {
      try {
        await connection.query(`DELETE FROM \`${table}\``);
        await connection.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
        console.log(` Purged table: ${table}`);
      } catch (tErr) {
        console.warn(` Could not clear table ${table}:`, tErr.message);
      }
    }

    console.log(' Clearing non-admin user credentials...');
    await connection.query(`
      DELETE FROM users 
      WHERE username != 'superadmin' 
        AND role_id != 1
    `);
    await connection.query('ALTER TABLE users AUTO_INCREMENT = 2');

    // Re-enable Foreign Key Checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.commit();
    console.log('\n PRODUCTION RESET SUCCESSFUL! All demo and test data wiped clean.');

    // Print Remaining Admin User Summary
    const [adminUsers] = await connection.query('SELECT id, username, email, full_name, role_id FROM users');
    console.log('\n Active Admin Credentials Preserved:');
    console.table(adminUsers);

  } catch (err) {
    await connection.rollback();
    console.error(' Reset Failed:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

resetProductionData();
