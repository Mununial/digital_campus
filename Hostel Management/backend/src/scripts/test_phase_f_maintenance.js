const db = require('../config/db');
const technicianService = require('../services/technicianService');
const maintenanceService = require('../services/maintenanceService');

async function runTests() {
  console.log('--- Starting Phase F Advanced Maintenance E2E Verification ---');

  const mockAdmin = { id: 1, role: 'SUPER_ADMIN', email: 'admin@hostel.com' };
  const mockStudent = { id: 41, role: 'STUDENT', email: 'student41@hostel.com' };

  try {
    // Test 1: Fetch Technicians
    console.log('\n[Test 1] Fetching Technicians...');
    let technicians = await technicianService.getTechnicians({});
    if (technicians.length === 0) {
      console.log('No technicians found, creating one...');
      await technicianService.createTechnician(mockAdmin, {
        full_name: 'Ramesh Kumar',
        phone: '9876543210',
        email: 'ramesh.electrician@bec.ac.in',
        skill_category: 'ELECTRICAL',
        status: 'AVAILABLE',
        rating: 4.85
      });
      technicians = await technicianService.getTechnicians({});
    }
    console.log(`Found ${technicians.length} total technician(s).`);
    const tech = technicians[0];
    console.log(`Selected Technician: ${tech.full_name} (ID: ${tech.id}, Skill: ${tech.skill_category}, Rating: ${tech.rating})`);


    // Test 2: Check Duplicate Detection
    console.log('\n[Test 2] Testing Duplicate Detection...');
    // Create first complaint
    const req1 = await maintenanceService.createMaintenanceRequest({
      category: 'ELECTRICAL',
      title: 'Ceiling Fan Making Loud Noise',
      description: 'The ceiling fan in Room 101 is vibrating and making a heavy noise.',
      priority: 'MEDIUM',
      room_id: 1,
      hostel_id: 1
    }, mockStudent);
    console.log(`Created primary request ID ${req1.id}, Hostel ID ${req1.hostel_id}, Room ID ${req1.room_id}`);

    // Check duplicates for same room & category
    const dupes = await maintenanceService.checkDuplicateRequests({
      hostel_id: req1.hostel_id,
      room_id: req1.room_id,
      category: req1.category,
      title: req1.title
    }, mockStudent);

    console.log(`Duplicate check returned ${dupes.length} potential duplicate ticket(s).`);
    if (dupes.length === 0) throw new Error('Expected duplicate detection to find req1.');


    // Test 3: Upvote Existing Maintenance Ticket
    console.log('\n[Test 3] Testing Upvote Functionality...');
    const upvoted = await maintenanceService.upvoteMaintenanceRequest(mockStudent, req1.id);
    console.log(`Upvote successful! New upvote_count: ${upvoted.upvote_count}`);
    if (upvoted.upvote_count < 1) throw new Error('Expected upvote_count to be at least 1');

    // Test 4: Assign Technician to Maintenance Request
    console.log('\n[Test 4] Testing Technician Assignment...');
    const assigned = await maintenanceService.assignTechnicianToRequest(mockAdmin, req1.id, tech.id);
    console.log(`Assigned Technician ID ${tech.id} to Request ${assigned.id}. Status: ${assigned.status}, Tech Name: ${assigned.technician_name}`);
    if (assigned.technician_id !== tech.id) throw new Error('Technician assignment failed.');


    // Resolve ticket to test resolution time
    await maintenanceService.updateMaintenanceStatus(req1.id, 'RESOLVED', 'Replaced capacitor and tightened fan mounting bolts.', mockAdmin);
    console.log(`Request ID ${req1.id} set to RESOLVED.`);

    // Test 5: Analytics (MTTR & Hotspot Rooms)
    console.log('\n[Test 5] Testing Maintenance Analytics...');
    const analytics = await maintenanceService.getMaintenanceAnalytics({}, mockAdmin);
    console.log('Analytics MTTR by Category:', JSON.stringify(analytics.mttr_by_category, null, 2));
    console.log('Hotspot Rooms count:', analytics.hotspot_rooms.length);

    console.log('\n✅ All Phase F Advanced Maintenance E2E Tests PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runTests();
