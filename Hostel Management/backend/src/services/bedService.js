const db = require('../config/db');
const authorization = require('../utils/authorization');
const masterService = require('./masterService');
const activityService = require('./activityService');

/**
 * Retrieves all beds based on filters, permissions, pagination, and search.
 */
const getAllBeds = async (filters, user) => {
  const { room_id, hostel_id, floor_id, status, search, page = 1, limit = 20 } = filters || {};
  const { id: userId, role } = user;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(2000, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT b.*, r.room_number, r.capacity as room_capacity, r.hostel_id, r.floor_id, h.name as hostel_name, IFNULL(f.floor_name, 'No Floor') as floor_name, f.floor_number,
           s.id as student_id, s.full_name as student_name, s.student_id as student_code, s.roll_number, s.branch, s.course,
           s.phone as student_phone, s.email as student_email, s.photo_url as student_photo, s.year as student_year,
           sa.id as allocation_id, sa.allocated_from
    FROM beds b
    JOIN rooms r ON b.room_id = r.id
    JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN floors f ON r.floor_id = f.id
    LEFT JOIN students s ON b.id = s.bed_id AND s.status = 'ACTIVE'
    LEFT JOIN student_allocations sa ON sa.bed_id = b.id AND sa.status = 'ACTIVE'
  `;
  let countQuery = `
    SELECT COUNT(*) as total 
    FROM beds b
    JOIN rooms r ON b.room_id = r.id
    JOIN hostels h ON r.hostel_id = h.id
    LEFT JOIN floors f ON r.floor_id = f.id
  `;
  let queryParams = [];
  let conditions = [];

  if (room_id) {
    conditions.push('b.room_id = ?');
    queryParams.push(room_id);
  } else if (floor_id) {
    conditions.push('r.floor_id = ?');
    queryParams.push(floor_id);
  } else if (hostel_id) {
    const hasAccess = await authorization.hasHostelAccess(user, hostel_id);
    if (!hasAccess) {
      const error = new Error('Forbidden: You do not have access to this hostel\'s beds.');
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
      const error = new Error('Forbidden: Students cannot access bed listings.');
      error.status = 403;
      throw error;
    }
  }

  if (status) {
    conditions.push('b.status = ?');
    queryParams.push(status);
  }

  if (search && search.trim()) {
    conditions.push('(b.bed_number LIKE ? OR r.room_number LIKE ? OR s.full_name LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  const whereSql = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  const [countRows] = await db.pool.query(countQuery + whereSql, queryParams);
  const totalItems = countRows[0]?.total || 0;
  const totalPages = Math.ceil(totalItems / limitNum);

  query += whereSql + ' ORDER BY r.hostel_id ASC, IFNULL(f.floor_number, 999) ASC, LENGTH(r.room_number) ASC, r.room_number ASC, LENGTH(b.bed_number) ASC, b.bed_number ASC LIMIT ? OFFSET ?';
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
 * Retrieves a single bed by ID.
 */
const getBedById = async (bedId, user) => {
  const hasAccess = await authorization.hasBedAccess(user, bedId);
  if (!hasAccess) {
    const error = new Error('Forbidden: You do not have access to this bed.');
    error.status = 403;
    throw error;
  }

  const [rows] = await db.pool.query(
    `SELECT b.*, r.room_number, r.hostel_id, r.floor_id, h.name as hostel_name, f.floor_name, s.id as student_id, s.full_name as student_name
     FROM beds b 
     JOIN rooms r ON b.room_id = r.id 
     JOIN hostels h ON r.hostel_id = h.id 
     JOIN floors f ON r.floor_id = f.id
     LEFT JOIN students s ON b.id = s.bed_id
     WHERE b.id = ?`,
    [bedId]
  );
  if (rows.length === 0) {
    const error = new Error('Bed not found.');
    error.status = 404;
    throw error;
  }
  return rows[0];
};

/**
 * Creates a new bed (Super Admin only).
 */
const createBed = async (bedData, user) => {
  masterService.assertSuperAdmin(user);

  const { room_id, bed_number, status } = bedData;

  if (!room_id) {
    const error = new Error('Room ID is required.');
    error.status = 400;
    throw error;
  }

  if (!bed_number || !bed_number.trim()) {
    const error = new Error('Bed number is required.');
    error.status = 400;
    throw error;
  }

  const targetStatus = status || 'AVAILABLE';
  if (!['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'].includes(targetStatus)) {
    const error = new Error('Invalid status specification.');
    error.status = 400;
    throw error;
  }

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [roomRow] = await connection.query(
      'SELECT capacity, room_number, hostel_id FROM rooms WHERE id = ? FOR UPDATE',
      [room_id]
    );

    if (roomRow.length === 0) {
      const error = new Error('Room not found.');
      error.status = 404;
      throw error;
    }

    const { capacity, room_number: roomNum, hostel_id: hostelId } = roomRow[0];

    const [countRow] = await connection.query(
      'SELECT COUNT(*) as count FROM beds WHERE room_id = ? FOR UPDATE',
      [room_id]
    );
    const existingBeds = countRow[0].count;

    if (existingBeds >= capacity) {
      const error = new Error(`Cannot add bed: Room ${roomNum} capacity limit of ${capacity} reached.`);
      error.status = 400;
      throw error;
    }

    const [duplicateBed] = await connection.query(
      'SELECT id FROM beds WHERE room_id = ? AND bed_number = ?',
      [room_id, bed_number.trim()]
    );
    if (duplicateBed.length > 0) {
      const error = new Error(`Bed number "${bed_number.trim()}" already exists in Room ${roomNum}.`);
      error.status = 400;
      throw error;
    }

    const [result] = await connection.query(
      'INSERT INTO beds (room_id, bed_number, status) VALUES (?, ?, ?)',
      [room_id, bed_number.trim(), targetStatus]
    );

    await connection.commit();

    const createdBed = { id: result.insertId, room_id, bed_number: bed_number.trim(), status: targetStatus };

    await activityService.logActivity({
      actorId: user.id,
      action: 'BED_CREATED',
      module: 'MASTER_DATA',
      entityType: 'BED',
      entityId: result.insertId,
      hostelId,
      description: `Created bed "${bed_number.trim()}" in Room ${roomNum}`,
      metadata: createdBed
    });

    return createdBed;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Updates an existing bed (Super Admin only).
 */
const updateBed = async (bedId, bedData, user) => {
  masterService.assertSuperAdmin(user);

  const { bed_number, status } = bedData;

  const currentBed = await getBedById(bedId, user);
  const roomId = currentBed.room_id;

  if (status && status !== currentBed.status) {
    await masterService.validateBedModification(bedId, status);
  }

  if (!bed_number || !bed_number.trim()) {
    const error = new Error('Bed number is required.');
    error.status = 400;
    throw error;
  }

  if (!['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'].includes(status)) {
    const error = new Error('Invalid status specification.');
    error.status = 400;
    throw error;
  }

  const [duplicateBed] = await db.pool.query(
    'SELECT id FROM beds WHERE room_id = ? AND bed_number = ? AND id != ?',
    [roomId, bed_number.trim(), bedId]
  );
  if (duplicateBed.length > 0) {
    const error = new Error(`Bed number "${bed_number.trim()}" already exists in this room.`);
    error.status = 400;
    throw error;
  }

  await db.pool.query(
    'UPDATE beds SET bed_number = ?, status = ? WHERE id = ?',
    [bed_number.trim(), status, bedId]
  );

  const action = status === 'INACTIVE' ? 'BED_DEACTIVATED' : 'BED_UPDATED';

  await activityService.logActivity({
    actorId: user.id,
    action,
    module: 'MASTER_DATA',
    entityType: 'BED',
    entityId: bedId,
    hostelId: currentBed.hostel_id,
    description: `Updated bed "${bed_number.trim()}" status to ${status}`,
    metadata: { id: bedId, room_id: roomId, bed_number: bed_number.trim(), status }
  });

  return { id: bedId, room_id: roomId, bed_number: bed_number.trim(), status };
};

/**
 * Safely deletes a bed (Super Admin only).
 */
const deleteBed = async (bedId, user) => {
  masterService.assertSuperAdmin(user);

  await masterService.validateBedModification(bedId, 'INACTIVE');

  const [studentRow] = await db.pool.query(
    'SELECT id, full_name FROM students WHERE bed_id = ? LIMIT 1',
    [bedId]
  );
  if (studentRow.length > 0) {
    const error = new Error(`Bed cannot be modified while occupied.`);
    error.status = 400;
    throw error;
  }

  const [result] = await db.pool.query('DELETE FROM beds WHERE id = ?', [bedId]);
  if (result.affectedRows === 0) {
    const error = new Error('Bed not found.');
    error.status = 404;
    throw error;
  }

  return { success: true };
};

module.exports = {
  getAllBeds,
  getBedById,
  createBed,
  updateBed,
  deleteBed
};

