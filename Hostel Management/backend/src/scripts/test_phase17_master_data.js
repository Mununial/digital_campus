/**
 * Standalone Automated Audit Script for Phase 17 — Master Data Management & Data Integrity Center
 * Run via: node backend/src/scripts/test_phase17_master_data.js
 */

const db = require('../config/db');
const masterService = require('../services/masterService');
const hostelService = require('../services/hostelService');
const floorService = require('../services/floorService');
const roomService = require('../services/roomService');
const bedService = require('../services/bedService');
const integrityService = require('../services/integrityService');

const mockSuperAdmin = { id: 1, role: 'SUPER_ADMIN', username: 'admin' };
const mockSuperintendent = { id: 2, role: 'SUPERINTENDENT', username: 'superintendent', hostels: [1] };
const mockStudent = { id: 3, role: 'STUDENT', username: 'student' };

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(` ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(` ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log(' PHASE 17 — MASTER DATA & DATA INTEGRITY AUTOMATED AUDIT');
  console.log('=============================================================\n');

  let createdHostel, createdFloor, createdRoom, createdBed;

  try {
    // 1. Role Authorization Checks
    console.log('--- 1. Security & Role Guards ---');
    try {
      masterService.assertSuperAdmin(mockStudent);
      assert(false, 'Student should be denied Super Admin access');
    } catch (err) {
      assert(err.status === 403, 'Student access denied with HTTP 403');
    }

    try {
      masterService.assertSuperAdmin(mockSuperintendent);
      assert(false, 'Superintendent should be denied Super Admin access');
    } catch (err) {
      assert(err.status === 403, 'Superintendent mutation access denied with HTTP 403');
    }

    try {
      masterService.assertSuperAdmin(mockSuperAdmin);
      assert(true, 'Super Admin granted access for master data administration');
    } catch (err) {
      assert(false, 'Super Admin should be authorized');
    }

    // 2. Master Summary
    console.log('\n--- 2. Master Metrics Summary ---');
    try {
      const summary = await masterService.getMasterSummary(mockSuperAdmin);
      assert(summary && typeof summary.totalHostels === 'number', 'Retrieved master metrics summary successfully');
      assert(typeof summary.occupancyRate === 'number' || typeof summary.occupancy_rate === 'number', 'Calculated occupancy rate metrics');
    } catch (err) {
      assert(false, `Failed to retrieve master summary: ${err.message}`);
    }

    // 3. Infrastructure CRUD & Safety Guards
    console.log('\n--- 3. Infrastructure & Safety Guards ---');

    // Clean up previous test hostel if exists
    const [existing] = await db.pool.query("SELECT id FROM hostels WHERE code = 'SAH'");
    if (existing.length > 0) {
      await db.pool.query("DELETE FROM beds WHERE room_id IN (SELECT id FROM rooms WHERE hostel_id = ?)", [existing[0].id]);
      await db.pool.query("DELETE FROM rooms WHERE hostel_id = ?", [existing[0].id]);
      await db.pool.query("DELETE FROM floors WHERE hostel_id = ?", [existing[0].id]);
      await db.pool.query("DELETE FROM hostels WHERE id = ?", [existing[0].id]);
    }

    try {
      createdHostel = await hostelService.createHostel({
        name: 'Script Audit Hostel',
        code: 'SAH',
        type: 'BOYS',
        capacity: 50,
        status: 'ACTIVE'
      }, mockSuperAdmin);
      assert(createdHostel && createdHostel.id, 'Super Admin created a new hostel');
    } catch (err) {
      assert(false, `Failed to create hostel: ${err.message}`);
    }

    // Duplicate Hostel Check
    try {
      await hostelService.createHostel({
        name: 'Script Audit Hostel Duplicate',
        code: 'SAH',
        type: 'BOYS',
        capacity: 50
      }, mockSuperAdmin);
      assert(false, 'Duplicate hostel code should be rejected');
    } catch (err) {
      assert(err.status === 400 || err.message.includes('exists') || err.message.includes('Duplicate'), 'Duplicate hostel code rejected');
    }

    // Create Floor (Use Floor 15 since default floors 0-10 are auto-created)
    try {
      createdFloor = await floorService.createFloor({
        hostel_id: createdHostel.id,
        floor_name: 'Audit 15th Floor',
        floor_number: 15,
        status: 'ACTIVE'
      }, mockSuperAdmin);
      assert(createdFloor && createdFloor.id, 'Super Admin created a floor');
    } catch (err) {
      assert(false, `Failed to create floor: ${err.message}`);
    }

    // Duplicate Floor Check
    try {
      await floorService.createFloor({
        hostel_id: createdHostel.id,
        floor_name: 'Audit 15th Floor Dup',
        floor_number: 15
      }, mockSuperAdmin);
      assert(false, 'Duplicate floor number within hostel should be rejected');
    } catch (err) {
      assert(err.status === 400 || err.message.includes('exists'), 'Duplicate floor number rejected');
    }

    // Create Room
    try {
      createdRoom = await roomService.createRoom({
        hostel_id: createdHostel.id,
        floor_id: createdFloor.id,
        room_number: '1501-AUDIT',
        capacity: 2,
        status: 'ACTIVE'
      }, mockSuperAdmin);
      assert(createdRoom && createdRoom.id, 'Super Admin created a room');
    } catch (err) {
      assert(false, `Failed to create room: ${err.message}`);
    }

    // Duplicate Room Check
    try {
      await roomService.createRoom({
        hostel_id: createdHostel.id,
        floor_id: createdFloor.id,
        room_number: '1501-AUDIT',
        capacity: 2
      }, mockSuperAdmin);
      assert(false, 'Duplicate room number within floor should be rejected');
    } catch (err) {
      assert(err.status === 400 || err.message.includes('exists'), 'Duplicate room number rejected');
    }

    // Create Bed
    try {
      createdBed = await bedService.createBed({
        hostel_id: createdHostel.id,
        floor_id: createdFloor.id,
        room_id: createdRoom.id,
        bed_number: 'BED-1501A',
        status: 'AVAILABLE'
      }, mockSuperAdmin);
      assert(createdBed && createdBed.id, 'Super Admin created a bed');
    } catch (err) {
      assert(false, `Failed to create bed: ${err.message}`);
    }

    // Delete Bed, Room, Floor Lifecycle
    try {
      await bedService.deleteBed(createdBed.id, mockSuperAdmin);
      assert(true, 'Bed successfully deleted');
      await roomService.deleteRoom(createdRoom.id, mockSuperAdmin);
      assert(true, 'Room successfully deleted');
      await floorService.deleteFloor(createdFloor.id, mockSuperAdmin);
      assert(true, 'Floor successfully deleted without SQL errors');
    } catch (err) {
      assert(false, `Failed during delete lifecycle: ${err.message}`);
    }

    // 4. Data Integrity Scanner Engine
    console.log('\n--- 4. Data Integrity Diagnostic Scanner ---');
    try {
      const report = await integrityService.runIntegrityCheck(mockSuperAdmin);
      assert(report && Array.isArray(report.issues), 'Diagnostic engine completed 15-rule integrity scan');
      assert(report.summary && typeof report.summary.critical === 'number', 'Integrity summary generated with CRITICAL, WARNING, INFO counts');
    } catch (err) {
      assert(false, `Failed to run integrity scan: ${err.message}`);
    }

  } finally {
    // Cleanup created test hostel
    if (createdHostel && createdHostel.id) {
      await db.pool.query("DELETE FROM beds WHERE room_id IN (SELECT id FROM rooms WHERE hostel_id = ?)", [createdHostel.id]);
      await db.pool.query("DELETE FROM rooms WHERE hostel_id = ?", [createdHostel.id]);
      await db.pool.query("DELETE FROM floors WHERE hostel_id = ?", [createdHostel.id]);
      await db.pool.query("DELETE FROM hostels WHERE id = ?", [createdHostel.id]);
    }
  }

  // Summary Results
  console.log('\n=============================================================');
  console.log(` AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
