const db = require('../config/db');
const masterService = require('./masterService');
const activityService = require('./activityService');

/**
 * Normalizes branch name strings for similarity detection.
 */
function normalizeBranch(branch) {
  if (!branch) return '';
  return branch
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Runs full data integrity diagnostic checks.
 */
async function runIntegrityCheck(actor) {
  masterService.assertSuperAdmin(actor);

  const issues = [];

  // 1. Bed points to invalid room
  const [invalidRoomBeds] = await db.pool.query(
    `SELECT b.id, b.bed_number, b.room_id 
     FROM beds b 
     LEFT JOIN rooms r ON b.room_id = r.id 
     WHERE r.id IS NULL`
  );
  invalidRoomBeds.forEach(b => {
    issues.push({
      issue_type: 'BED_INVALID_ROOM',
      severity: 'CRITICAL',
      entity: 'Bed',
      entity_id: b.id,
      description: `Bed #${b.bed_number} (ID: ${b.id}) points to non-existent Room ID #${b.room_id}.`,
      repairable: false
    });
  });

  // 2. Room points to invalid floor
  const [invalidFloorRooms] = await db.pool.query(
    `SELECT r.id, r.room_number, r.floor_id 
     FROM rooms r 
     LEFT JOIN floors f ON r.floor_id = f.id 
     WHERE f.id IS NULL`
  );
  invalidFloorRooms.forEach(r => {
    issues.push({
      issue_type: 'ROOM_INVALID_FLOOR',
      severity: 'CRITICAL',
      entity: 'Room',
      entity_id: r.id,
      description: `Room #${r.room_number} (ID: ${r.id}) points to non-existent Floor ID #${r.floor_id}.`,
      repairable: false
    });
  });

  // 3. Floor points to invalid hostel
  const [invalidHostelFloors] = await db.pool.query(
    `SELECT f.id, f.floor_name, f.hostel_id 
     FROM floors f 
     LEFT JOIN hostels h ON f.hostel_id = h.id 
     WHERE h.id IS NULL`
  );
  invalidHostelFloors.forEach(f => {
    issues.push({
      issue_type: 'FLOOR_INVALID_HOSTEL',
      severity: 'CRITICAL',
      entity: 'Floor',
      entity_id: f.id,
      description: `Floor "${f.floor_name}" (ID: ${f.id}) points to non-existent Hostel ID #${f.hostel_id}.`,
      repairable: false
    });
  });

  // 4. Active allocation points to invalid bed
  const [invalidBedAllocations] = await db.pool.query(
    `SELECT sa.id, sa.student_id, sa.bed_id 
     FROM student_allocations sa 
     LEFT JOIN beds b ON sa.bed_id = b.id 
     WHERE sa.status = 'ACTIVE' AND (sa.bed_id IS NOT NULL AND b.id IS NULL)`
  );
  invalidBedAllocations.forEach(sa => {
    issues.push({
      issue_type: 'ALLOCATION_INVALID_BED',
      severity: 'CRITICAL',
      entity: 'StudentAllocation',
      entity_id: sa.id,
      description: `Active allocation #${sa.id} for Student ID #${sa.student_id} points to non-existent Bed ID #${sa.bed_id}.`,
      repairable: false
    });
  });

  // 5. Active allocation points to mismatched room
  const [mismatchedRoomAllocations] = await db.pool.query(
    `SELECT sa.id, sa.student_id, sa.room_id, sa.bed_id, b.room_id as actual_room_id 
     FROM student_allocations sa 
     JOIN beds b ON sa.bed_id = b.id 
     WHERE sa.status = 'ACTIVE' AND sa.room_id != b.room_id`
  );
  mismatchedRoomAllocations.forEach(sa => {
    issues.push({
      issue_type: 'ALLOCATION_MISMATCHED_ROOM',
      severity: 'CRITICAL',
      entity: 'StudentAllocation',
      entity_id: sa.id,
      description: `Active allocation #${sa.id} room_id (${sa.room_id}) does not match bed #${sa.bed_id}'s actual room_id (${sa.actual_room_id}).`,
      repairable: false
    });
  });

  // 6. Active allocation points to mismatched hostel
  const [mismatchedHostelAllocations] = await db.pool.query(
    `SELECT sa.id, sa.student_id, sa.hostel_id, sa.room_id, r.hostel_id as actual_hostel_id 
     FROM student_allocations sa 
     JOIN rooms r ON sa.room_id = r.id 
     WHERE sa.status = 'ACTIVE' AND sa.hostel_id != r.hostel_id`
  );
  mismatchedHostelAllocations.forEach(sa => {
    issues.push({
      issue_type: 'ALLOCATION_MISMATCHED_HOSTEL',
      severity: 'CRITICAL',
      entity: 'StudentAllocation',
      entity_id: sa.id,
      description: `Active allocation #${sa.id} hostel_id (${sa.hostel_id}) does not match room #${sa.room_id}'s actual hostel_id (${sa.actual_hostel_id}).`,
      repairable: false
    });
  });

  // 7. Occupied bed without active allocation
  const [unallocatedOccupiedBeds] = await db.pool.query(
    `SELECT b.id, b.bed_number, b.room_id, r.room_number, h.name as hostel_name 
     FROM beds b 
     JOIN rooms r ON b.room_id = r.id 
     JOIN hostels h ON r.hostel_id = h.id 
     LEFT JOIN student_allocations sa ON b.id = sa.bed_id AND sa.status = 'ACTIVE' 
     LEFT JOIN students s ON b.id = s.bed_id 
     WHERE b.status = 'OCCUPIED' AND sa.id IS NULL AND s.id IS NULL`
  );
  unallocatedOccupiedBeds.forEach(b => {
    issues.push({
      issue_type: 'OCCUPIED_BED_NO_ALLOCATION',
      severity: 'CRITICAL',
      entity: 'Bed',
      entity_id: b.id,
      hostel: b.hostel_name,
      room: b.room_number,
      description: `Bed #${b.bed_number} (ID: ${b.id}) in Room ${b.room_number} is OCCUPIED but has no ACTIVE allocation or assigned student.`,
      repairable: true,
      repair_action: 'MARK_BED_AVAILABLE'
    });
  });

  // 8. Active allocation with AVAILABLE bed
  const [availableAllocatedBeds] = await db.pool.query(
    `SELECT sa.id as allocation_id, sa.student_id, sa.bed_id, b.bed_number, b.status as bed_status, s.full_name as student_name, r.room_number, h.name as hostel_name 
     FROM student_allocations sa 
     JOIN beds b ON sa.bed_id = b.id 
     JOIN rooms r ON b.room_id = r.id
     JOIN hostels h ON r.hostel_id = h.id
     LEFT JOIN students s ON sa.student_id = s.id 
     WHERE sa.status = 'ACTIVE' AND b.status = 'AVAILABLE'`
  );
  availableAllocatedBeds.forEach(b => {
    issues.push({
      issue_type: 'ALLOCATION_BED_AVAILABLE',
      severity: 'CRITICAL',
      entity: 'Bed',
      entity_id: b.bed_id,
      hostel: b.hostel_name,
      room: b.room_number,
      student: b.student_name,
      description: `Bed #${b.bed_number} (ID: ${b.bed_id}) is marked AVAILABLE but has an active allocation for Student ${b.student_name || '#' + b.student_id}.`,
      repairable: true,
      repair_action: 'SYNC_BED_STATUS_OCCUPIED'
    });
  });

  // 9. Student with multiple active allocations
  const [multipleAllocations] = await db.pool.query(
    `SELECT sa.student_id, s.full_name, COUNT(*) as cnt 
     FROM student_allocations sa 
     JOIN students s ON sa.student_id = s.id 
     WHERE sa.status = 'ACTIVE' 
     GROUP BY sa.student_id HAVING cnt > 1`
  );
  multipleAllocations.forEach(m => {
    issues.push({
      issue_type: 'STUDENT_MULTIPLE_ALLOCATIONS',
      severity: 'CRITICAL',
      entity: 'Student',
      entity_id: m.student_id,
      student: m.full_name,
      description: `Student ${m.full_name} (ID: ${m.student_id}) has ${m.cnt} active allocation records.`,
      repairable: false
    });
  });

  // 10. Duplicate room numbers within a floor
  const [duplicateRooms] = await db.pool.query(
    `SELECT r.floor_id, f.floor_name, h.name as hostel_name, r.room_number, COUNT(*) as cnt 
     FROM rooms r 
     JOIN floors f ON r.floor_id = f.id 
     JOIN hostels h ON r.hostel_id = h.id 
     GROUP BY r.floor_id, r.room_number HAVING cnt > 1`
  );
  duplicateRooms.forEach(dr => {
    issues.push({
      issue_type: 'DUPLICATE_ROOM_IN_FLOOR',
      severity: 'WARNING',
      entity: 'Floor',
      entity_id: dr.floor_id,
      hostel: dr.hostel_name,
      room: dr.room_number,
      description: `Floor "${dr.floor_name}" in ${dr.hostel_name} has ${dr.cnt} rooms with number "${dr.room_number}".`,
      repairable: false
    });
  });

  // 11. Duplicate bed identifiers within a room
  const [duplicateBeds] = await db.pool.query(
    `SELECT b.room_id, r.room_number, h.name as hostel_name, b.bed_number, COUNT(*) as cnt 
     FROM beds b 
     JOIN rooms r ON b.room_id = r.id 
     JOIN hostels h ON r.hostel_id = h.id 
     GROUP BY b.room_id, b.bed_number HAVING cnt > 1`
  );
  duplicateBeds.forEach(dbed => {
    issues.push({
      issue_type: 'DUPLICATE_BED_IN_ROOM',
      severity: 'WARNING',
      entity: 'Room',
      entity_id: dbed.room_id,
      hostel: dbed.hostel_name,
      room: dbed.room_number,
      description: `Room ${dbed.room_number} in ${dbed.hostel_name} has ${dbed.cnt} beds with label "${dbed.bed_number}".`,
      repairable: false
    });
  });

  // 12. Inactive hostel with active allocation
  const [inactiveHostelAllocations] = await db.pool.query(
    `SELECT sa.id, sa.hostel_id, h.name as hostel_name, sa.student_id, s.full_name 
     FROM student_allocations sa 
     JOIN hostels h ON sa.hostel_id = h.id 
     LEFT JOIN students s ON sa.student_id = s.id 
     WHERE sa.status = 'ACTIVE' AND h.status = 'INACTIVE'`
  );
  inactiveHostelAllocations.forEach(ih => {
    issues.push({
      issue_type: 'INACTIVE_HOSTEL_ACTIVE_ALLOCATION',
      severity: 'WARNING',
      entity: 'Hostel',
      entity_id: ih.hostel_id,
      hostel: ih.hostel_name,
      student: ih.full_name,
      description: `Hostel "${ih.hostel_name}" is INACTIVE but has active allocation #${ih.id} for Student ${ih.full_name || '#' + ih.student_id}.`,
      repairable: false
    });
  });

  // 13. Inactive room with active allocation
  const [inactiveRoomAllocations] = await db.pool.query(
    `SELECT sa.id, sa.room_id, r.room_number, sa.student_id, s.full_name, h.name as hostel_name 
     FROM student_allocations sa 
     JOIN rooms r ON sa.room_id = r.id 
     JOIN hostels h ON r.hostel_id = h.id 
     LEFT JOIN students s ON sa.student_id = s.id 
     WHERE sa.status = 'ACTIVE' AND r.status = 'INACTIVE'`
  );
  inactiveRoomAllocations.forEach(ir => {
    issues.push({
      issue_type: 'INACTIVE_ROOM_ACTIVE_ALLOCATION',
      severity: 'WARNING',
      entity: 'Room',
      entity_id: ir.room_id,
      hostel: ir.hostel_name,
      room: ir.room_number,
      student: ir.full_name,
      description: `Room ${ir.room_number} is INACTIVE but has active allocation #${ir.id} for Student ${ir.full_name || '#' + ir.student_id}.`,
      repairable: false
    });
  });

  // 14. Inactive bed with active allocation
  const [inactiveBedAllocations] = await db.pool.query(
    `SELECT sa.id, sa.bed_id, b.bed_number, sa.student_id, s.full_name, r.room_number, h.name as hostel_name 
     FROM student_allocations sa 
     JOIN beds b ON sa.bed_id = b.id 
     JOIN rooms r ON b.room_id = r.id 
     JOIN hostels h ON r.hostel_id = h.id 
     LEFT JOIN students s ON sa.student_id = s.id 
     WHERE sa.status = 'ACTIVE' AND b.status = 'INACTIVE'`
  );
  inactiveBedAllocations.forEach(ib => {
    issues.push({
      issue_type: 'INACTIVE_BED_ACTIVE_ALLOCATION',
      severity: 'WARNING',
      entity: 'Bed',
      entity_id: ib.bed_id,
      hostel: ib.hostel_name,
      room: ib.room_number,
      student: ib.full_name,
      description: `Bed #${ib.bed_number} is INACTIVE but has active allocation #${ib.id} for Student ${ib.full_name || '#' + ib.student_id}.`,
      repairable: false
    });
  });

  // 15. Student marked inactive but still actively allocated
  const [inactiveStudentAllocations] = await db.pool.query(
    `SELECT s.id, s.full_name, s.status as student_status, sa.id as allocation_id 
     FROM students s 
     JOIN student_allocations sa ON s.id = sa.student_id 
     WHERE s.status IN ('INACTIVE', 'GRADUATED') AND sa.status = 'ACTIVE'`
  );
  inactiveStudentAllocations.forEach(is => {
    issues.push({
      issue_type: 'INACTIVE_STUDENT_ACTIVE_ALLOCATION',
      severity: 'WARNING',
      entity: 'Student',
      entity_id: is.id,
      student: is.full_name,
      description: `Student ${is.full_name} status is ${is.student_status} but has active allocation #${is.allocation_id}.`,
      repairable: false
    });
  });

  // Academic Master Data Diagnostics
  const [students] = await db.pool.query(
    `SELECT id, student_id, roll_number, full_name, email, branch, course, year, status FROM students`
  );

  const branchMap = {};
  students.forEach(st => {
    if (st.branch) {
      const norm = normalizeBranch(st.branch);
      if (!branchMap[norm]) branchMap[norm] = new Set();
      branchMap[norm].add(st.branch);
    }
  });

  Object.entries(branchMap).forEach(([norm, variants]) => {
    if (variants.size > 1) {
      const varList = Array.from(variants).join(', ');
      issues.push({
        issue_type: 'SIMILAR_BRANCH_NAMES_DETECTED',
        severity: 'INFO',
        entity: 'StudentAcademic',
        description: `Near-duplicate branch variants detected: [${varList}]. Consider standardizing branch names.`,
        repairable: false
      });
    }
  });

  students.forEach(st => {
    if (!st.branch || !st.branch.trim()) {
      issues.push({
        issue_type: 'MISSING_STUDENT_BRANCH',
        severity: 'WARNING',
        entity: 'Student',
        entity_id: st.id,
        student: st.full_name,
        description: `Student ${st.full_name} (ID: ${st.id}) is missing branch information.`,
        repairable: false
      });
    }
    if (!st.course || !st.course.trim()) {
      issues.push({
        issue_type: 'MISSING_STUDENT_COURSE',
        severity: 'WARNING',
        entity: 'Student',
        entity_id: st.id,
        student: st.full_name,
        description: `Student ${st.full_name} (ID: ${st.id}) is missing course information.`,
        repairable: false
      });
    }
    if (!st.year || isNaN(parseInt(st.year, 10)) || st.year < 1 || st.year > 6) {
      issues.push({
        issue_type: 'INVALID_STUDENT_YEAR',
        severity: 'WARNING',
        entity: 'Student',
        entity_id: st.id,
        student: st.full_name,
        description: `Student ${st.full_name} (ID: ${st.id}) has invalid academic year (${st.year}).`,
        repairable: false
      });
    }
  });

  await activityService.logActivity({
    actorId: actor.id,
    action: 'DATA_INTEGRITY_CHECKED',
    module: 'MASTER_DATA',
    entityType: 'SYSTEM',
    description: `Ran data integrity check. Found ${issues.length} issue(s).`,
    metadata: { totalIssues: issues.length, critical: issues.filter(i => i.severity === 'CRITICAL').length }
  });

  const summary = {
    critical: issues.filter(i => i.severity === 'CRITICAL').length,
    warning: issues.filter(i => i.severity === 'WARNING').length,
    info: issues.filter(i => i.severity === 'INFO').length,
    totalIssues: issues.length
  };

  return {
    checked_at: new Date().toISOString(),
    total_issues: issues.length,
    critical_count: summary.critical,
    warning_count: summary.warning,
    info_count: summary.info,
    summary,
    issues
  };
}

/**
 * Performs a controlled safe repair for a specific diagnostic issue.
 */
async function repairIntegrityIssue(repairData, actor) {
  masterService.assertSuperAdmin(actor);

  const { issue_type, entity_id } = repairData;

  if (!issue_type || !entity_id) {
    const error = new Error('Issue type and entity ID are required for repair.');
    error.status = 400;
    throw error;
  }

  if (issue_type === 'OCCUPIED_BED_NO_ALLOCATION') {
    // Safety check: ensure bed has no active allocations or assigned student
    const [allocations] = await db.pool.query(
      `SELECT id FROM student_allocations WHERE bed_id = ? AND status = 'ACTIVE'`,
      [entity_id]
    );
    const [students] = await db.pool.query(
      `SELECT id FROM students WHERE bed_id = ?`,
      [entity_id]
    );

    if (allocations.length > 0 || students.length > 0) {
      const error = new Error(`Cannot mark bed AVAILABLE: Active allocation or student assignment exists.`);
      error.status = 400;
      throw error;
    }

    await db.pool.query(
      `UPDATE beds SET status = 'AVAILABLE' WHERE id = ?`,
      [entity_id]
    );

    await activityService.logActivity({
      actorId: actor.id,
      action: 'DATA_INTEGRITY_REPAIRED',
      module: 'MASTER_DATA',
      entityType: 'BED',
      entityId: entity_id,
      description: `Repaired integrity issue: Marked unallocated Bed #${entity_id} as AVAILABLE.`,
      metadata: { issue_type, entity_id, action: 'MARK_BED_AVAILABLE' }
    });

    return { success: true, message: `Bed #${entity_id} successfully marked as AVAILABLE.` };
  } else if (issue_type === 'ALLOCATION_BED_AVAILABLE') {
    // Safety check: verify active allocation exists
    const [allocations] = await db.pool.query(
      `SELECT id FROM student_allocations WHERE bed_id = ? AND status = 'ACTIVE'`,
      [entity_id]
    );
    if (allocations.length === 0) {
      const error = new Error(`Cannot sync bed status to OCCUPIED: No active allocation found.`);
      error.status = 400;
      throw error;
    }

    await db.pool.query(
      `UPDATE beds SET status = 'OCCUPIED' WHERE id = ?`,
      [entity_id]
    );

    await activityService.logActivity({
      actorId: actor.id,
      action: 'DATA_INTEGRITY_REPAIRED',
      module: 'MASTER_DATA',
      entityType: 'BED',
      entityId: entity_id,
      description: `Repaired integrity issue: Synced allocated Bed #${entity_id} status to OCCUPIED.`,
      metadata: { issue_type, entity_id, action: 'SYNC_BED_STATUS_OCCUPIED' }
    });

    return { success: true, message: `Bed #${entity_id} status synced to OCCUPIED.` };
  } else {
    const error = new Error(`Automatic repair for issue type "${issue_type}" is not supported. Please resolve manually.`);
    error.status = 400;
    throw error;
  }
}

module.exports = {
  runIntegrityCheck,
  repairIntegrityIssue
};
