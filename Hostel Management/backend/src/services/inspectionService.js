const db = require('../config/db');
const activityService = require('./activityService');
const { validateLocationHierarchy } = require('./maintenanceService');

const VALID_CONDITION_STATUSES = ['GOOD', 'ATTENTION_REQUIRED', 'CRITICAL'];

/**
 * Creates a room inspection entry.
 */
async function createInspection(data, actor) {
  if (!actor) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  if (actor.role === 'STUDENT') {
    const err = new Error('Access denied. Students are not authorized to create room inspections.');
    err.status = 403;
    throw err;
  }

  const {
    hostel_id,
    floor_id,
    room_id,
    inspection_date = new Date().toISOString().split('T')[0],
    cleanliness_status = 'GOOD',
    electrical_status = 'GOOD',
    plumbing_status = 'GOOD',
    furniture_status = 'GOOD',
    bed_status = 'GOOD',
    safety_status = 'GOOD',
    remarks
  } = data;

  const hostelId = Number(hostel_id);
  const floorId = Number(floor_id);
  const roomId = Number(room_id);

  if (!hostelId || !floorId || !roomId) {
    const err = new Error('Hostel ID, Floor ID, and Room ID are required for room inspection.');
    err.status = 400;
    throw err;
  }

  if (actor.role === 'SUPERINTENDENT') {
    const assigned = actor.assignedHostels || [];
    if (!assigned.includes(hostelId)) {
      const err = new Error('Access denied. Hostel is outside your assigned scope.');
      err.status = 403;
      throw err;
    }
  }

  // Validate hierarchy relationship: room -> floor -> hostel
  try {
    await validateLocationHierarchy(hostelId, floorId, roomId, null);
  } catch (locErr) {
    const err = new Error(`Location validation failed: ${locErr.message}`);
    err.status = 400;
    throw err;
  }

  // Validate status fields
  const statuses = { cleanliness_status, electrical_status, plumbing_status, furniture_status, bed_status, safety_status };
  for (const [key, val] of Object.entries(statuses)) {
    if (!VALID_CONDITION_STATUSES.includes(val.toUpperCase())) {
      const err = new Error(`Invalid status '${val}' for ${key}. Expected: [GOOD, ATTENTION_REQUIRED, CRITICAL]`);
      err.status = 400;
      throw err;
    }
  }

  const [insertRes] = await db.pool.query(
    `INSERT INTO room_inspections
      (hostel_id, floor_id, room_id, inspected_by, inspection_date, cleanliness_status, electrical_status, plumbing_status, furniture_status, bed_status, safety_status, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      hostelId,
      floorId,
      roomId,
      actor.id,
      inspection_date,
      cleanliness_status.toUpperCase(),
      electrical_status.toUpperCase(),
      plumbing_status.toUpperCase(),
      furniture_status.toUpperCase(),
      bed_status.toUpperCase(),
      safety_status.toUpperCase(),
      remarks ? remarks.trim() : null
    ]
  );

  const inspectionId = insertRes.insertId;

  // Calculate overall condition
  const condList = Object.values(statuses).map(s => s.toUpperCase());
  const hasCritical = condList.includes('CRITICAL');
  const hasAttention = condList.includes('ATTENTION_REQUIRED');
  const overallCondition = hasCritical ? 'CRITICAL' : (hasAttention ? 'ATTENTION_REQUIRED' : 'GOOD');

  // Log activity
  await activityService.logActivity({
    actorId: actor.id,
    action: 'ROOM_INSPECTION_CREATED',
    module: 'OPERATIONS',
    entityType: 'INSPECTION',
    entityId: inspectionId,
    hostelId,
    description: `Created room inspection #${inspectionId} for Room #${roomId} (Overall: ${overallCondition})`,
    metadata: { inspectionId, hostelId, floorId, roomId, inspectionDate: inspection_date, overallCondition }
  });

  return getInspectionById(inspectionId, actor);
}

/**
 * Fetch a single inspection by ID.
 */
async function getInspectionById(id, actor) {
  if (!actor) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  if (actor.role === 'STUDENT') {
    const err = new Error('Students are not authorized to view internal inspection records.');
    err.status = 403;
    throw err;
  }

  const sql = `
    SELECT
      ri.*,
      h.name as hostel_name,
      h.code as hostel_code,
      f.floor_number,
      r.room_number,
      u.username as inspector_name
    FROM room_inspections ri
    JOIN hostels h ON ri.hostel_id = h.id
    JOIN floors f ON ri.floor_id = f.id
    JOIN rooms r ON ri.room_id = r.id
    JOIN users u ON ri.inspected_by = u.id
    WHERE ri.id = ?
  `;

  const [rows] = await db.pool.query(sql, [Number(id)]);
  if (rows.length === 0) {
    const err = new Error('Room inspection record not found.');
    err.status = 404;
    throw err;
  }

  const record = rows[0];

  if (actor.role === 'SUPERINTENDENT') {
    const assigned = actor.assignedHostels || [];
    if (!assigned.includes(record.hostel_id)) {
      const err = new Error('Access denied. Inspection is outside your assigned hostel scope.');
      err.status = 403;
      throw err;
    }
  }

  return record;
}

/**
 * Get room inspection history (chronological order).
 */
