const db = require('../config/db');
const authorization = require('../utils/authorization');
const activityService = require('./activityService');

/**
 * Validates SUPER_ADMIN privilege for master data mutations.
 */
function assertSuperAdmin(actor) {
  if (!actor || actor.role !== 'SUPER_ADMIN') {
    const error = new Error('Access denied. Master data administration is restricted to Super Admin.');
    error.status = 403;
    throw error;
  }
}

/**
 * Retrieves overall master data summary metrics.
 */
async function getMasterSummary(actor) {
  if (!actor) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  if (actor.role === 'STUDENT') {
    const error = new Error('Access denied. Master data dashboard is restricted to administrative staff.');
    error.status = 403;
    throw error;
  }

  let hostelFilter = '';
  let params = [];

  if (actor.role === 'SUPERINTENDENT') {
    const assigned = actor.assignedHostels || [];
    if (assigned.length === 0) {
      return {
        totalHostels: 0,
        totalFloors: 0,
        totalRooms: 0,
        totalBeds: 0,
        availableBeds: 0,
        occupiedBeds: 0,
        maintenanceBeds: 0,
        inactiveBeds: 0,
        totalActiveStudents: 0,
        unallocatedStudents: 0
      };
    }
    hostelFilter = 'WHERE h.id IN (?)';
    params = [assigned];
  }

  const [hostelsCount] = await db.pool.query(
    `SELECT COUNT(*) as cnt FROM hostels h ${hostelFilter}`,
    params
  );

  const [floorsCount] = await db.pool.query(
    actor.role === 'SUPERINTENDENT'
      ? `SELECT COUNT(*) as cnt FROM floors f JOIN hostels h ON f.hostel_id = h.id WHERE h.id IN (?)`
      : `SELECT COUNT(*) as cnt FROM floors`,
    params
  );

  const [roomsCount] = await db.pool.query(
    actor.role === 'SUPERINTENDENT'
      ? `SELECT COUNT(*) as cnt FROM rooms r JOIN hostels h ON r.hostel_id = h.id WHERE h.id IN (?)`
      : `SELECT COUNT(*) as cnt FROM rooms`,
    params
  );

  const [bedsMetrics] = await db.pool.query(
    actor.role === 'SUPERINTENDENT'
      ? `SELECT 
          COUNT(b.id) as total,
          SUM(CASE WHEN b.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN b.status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied,
          SUM(CASE WHEN b.status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN b.status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive
         FROM beds b
         JOIN rooms r ON b.room_id = r.id
         JOIN hostels h ON r.hostel_id = h.id
         WHERE h.id IN (?)`
      : `SELECT 
          COUNT(b.id) as total,
          SUM(CASE WHEN b.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN b.status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied,
          SUM(CASE WHEN b.status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN b.status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive
         FROM beds b`
  , params);

  const [studentsMetrics] = await db.pool.query(
    `SELECT 
      COUNT(*) as totalActive,
      SUM(CASE WHEN bed_id IS NULL THEN 1 ELSE 0 END) as unallocated
     FROM students WHERE status = 'ACTIVE'`
  );

  const totalHostels = hostelsCount[0]?.cnt || 0;
  const totalFloors = floorsCount[0]?.cnt || 0;
  const totalRooms = roomsCount[0]?.cnt || 0;
  const totalBeds = bedsMetrics[0]?.total || 0;
  const occupiedBeds = Number(bedsMetrics[0]?.occupied || 0);
  const occupancy_rate = totalBeds > 0 ? parseFloat(((occupiedBeds / totalBeds) * 100).toFixed(2)) : 0;

  return {
    hostels: totalHostels,
    floors: totalFloors,
    rooms: totalRooms,
    beds: totalBeds,
    totalHostels,
    totalFloors,
    totalRooms,
    totalBeds,
    availableBeds: Number(bedsMetrics[0]?.available || 0),
    occupiedBeds,
    maintenanceBeds: Number(bedsMetrics[0]?.maintenance || 0),
    inactiveBeds: Number(bedsMetrics[0]?.inactive || 0),
    totalActiveStudents: studentsMetrics[0]?.totalActive || 0,
    unallocatedStudents: Number(studentsMetrics[0]?.unallocated || 0),
    occupancy_rate
  };
}

/**
 * Checks safety dependencies before deactivating/deleting a hostel.
 */
