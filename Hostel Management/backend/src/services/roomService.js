const db = require('../config/db');
const authorization = require('../utils/authorization');
const masterService = require('./masterService');
const activityService = require('./activityService');

/**
 * Retrieves all rooms based on filters, permissions, pagination, and search.
 */
const getAllRooms = async (filters, user) => {
  const { hostel_id, floor_id, search, status, page = 1, limit = 20 } = filters || {};
  const { id: userId, role } = user;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT r.*, h.name as hostel_name, IFNULL(f.floor_name, 'No Floor') as floor_name, f.floor_number,
           (SELECT COUNT(*) FROM beds b WHERE b.room_id = r.id) as total_beds,
           (SELECT COUNT(*) FROM beds b WHERE b.room_id = r.id AND (b.status = 'OCCUPIED' OR b.id IN (SELECT bed_id FROM students WHERE status = 'ACTIVE' AND bed_id IS NOT NULL))) as occupied_beds,
           (SELECT COUNT(*) FROM beds b WHERE b.room_id = r.id AND b.status = 'AVAILABLE' AND b.id NOT IN (SELECT bed_id FROM students WHERE status = 'ACTIVE' AND bed_id IS NOT NULL)) as available_beds
    FROM rooms r
    JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN floors f ON r.floor_id = f.id
  `;
  let countQuery = `
    SELECT COUNT(*) as total
    FROM rooms r
    JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN floors f ON r.floor_id = f.id
  `;
  let queryParams = [];
  let conditions = [];

  if (hostel_id) {
    const hasAccess = await authorization.hasHostelAccess(user, hostel_id);
    if (!hasAccess) {
      const error = new Error('Forbidden: You do not have access to this hostel\'s rooms.');
      error.status = 403;
      throw error;
    }
    conditions.push('r.hostel_id = ?');
    queryParams.push(hostel_id);
  } else {
    if (role === 'SUPERINTENDENT') {
      const assigned = user.assignedHostels || [];
      if (assigned.length === 0) return { data: [], pagination: { page: pageNum, limit: limitNum, totalPages: 0, totalItems: 0 } };
      conditions.push('r.hostel_id IN (?)');
      queryParams.push(assigned);
    } else if (role === 'STUDENT') {
      const error = new Error('Forbidden: Students cannot access room listings.');
      error.status = 403;
      throw error;
    }
  }

  if (floor_id) {
    conditions.push('r.floor_id = ?');
    queryParams.push(floor_id);
  }

  if (status) {
    conditions.push('r.status = ?');
    queryParams.push(status);
  }

  if (search && search.trim()) {
    conditions.push('(r.room_number LIKE ? OR f.floor_name LIKE ? OR h.name LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  const whereSql = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  const [countRows] = await db.pool.query(countQuery + whereSql, queryParams);
  const totalItems = countRows[0]?.total || 0;
  const totalPages = Math.ceil(totalItems / limitNum);

  query += whereSql + ' ORDER BY r.hostel_id ASC, IFNULL(f.floor_number, 999) ASC, LENGTH(r.room_number) ASC, r.room_number ASC LIMIT ? OFFSET ?';
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
 * Retrieves a single room by ID.
 */
const getRoomById = async (roomId, user) => {
  const hasAccess = await authorization.hasRoomAccess(user, roomId);
  if (!hasAccess) {
    const error = new Error('Forbidden: You do not have access to this room.');
    error.status = 403;
    throw error;
  }

  const [rows] = await db.pool.query(
    `SELECT r.*, h.name as hostel_name, IFNULL(f.floor_name, 'No Floor') as floor_name 
     FROM rooms r 
     JOIN hostels h ON r.hostel_id = h.id 
     LEFT JOIN floors f ON r.floor_id = f.id 
     WHERE r.id = ?`,
    [roomId]
  );
  if (rows.length === 0) {
    const error = new Error('Room not found.');
    error.status = 404;
    throw error;
  }
  return rows[0];
};

/**
 * Creates a new room (Super Admin only).
 */
const createRoom = async (roomData, user) => {
  masterService.assertSuperAdmin(user);

  let { hostel_id, floor_id, room_number, capacity, status = 'ACTIVE' } = roomData;

  if (!hostel_id) {
    const error = new Error('Hostel ID is required.');
    error.status = 400;
    throw error;
  }

  const cleanFloorId = floor_id ? parseInt(floor_id, 10) : null;

  if (cleanFloorId) {
    const [floorRow] = await db.pool.query(
      'SELECT hostel_id FROM floors WHERE id = ?',
      [cleanFloorId]
    );
    if (floorRow.length === 0) {
      const error = new Error('Selected floor does not exist.');
      error.status = 400;
      throw error;
    }
    if (parseInt(floorRow[0].hostel_id, 10) !== parseInt(hostel_id, 10)) {
      const error = new Error('Selected floor does not belong to the selected hostel.');
      error.status = 400;
      throw error;
    }
  }

  if (!room_number || !room_number.trim()) {
    const error = new Error('Room number is required.');
    error.status = 400;
    throw error;
  }

  const parsedCapacity = parseInt(capacity, 10);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    const error = new Error('Capacity must be a positive integer.');
    error.status = 400;
    throw error;
  }

  if (!['ACTIVE', 'INACTIVE', 'MAINTENANCE'].includes(status)) {
    const error = new Error('Invalid status specification.');
    error.status = 400;
    throw error;
  }

  const duplicateSql = cleanFloorId 
    ? 'SELECT id FROM rooms WHERE hostel_id = ? AND floor_id = ? AND room_number = ?'
    : 'SELECT id FROM rooms WHERE hostel_id = ? AND floor_id IS NULL AND room_number = ?';
  const duplicateParams = cleanFloorId 
    ? [hostel_id, cleanFloorId, room_number.trim()] 
    : [hostel_id, room_number.trim()];

  const [duplicateRoom] = await db.pool.query(duplicateSql, duplicateParams);
  if (duplicateRoom.length > 0) {
    const error = new Error(`Room number "${room_number}" already exists in this hostel/floor.`);
    error.status = 400;
    throw error;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO rooms (hostel_id, floor_id, room_number, capacity, status) VALUES (?, ?, ?, ?, ?)',
      [hostel_id, cleanFloorId, room_number.trim(), parsedCapacity, status]
    );

    const newRoomId = result.insertId;

    // Automatically create beds according to capacity (e.g. '1', '2', '3'...)
    for (let i = 1; i <= parsedCapacity; i++) {
      const bedNumber = `${i}`;
      await connection.query(
        'INSERT INTO beds (room_id, bed_number, status) VALUES (?, ?, ?)',
        [newRoomId, bedNumber, 'AVAILABLE']
      );
    }

    const createdRoom = { 
      id: newRoomId, 
      hostel_id, 
      floor_id: cleanFloorId, 
      room_number: room_number.trim(), 
      capacity: parsedCapacity, 
      status,
      beds_created: parsedCapacity
    };

    await activityService.logActivity({
      actorId: user.id,
      action: 'ROOM_CREATED',
      module: 'MASTER_DATA',
      entityType: 'ROOM',
      entityId: newRoomId,
      hostelId: hostel_id,
      description: `Created room "${room_number.trim()}" with ${parsedCapacity} auto-generated beds`,
      metadata: createdRoom
    }, connection);

    await connection.commit();
    connection.release();

    return createdRoom;
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
};

/**
 * Updates an existing room (Super Admin only).
 */
const updateRoom = async (roomId, roomData, user) => {
  masterService.assertSuperAdmin(user);

  const { hostel_id, floor_id, room_number, capacity, status } = roomData;

  const currentRoom = await getRoomById(roomId, user);
  const targetHostelId = hostel_id ? parseInt(hostel_id, 10) : currentRoom.hostel_id;
  const targetFloorId = (floor_id !== undefined && floor_id !== null && floor_id !== '') 
    ? parseInt(floor_id, 10) 
    : (floor_id === '' || floor_id === null ? null : currentRoom.floor_id);

  if (status === 'INACTIVE') {
    await masterService.validateRoomDeactivation(roomId);
  }

  if (targetFloorId) {
    const [floorRow] = await db.pool.query(
      'SELECT hostel_id FROM floors WHERE id = ?',
      [targetFloorId]
    );
    if (floorRow.length === 0) {
      const error = new Error('Selected floor does not exist.');
      error.status = 400;
      throw error;
    }
    if (parseInt(floorRow[0].hostel_id, 10) !== parseInt(targetHostelId, 10)) {
      const error = new Error('Selected floor does not belong to the selected hostel.');
      error.status = 400;
      throw error;
    }
  }

  if (!room_number || !room_number.trim()) {
    const error = new Error('Room number is required.');
    error.status = 400;
    throw error;
  }

  const parsedCapacity = parseInt(capacity, 10);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    const error = new Error('Capacity must be a positive integer.');
    error.status = 400;
    throw error;
  }

  if (!['ACTIVE', 'INACTIVE', 'MAINTENANCE'].includes(status)) {
    const error = new Error('Invalid status specification.');
    error.status = 400;
    throw error;
  }

  const duplicateSql = targetFloorId 
    ? 'SELECT id FROM rooms WHERE hostel_id = ? AND floor_id = ? AND room_number = ? AND id != ?'
    : 'SELECT id FROM rooms WHERE hostel_id = ? AND floor_id IS NULL AND room_number = ? AND id != ?';
  const duplicateParams = targetFloorId 
    ? [targetHostelId, targetFloorId, room_number.trim(), roomId]
    : [targetHostelId, room_number.trim(), roomId];

  const [duplicateRoom] = await db.pool.query(duplicateSql, duplicateParams);
  if (duplicateRoom.length > 0) {
    const error = new Error(`Room number "${room_number}" already exists in this hostel/floor.`);
    error.status = 400;
    throw error;
  }

  const [existingBeds] = await db.pool.query(
    'SELECT id, bed_number FROM beds WHERE room_id = ? ORDER BY id ASC',
    [roomId]
  );
  const existingBedsCount = existingBeds.length;
  if (parsedCapacity < existingBedsCount) {
    const error = new Error(`Cannot decrease capacity to ${parsedCapacity}: There are already ${existingBedsCount} beds configured in this room.`);
    error.status = 400;
    throw error;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      'UPDATE rooms SET hostel_id = ?, floor_id = ?, room_number = ?, capacity = ?, status = ? WHERE id = ?',
      [targetHostelId, targetFloorId, room_number.trim(), parsedCapacity, status, roomId]
    );

    // If capacity was increased, automatically create additional beds ('1', '2', '3'...)
    if (parsedCapacity > existingBedsCount) {
      const needed = parsedCapacity - existingBedsCount;
      for (let i = 1; i <= needed; i++) {
        const nextBedNum = `${existingBedsCount + i}`;
        await connection.query(
          'INSERT INTO beds (room_id, bed_number, status) VALUES (?, ?, ?)',
          [roomId, nextBedNum, 'AVAILABLE']
        );
      }
    }

    const action = status === 'INACTIVE' ? 'ROOM_DEACTIVATED' : 'ROOM_UPDATED';

    await activityService.logActivity({
      actorId: user.id,
      action,
      module: 'MASTER_DATA',
      entityType: 'ROOM',
      entityId: roomId,
      hostelId: targetHostelId,
      description: `Updated room "${room_number.trim()}" (Capacity: ${parsedCapacity})`,
      metadata: { id: roomId, hostel_id: targetHostelId, floor_id: targetFloorId, room_number: room_number.trim(), capacity: parsedCapacity, status }
    }, connection);

    await connection.commit();
    connection.release();

    return { id: roomId, hostel_id: targetHostelId, floor_id: targetFloorId, room_number: room_number.trim(), capacity: parsedCapacity, status };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
};

/**
 * Safely deletes a room (Super Admin only).
 */
const deleteRoom = async (roomId, user) => {
  masterService.assertSuperAdmin(user);

  await masterService.validateRoomDeactivation(roomId);

  // Check if any beds in this room are occupied by active students
  const [occupiedBeds] = await db.pool.query(
    `SELECT b.id FROM beds b 
     JOIN students s ON s.bed_id = b.id AND s.status = 'ACTIVE'
     WHERE b.room_id = ? LIMIT 1`,
    [roomId]
  );
  if (occupiedBeds.length > 0) {
    const error = new Error('Cannot delete room: It contains beds currently occupied by active students. Please reallocate students first.');
    error.status = 400;
    throw error;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM beds WHERE room_id = ?', [roomId]);
    const [result] = await connection.query('DELETE FROM rooms WHERE id = ?', [roomId]);
    if (result.affectedRows === 0) {
      const error = new Error('Room not found.');
      error.status = 404;
      throw error;
    }
    await connection.commit();
    connection.release();

    return { success: true };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
};