async function getRoomInspectionHistory(roomId, actor) {
  if (!actor) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  if (actor.role === 'STUDENT') {
    const err = new Error('Students are not authorized to view room inspection history.');
    err.status = 403;
    throw err;
  }

  // Room verification
  const [roomRows] = await db.pool.query(
    `SELECT r.id, r.room_number, f.hostel_id, h.name as hostel_name
     FROM rooms r
     JOIN floors f ON r.floor_id = f.id
     JOIN hostels h ON f.hostel_id = h.id
     WHERE r.id = ?`,
    [Number(roomId)]
  );

  if (roomRows.length === 0) {
    const err = new Error('Room not found.');
    err.status = 404;
    throw err;
  }

  const roomInfo = roomRows[0];

  if (actor.role === 'SUPERINTENDENT') {
    const assigned = actor.assignedHostels || [];
    if (!assigned.includes(roomInfo.hostel_id)) {
      const err = new Error('Access denied. Room is outside your assigned hostel scope.');
      err.status = 403;
      throw err;
    }
  }

  const [history] = await db.pool.query(
    `SELECT
      ri.*,
      u.username as inspector_name
     FROM room_inspections ri
     JOIN users u ON ri.inspected_by = u.id
     WHERE ri.room_id = ?
     ORDER BY ri.inspection_date DESC, ri.id DESC`,
    [Number(roomId)]
  );

  return {
    room: roomInfo,
    history
  };
}

/**
 * Fetch paginated list of inspections with role scoping and filters.
 */
async function getInspections(filters = {}, actor) {
  if (!actor) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  if (actor.role === 'STUDENT') {
    const err = new Error('Students are not authorized to view inspection logs.');
    err.status = 403;
    throw err;
  }

  const {
    page = 1,
    limit = 20,
    hostel_id: filterHostelId,
    floor_id: filterFloorId,
    room_id: filterRoomId,
    condition,
    search,
    date_from: dateFrom,
    date_to: dateTo
  } = filters;

  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  let whereClauses = [];
  let queryParams = [];

  if (actor.role === 'SUPERINTENDENT') {
    const assigned = actor.assignedHostels || [];
    if (assigned.length === 0) {
      return { inspections: [], total: 0, page: parsedPage, totalPages: 0 };
    }
    if (filterHostelId) {
      const hId = Number(filterHostelId);
      if (!assigned.includes(hId)) {
        const err = new Error('Access denied. Hostel is outside your authorized scope.');
        err.status = 403;
        throw err;
      }
      whereClauses.push('ri.hostel_id = ?');
      queryParams.push(hId);
    } else {
      whereClauses.push(`ri.hostel_id IN (${assigned.map(() => '?').join(',')})`);
      queryParams.push(...assigned);
    }
  } else if (actor.role === 'SUPER_ADMIN') {
    if (filterHostelId) {
      whereClauses.push('ri.hostel_id = ?');
      queryParams.push(Number(filterHostelId));
    }
  }

  if (filterFloorId) {
    whereClauses.push('ri.floor_id = ?');
    queryParams.push(Number(filterFloorId));
  }

  if (filterRoomId) {
    whereClauses.push('ri.room_id = ?');
    queryParams.push(Number(filterRoomId));
  }

  if (dateFrom) {
    whereClauses.push('ri.inspection_date >= ?');
    queryParams.push(dateFrom);
  }

  if (dateTo) {
    whereClauses.push('ri.inspection_date <= ?');
    queryParams.push(dateTo);
  }

  if (condition) {
    const condUpper = condition.toUpperCase();
    whereClauses.push(
      '(ri.cleanliness_status = ? OR ri.electrical_status = ? OR ri.plumbing_status = ? OR ri.furniture_status = ? OR ri.bed_status = ? OR ri.safety_status = ?)'
    );
    queryParams.push(condUpper, condUpper, condUpper, condUpper, condUpper, condUpper);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClauses.push('(h.name LIKE ? OR r.room_number LIKE ? OR u.username LIKE ? OR ri.remarks LIKE ?)');
    queryParams.push(term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) as total
    FROM room_inspections ri
    JOIN hostels h ON ri.hostel_id = h.id
    JOIN rooms r ON ri.room_id = r.id
    JOIN users u ON ri.inspected_by = u.id
    ${whereSql}
  `;

  const dataSql = `
    SELECT
      ri.*,
      h.name as hostel_name,
      h.code as hostel_code,
      f.floor_number,
      r.room_number,
      u.username as inspector_name
    FROM room_inspections ri
    JOIN hostels h ON ri.hostel_id = h.id
    JOIN floors f ON ri.floor_id = f.id
    JOIN rooms r ON ri.room_id = r.id
    JOIN users u ON ri.inspected_by = u.id
    ${whereSql}
    ORDER BY ri.inspection_date DESC, ri.id DESC
    LIMIT ? OFFSET ?
  `;

  const [countRows] = await db.pool.query(countSql, queryParams);
  const total = countRows[0] ? countRows[0].total : 0;
  const totalPages = Math.ceil(total / parsedLimit);

  const [inspections] = await db.pool.query(dataSql, [...queryParams, parsedLimit, offset]);

  return {
    inspections,
    total,
    page: parsedPage,
    totalPages
  };
}

module.exports = {
  createInspection,
  getInspectionById,
  getRoomInspectionHistory,
  getInspections
};