async function validateHostelDeactivation(hostelId) {
  const [allocations] = await db.pool.query(
    `SELECT COUNT(*) as cnt FROM student_allocations sa 
     JOIN rooms r ON sa.room_id = r.id 
     WHERE r.hostel_id = ? AND sa.status = 'ACTIVE'`,
    [hostelId]
  );
  const activeAllocationsCount = allocations[0]?.cnt || 0;
  if (activeAllocationsCount > 0) {
    const error = new Error(`Cannot deactivate hostel: ${activeAllocationsCount} students currently have active allocations.`);
    error.status = 400;
    throw error;
  }

  const [occupiedBeds] = await db.pool.query(
    `SELECT COUNT(*) as cnt FROM beds b 
     JOIN rooms r ON b.room_id = r.id 
     WHERE r.hostel_id = ? AND b.status = 'OCCUPIED'`,
    [hostelId]
  );
  const occupiedCount = occupiedBeds[0]?.cnt || 0;
  if (occupiedCount > 0) {
    const error = new Error(`Cannot deactivate hostel: ${occupiedCount} beds are currently occupied.`);
    error.status = 400;
    throw error;
  }

  const [pendingMaint] = await db.pool.query(
    `SELECT COUNT(*) as cnt FROM maintenance_requests 
     WHERE hostel_id = ? AND status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED')`,
    [hostelId]
  );
  const maintCount = pendingMaint[0]?.cnt || 0;
  if (maintCount > 0) {
    const error = new Error(`Cannot deactivate hostel: ${maintCount} pending maintenance requests exist.`);
    error.status = 400;
    throw error;
  }
}

/**
 * Checks safety dependencies before deactivating/deleting a floor.
 */
async function validateFloorDeactivation(floorId) {
  const [allocations] = await db.pool.query(
    `SELECT COUNT(*) as cnt FROM student_allocations sa JOIN rooms r ON sa.room_id = r.id WHERE r.floor_id = ? AND sa.status = 'ACTIVE'`,
    [floorId]
  );
  const activeCount = allocations[0]?.cnt || 0;
  if (activeCount > 0) {
    const error = new Error(`Cannot deactivate floor: ${activeCount} students currently have active allocations on this floor.`);
    error.status = 400;
    throw error;
  }

  const [occupiedBeds] = await db.pool.query(
    `SELECT COUNT(*) as cnt FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.floor_id = ? AND b.status = 'OCCUPIED'`,
    [floorId]
  );
  const occupiedCount = occupiedBeds[0]?.cnt || 0;
  if (occupiedCount > 0) {
    const error = new Error(`Cannot deactivate floor: ${occupiedCount} beds are currently occupied on this floor.`);
    error.status = 400;
    throw error;
  }
}

/**
 * Checks safety dependencies before deactivating/deleting a room.
 */
async function validateRoomDeactivation(roomId) {
  const [allocations] = await db.pool.query(
    `SELECT COUNT(*) as cnt FROM student_allocations WHERE room_id = ? AND status = 'ACTIVE'`,
    [roomId]
  );
  const activeCount = allocations[0]?.cnt || 0;
  if (activeCount > 0) {
    const error = new Error(`Cannot deactivate room: ${activeCount} active allocations exist.`);
    error.status = 400;
    throw error;
  }

  const [occupiedBeds] = await db.pool.query(
    `SELECT COUNT(*) as cnt FROM beds WHERE room_id = ? AND status = 'OCCUPIED'`,
    [roomId]
  );
  const occupiedCount = occupiedBeds[0]?.cnt || 0;
  if (occupiedCount > 0) {
    const error = new Error(`Cannot deactivate room: ${occupiedCount} occupied beds exist.`);
    error.status = 400;
    throw error;
  }
}

/**
 * Checks safety dependencies before modifying/deactivating an occupied bed.
 */
async function validateBedModification(bedId, newStatus = null) {
  const [allocations] = await db.pool.query(
    `SELECT COUNT(*) as cnt FROM student_allocations WHERE bed_id = ? AND status = 'ACTIVE'`,
    [bedId]
  );
  const activeCount = allocations[0]?.cnt || 0;

  const [assignedStudent] = await db.pool.query(
    `SELECT id, full_name FROM students WHERE bed_id = ?`,
    [bedId]
  );

  const isOccupied = activeCount > 0 || assignedStudent.length > 0;

  if (isOccupied) {
    if (newStatus && (newStatus === 'AVAILABLE' || newStatus === 'INACTIVE')) {
      const error = new Error('Bed cannot be modified while occupied.');
      error.status = 400;
      throw error;
    }
  }
}

module.exports = {
  assertSuperAdmin,
  getMasterSummary,
  validateHostelDeactivation,
  validateFloorDeactivation,
  validateRoomDeactivation,
  validateBedModification,
  validateBedDeactivation: validateBedModification
};
