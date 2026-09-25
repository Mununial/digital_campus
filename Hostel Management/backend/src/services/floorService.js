const db = require('../config/db');
const authorization = require('../utils/authorization');
const masterService = require('./masterService');
const activityService = require('./activityService');

/**
 * Retrieves all floors based on filters, permissions, pagination, and search.
 */
const getAllFloors = async (filters, user) => {
  const { hostel_id, page = 1, limit = 20, search, status } = filters || {};
  const { id: userId, role } = user;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT f.*, h.name as hostel_name,
           (SELECT COUNT(*) FROM rooms r WHERE r.floor_id = f.id) as total_rooms,
           (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.floor_id = f.id) as total_beds,
           (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.floor_id = f.id AND b.status = 'OCCUPIED') as occupied_beds
    FROM floors f 
    JOIN hostels h ON f.hostel_id = h.id
  `;
  let countQuery = 'SELECT COUNT(*) as total FROM floors f JOIN hostels h ON f.hostel_id = h.id';
  let queryParams = [];
  let whereClauses = [];

  if (hostel_id) {
    const hasAccess = await authorization.hasHostelAccess(user, hostel_id);
    if (!hasAccess) {
      const error = new Error('Forbidden: You do not have access to this hostel\'s floors.');
      error.status = 403;
      throw error;
    }
    whereClauses.push('f.hostel_id = ?');
    queryParams.push(hostel_id);
  } else {
    if (role === 'SUPERINTENDENT') {
      const assigned = user.assignedHostels || [];
      if (assigned.length === 0) return { data: [], pagination: { page: pageNum, limit: limitNum, totalPages: 0, totalItems: 0 } };
      whereClauses.push('f.hostel_id IN (?)');
      queryParams.push(assigned);
    } else if (role === 'STUDENT') {
      const error = new Error('Forbidden: Students cannot access floor listings.');
      error.status = 403;
      throw error;
    }
  }

  if (status) {
    whereClauses.push('f.status = ?');
    queryParams.push(status);
  }

  if (search && search.trim()) {
    whereClauses.push('(f.floor_name LIKE ? OR h.name LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    queryParams.push(searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

  const [countRows] = await db.pool.query(countQuery + whereSql, queryParams);
  const totalItems = countRows[0]?.total || 0;
  const totalPages = Math.ceil(totalItems / limitNum);

  query += whereSql + ' ORDER BY f.hostel_id ASC, f.floor_number ASC LIMIT ? OFFSET ?';
  const [rows] = await db.pool.query(query, [...queryParams, limitNum, offset]);

  return {
    data: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems
    }
  };
};

/**
 * Retrieves a single floor by ID.
 */
const getFloorById = async (floorId, user) => {
  const hasAccess = await authorization.hasFloorAccess(user, floorId);
  if (!hasAccess) {
    const error = new Error('Forbidden: You do not have access to this floor.');
    error.status = 403;
    throw error;
  }

  const [rows] = await db.pool.query(
    'SELECT f.*, h.name as hostel_name FROM floors f JOIN hostels h ON f.hostel_id = h.id WHERE f.id = ?',
    [floorId]
  );
  if (rows.length === 0) {
    const error = new Error('Floor not found.');
    error.status = 404;
    throw error;
  }
  return rows[0];
};

/**
 * Creates a new floor (Super Admin only).
 */
const createFloor = async (floorData, user) => {
  masterService.assertSuperAdmin(user);

  const hostelId = parseInt(floorData.hostel_id, 10);
  const { floor_name, floor_number, status = 'ACTIVE' } = floorData;

  if (!hostelId || isNaN(hostelId)) {
    const error = new Error('Hostel ID is required.');
    error.status = 400;
    throw error;
  }

  const [hostelRow] = await db.pool.query('SELECT id, name FROM hostels WHERE id = ?', [hostelId]);
  if (hostelRow.length === 0) {
    const error = new Error('Specified hostel does not exist.');
    error.status = 400;
    throw error;
  }

  if (!floor_name || !floor_name.trim()) {
    const error = new Error('Floor name is required.');
    error.status = 400;
    throw error;
  }

  if (floor_number === undefined || isNaN(parseInt(floor_number, 10))) {
    const error = new Error('Valid floor number is required.');
    error.status = 400;
    throw error;
  }

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    const error = new Error('Invalid status specification.');
    error.status = 400;
    throw error;
  }

  const [duplicateNumber] = await db.pool.query(
    'SELECT id FROM floors WHERE hostel_id = ? AND floor_number = ?',
    [hostelId, parseInt(floor_number, 10)]
  );
  if (duplicateNumber.length > 0) {
    const error = new Error(`Floor number ${floor_number} already exists in this hostel.`);
    error.status = 400;
    throw error;
  }

  const [duplicateName] = await db.pool.query(
    'SELECT id FROM floors WHERE hostel_id = ? AND floor_name = ?',
    [hostelId, floor_name.trim()]
  );
  if (duplicateName.length > 0) {
    const error = new Error(`Floor name "${floor_name}" already exists in this hostel.`);
    error.status = 400;
    throw error;
  }

  const [result] = await db.pool.query(
    'INSERT INTO floors (hostel_id, floor_name, floor_number, status) VALUES (?, ?, ?, ?)',
    [hostelId, floor_name.trim(), parseInt(floor_number, 10), status]
  );

  const createdFloor = { id: result.insertId, hostel_id: hostelId, floor_name: floor_name.trim(), floor_number: parseInt(floor_number, 10), status };

  await activityService.logActivity({
    actorId: user.id,
    action: 'FLOOR_CREATED',
    module: 'MASTER_DATA',
    entityType: 'FLOOR',
    entityId: result.insertId,
    hostelId: hostelId,
    description: `Created floor "${floor_name.trim()}" in ${hostelRow[0].name}`,
    metadata: createdFloor
  });

  return createdFloor;
};

/**
 * Updates an existing floor (Super Admin only).
 */
const updateFloor = async (floorId, floorData, user) => {
  masterService.assertSuperAdmin(user);

  const { floor_name, floor_number, status } = floorData;

  const currentFloor = await getFloorById(floorId, user);
  const hostel_id = currentFloor.hostel_id;

  if (status === 'INACTIVE' && currentFloor.status === 'ACTIVE') {
    await masterService.validateFloorDeactivation(floorId);
  }

  if (!floor_name || !floor_name.trim()) {
    const error = new Error('Floor name is required.');
    error.status = 400;
    throw error;
  }

  if (floor_number === undefined || isNaN(parseInt(floor_number, 10))) {
    const error = new Error('Valid floor number is required.');
    error.status = 400;
    throw error;
  }

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    const error = new Error('Invalid status specification.');
    error.status = 400;
    throw error;
  }

  const [duplicateNumber] = await db.pool.query(
    'SELECT id FROM floors WHERE hostel_id = ? AND floor_number = ? AND id != ?',
    [hostel_id, floor_number, floorId]
  );
  if (duplicateNumber.length > 0) {
    const error = new Error(`Floor number ${floor_number} already exists in this hostel.`);
    error.status = 400;
    throw error;
  }

  const [duplicateName] = await db.pool.query(
    'SELECT id FROM floors WHERE hostel_id = ? AND floor_name = ? AND id != ?',
    [hostel_id, floor_name.trim(), floorId]
  );
  if (duplicateName.length > 0) {
    const error = new Error(`Floor name "${floor_name}" already exists in this hostel.`);
    error.status = 400;
    throw error;
  }

  await db.pool.query(
    'UPDATE floors SET floor_name = ?, floor_number = ?, status = ? WHERE id = ?',
    [floor_name.trim(), parseInt(floor_number, 10), status, floorId]
  );

  const action = status === 'INACTIVE' ? 'FLOOR_DEACTIVATED' : 'FLOOR_UPDATED';

  await activityService.logActivity({
    actorId: user.id,
    action,
    module: 'MASTER_DATA',
    entityType: 'FLOOR',
    entityId: floorId,
    hostelId: hostel_id,
    description: `Updated floor "${floor_name.trim()}" status to ${status}`,
    metadata: { id: floorId, hostel_id, floor_name: floor_name.trim(), floor_number, status }
  });

  return { id: floorId, hostel_id, floor_name: floor_name.trim(), floor_number: parseInt(floor_number, 10), status };
};

/**
 * Safely deletes a floor (Super Admin only).
 */
const deleteFloor = async (floorId, user) => {
  masterService.assertSuperAdmin(user);

  const currentFloor = await getFloorById(floorId, user);

  await masterService.validateFloorDeactivation(floorId);

  const [rooms] = await db.pool.query('SELECT id FROM rooms WHERE floor_id = ? LIMIT 1', [floorId]);
  if (rooms.length > 0) {
    const error = new Error('Cannot delete floor: It has active rooms configured. Remove rooms first.');
    error.status = 400;
    throw error;
  }

  const [result] = await db.pool.query('DELETE FROM floors WHERE id = ?', [floorId]);
  if (result.affectedRows === 0) {
    const error = new Error('Floor not found.');
    error.status = 404;
    throw error;
  }

  await activityService.logActivity({
    actorId: user.id,
    action: 'FLOOR_DELETED',
    module: 'MASTER_DATA',
    entityType: 'FLOOR',
    entityId: floorId,
    hostelId: currentFloor.hostel_id,
    description: `Deleted floor "${currentFloor.floor_name}" (Floor #${currentFloor.floor_number})`,
    metadata: { id: floorId, floor_name: currentFloor.floor_name, floor_number: currentFloor.floor_number, hostel_id: currentFloor.hostel_id }
  });

  return { success: true };
};

module.exports = {
  getAllFloors,
  getFloorById,
  createFloor,
  updateFloor,
  deleteFloor
};

