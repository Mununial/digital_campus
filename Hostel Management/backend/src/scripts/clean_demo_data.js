/**
 * Database Reset & Demo Data Cleanup Script
 * Cleans out all mock/demo hostels, floors, rooms, beds, allocations, and associated logs
 * while preserving core administrative accounts and roles.
 */

const db = require('../config/db');

async function cleanDemoData() {
  console.log('=============================================================');
  console.log(' STARTING DEMO DATA PURGE & CLEAN SLATE RESET');
  console.log('=============================================================\n');

  const connection = await db.pool.getConnection();

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Clear Dependent Child Records
    console.log('1. Purging operational & transactional records...');
    await connection.query('TRUNCATE TABLE student_allocations');
    await connection.query('TRUNCATE TABLE visits');
    await connection.query('TRUNCATE TABLE visitor_history');
    await connection.query('TRUNCATE TABLE complaints');
    await connection.query('TRUNCATE TABLE complaint_history');
    await connection.query('TRUNCATE TABLE complaint_comments');
    await connection.query('TRUNCATE TABLE maintenance_requests');
    await connection.query('TRUNCATE TABLE maintenance_updates');
    await connection.query('TRUNCATE TABLE room_inspections');
    await connection.query('TRUNCATE TABLE notices');
    await connection.query('TRUNCATE TABLE notice_reads');
    await connection.query('TRUNCATE TABLE meal_attendance');
    await connection.query('TRUNCATE TABLE mess_menus');
    await connection.query('TRUNCATE TABLE fee_payments');
    await connection.query('TRUNCATE TABLE student_fees');
    await connection.query('TRUNCATE TABLE fee_structures');
    await connection.query('TRUNCATE TABLE fee_history');
    await connection.query('TRUNCATE TABLE attendance');
    console.log(' ✅ Operational tables truncated.');

    // 2. Clear Students & Superintendent Assignments
    console.log('2. Resetting student allocations & superintendent mappings...');
    await connection.query('TRUNCATE TABLE superintendent_hostels');
    await connection.query('TRUNCATE TABLE students');
    console.log(' ✅ Students & Superintendent mappings cleared.');

    // 3. Clear Infrastructure Hierarchy (Beds, Rooms, Floors, Hostels)
    console.log('3. Purging infrastructure master data...');
    await connection.query('TRUNCATE TABLE beds');
    await connection.query('TRUNCATE TABLE rooms');
    await connection.query('TRUNCATE TABLE floors');
    await connection.query('TRUNCATE TABLE hostels');
    console.log(' ✅ Beds, Rooms, Floors, and Hostels purged. Auto-increment reset to 1.');

    // 4. Clean Activity & Security Audit Logs
    console.log('4. Purging historical audit logs...');
    await connection.query('TRUNCATE TABLE activity_log');
    await connection.query('TRUNCATE TABLE security_audit_log');
    console.log(' ✅ Activity and Security audit logs reset.');

    // 5. Clean non-admin demo users if any (keep superadmin and warden)
    console.log('5. Retaining core administrative users...');
    await connection.query("DELETE FROM users WHERE username NOT IN ('superadmin', 'warden')");
    console.log(' ✅ Core administrative accounts (superadmin, warden) retained.');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n=============================================================');
    console.log(' 🎉 ALL FAKE & DEMO DATA SUCCESSFULLY REMOVED!');
    console.log(' The system is now completely clean and ready for real data.');
    console.log('=============================================================\n');

  } catch (err) {
    console.error(' ❌ Error cleaning demo data:', err);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

cleanDemoData();
