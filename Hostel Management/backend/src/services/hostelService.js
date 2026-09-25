const db = require('../config/db');
const authorization = require('../utils/authorization');
const masterService = require('./masterService');
const activityService = require('./activityService');

/**
 * Retrieves all hostels based on user's authorization, pagination, and search.
 */
const getAllHostels = async (filters, user) => {
  const { page = 1, limit = 20, search, status } = filters || {};
  const { id: userId, role } = user;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const statsFields = `
    (SELECT COUNT(*) FROM floors f WHERE f.hostel_id = h.id) as total_floors,
    (SELECT COUNT(*) FROM rooms r WHERE r.hostel_id = h.id) as total_rooms,
    (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.hostel_id = h.id) as total_beds,
    (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.hostel_id = h.id AND b.status = 'AVAILABLE' AND b.id NOT IN (SELECT bed_id FROM students WHERE status = 'ACTIVE' AND bed_id IS NOT NULL)) as available_beds,
    (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.hostel_id = h.id AND (b.status = 'OCCUPIED' OR b.id IN (SELECT bed_id FROM students WHERE status = 'ACTIVE' AND bed_id IS NOT NULL))) as occupied_beds,
    (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.hostel_id = h.id AND b.status = 'MAINTENANCE') as maintenance_beds
  `;

  let whereClauses = [];
  let queryParams = [];

  if (role === 'SUPER_ADMIN') {
    // All hostels
  } else if (role === 'SUPERINTENDENT') {
    const assigned = user.assignedHostels || [];
    if (assigned.length === 0) return { data: [], pagination: { page: pageNum, limit: limitNum, totalPages: 0, totalItems: 0 } };
    whereClauses.push('h.id IN (?)');
    queryParams.push(assigned);
  } else if (role === 'STUDENT') {
    // Gender-based filtering: Female students ONLY see Girls' hostels; Male students ONLY see Boys' hostels
    let studentGender = user.gender;
    if (!studentGender) {
      try {
        const [uRows] = await db.pool.query('SELECT u.gender, s.gender as student_gender FROM users u LEFT JOIN students s ON s.user_id = u.id WHERE u.id = ?', [userId]);
        if (uRows && uRows.length > 0) {
          studentGender = uRows[0].gender || uRows[0].student_gender;
        }
      } catch (e) {}
    }
    const norm = String(studentGender || '').toUpperCase();
    if (norm.startsWith('F') || norm.includes('GIRL') || norm.includes('WOMAN')) {
      whereClauses.push('(h.gender = "FEMALE" OR h.gender = "GIRLS")');
    } else if (norm.startsWith('M') || norm.includes('BOY') || norm.includes('MAN')) {
      whereClauses.push('(h.gender = "MALE" OR h.gender = "BOYS")');
    }
  } else {
    throw new Error('Forbidden: Unknown user role.');
  }

  if (status) {
    whereClauses.push('h.status = ?');
    queryParams.push(status);
  }

  if (search && search.trim()) {
    whereClauses.push('(h.name LIKE ? OR h.code LIKE ? OR h.location LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const [countRows] = await db.pool.query(
    `SELECT COUNT(*) as total FROM hostels h ${whereSql}`,
    queryParams
  );
  const totalItems = countRows[0]?.total || 0;
  const totalPages = Math.ceil(totalItems / limitNum);

  const query = `SELECT h.id, h.name, h.code, h.gender, h.location, h.status, ${statsFields} 
                 FROM hostels h ${whereSql} ORDER BY h.id ASC LIMIT ? OFFSET ?`;
  
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
 * Retrieves a single hostel by ID.
 */
const getHostelById = async (hostelId, user) => {
  const hasAccess = await authorization.hasHostelAccess(user, hostelId);
  if (!hasAccess) {
    const error = new Error('Forbidden: You do not have access to this hostel.');
    error.status = 403;
    throw error;
  }

  const [rows] = await db.pool.query(
    'SELECT id, name, code, gender, location, status FROM hostels WHERE id = ?',
    [hostelId]
  );
  if (rows.length === 0) {
    const error = new Error('Hostel not found.');
    error.status = 404;
    throw error;
  }
  return rows[0];
};

/**
 * Creates a new hostel (Super Admin only).
 */
const createHostel = async (hostelData, user) => {
  masterService.assertSuperAdmin(user);

  let { name, code, gender, type, location, status = 'ACTIVE' } = hostelData;

  if (!gender && type) {
    gender = type === 'BOYS' ? 'MALE' : type === 'GIRLS' ? 'FEMALE' : 'COED';
  }

  if (!name || !name.trim()) {
    const error = new Error('Hostel name is required.');
    error.status = 400;
    throw error;
  }
  if (!code || !code.trim()) {
    const error = new Error('Hostel code is required.');
    error.status = 400;
    throw error;
  }
  if (!['MALE', 'FEMALE', 'COED'].includes(gender)) {
    const error = new Error('Invalid gender specification.');
    error.status = 400;
    throw error;
  }
  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    const error = new Error('Invalid status specification.');
    error.status = 400;
    throw error;
  }

  const [existingName] = await db.pool.query('SELECT id FROM hostels WHERE name = ?', [name.trim()]);
  if (existingName.length > 0) {
    const error = new Error(`Hostel name "${name.trim()}" already exists.`);
    error.status = 400;
    throw error;
  }

  const [existingCode] = await db.pool.query('SELECT id FROM hostels WHERE code = ?', [code.trim()]);
  if (existingCode.length > 0) {
    const error = new Error(`Hostel code "${code.trim()}" already exists.`);
    error.status = 400;
    throw error;
  }

  const [result] = await db.pool.query(
    'INSERT INTO hostels (name, code, gender, location, status) VALUES (?, ?, ?, ?, ?)',
    [name.trim(), code.trim(), gender, location || '', status]
  );

  const hostelId = result.insertId;
  const createdHostel = { id: hostelId, name: name.trim(), code: code.trim(), gender, location: location || '', status };

  await activityService.logActivity({
    actorId: user.id,
    action: 'HOSTEL_CREATED',
    module: 'MASTER_DATA',
    entityType: 'HOSTEL',
    entityId: result.insertId,
    hostelId: result.insertId,
    description: `Created hostel "${name.trim()}" (${code.trim()})`,
    metadata: createdHostel
  });

  return createdHostel;
};

/**
 * Updates an existing hostel (Super Admin only).
 */
const updateHostel = async (hostelId, hostelData, user) => {
  masterService.assertSuperAdmin(user);

  let { name, code, gender, type, location, status } = hostelData;

  const current = await getHostelById(hostelId, user);

  if (!gender && type) {
    gender = type === 'BOYS' ? 'MALE' : type === 'GIRLS' ? 'FEMALE' : 'COED';
  }

  if (status === 'INACTIVE' && current.status === 'ACTIVE') {
    await masterService.validateHostelDeactivation(hostelId);
  }

  if (!name || !name.trim()) {
    const error = new Error('Hostel name is required.');
    error.status = 400;
    throw error;
  }
  if (!code || !code.trim()) {
    const error = new Error('Hostel code is required.');
    error.status = 400;
    throw error;
  }
  if (!['MALE', 'FEMALE', 'COED'].includes(gender)) {
    const error = new Error('Invalid gender specification.');
    error.status = 400;
    throw error;
  }
  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    const error = new Error('Invalid status specification.');
    error.status = 400;
    throw error;
  }

  const [existingName] = await db.pool.query(
    'SELECT id FROM hostels WHERE name = ? AND id != ?',
    [name.trim(), hostelId]
  );
  if (existingName.length > 0) {
    const error = new Error(`Hostel name "${name.trim()}" already exists.`);
    error.status = 400;
    throw error;
  }

  const [existingCode] = await db.pool.query(
    'SELECT id FROM hostels WHERE code = ? AND id != ?',
    [code.trim(), hostelId]
  );
  if (existingCode.length > 0) {
    const error = new Error(`Hostel code "${code.trim()}" already exists.`);
    error.status = 400;
    throw error;
  }

  const [result] = await db.pool.query(
    'UPDATE hostels SET name = ?, code = ?, gender = ?, location = ?, status = ? WHERE id = ?',
    [name.trim(), code.trim(), gender, location || '', status, hostelId]
  );

  if (result.affectedRows === 0) {
    const error = new Error('Hostel not found.');
    error.status = 404;
    throw error;
  }

  const action = status === 'INACTIVE' ? 'HOSTEL_DEACTIVATED' : (current.status === 'INACTIVE' && status === 'ACTIVE' ? 'HOSTEL_ACTIVATED' : 'HOSTEL_UPDATED');

  await activityService.logActivity({
    actorId: user.id,
    action,
    module: 'MASTER_DATA',
    entityType: 'HOSTEL',
    entityId: hostelId,
    hostelId: hostelId,
    description: `Updated hostel "${name.trim()}" status to ${status}`,
    metadata: { id: hostelId, name: name.trim(), code: code.trim(), status }
  });

  return { id: hostelId, name: name.trim(), code: code.trim(), gender, location, status };
};

/**
 * Safely deletes a hostel (Super Admin only).
 */
const deleteHostel = async (hostelId, user) => {
  masterService.assertSuperAdmin(user);

  await masterService.validateHostelDeactivation(hostelId);

  const [floors] = await db.pool.query('SELECT id FROM floors WHERE hostel_id = ? LIMIT 1', [hostelId]);
  if (floors.length > 0) {
    const error = new Error('Cannot delete hostel: It has active floors configured. Remove dependent floors first.');
    error.status = 400;
    throw error;
  }

  const [result] = await db.pool.query('DELETE FROM hostels WHERE id = ?', [hostelId]);
  if (result.affectedRows === 0) {
    const error = new Error('Hostel not found.');
    error.status = 404;
    throw error;
  }

  return { success: true };
};

/**
 * Retrieves summary statistics for a hostel.
 */
const getHostelSummary = async (hostelId, user) => {
  const hostel = await getHostelById(hostelId, user);

  const query = `
    SELECT 
      (SELECT COUNT(*) FROM floors WHERE hostel_id = ?) as total_floors,
      (SELECT COUNT(*) FROM rooms WHERE hostel_id = ?) as total_rooms,
      (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.hostel_id = ?) as total_beds,
      (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.hostel_id = ? AND b.status = 'AVAILABLE') as available_beds,
      (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.hostel_id = ? AND b.status = 'OCCUPIED') as occupied_beds,
      (SELECT COUNT(*) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.hostel_id = ? AND b.status = 'MAINTENANCE') as maintenance_beds
  `;

  const [rows] = await db.pool.query(query, [
    hostelId, hostelId, hostelId, hostelId, hostelId, hostelId
  ]);

  const stats = rows[0];

  return {
    hostel: {
      id: hostel.id,
      name: hostel.name,
      code: hostel.code,
      gender: hostel.gender,
      location: hostel.location,
      status: hostel.status
    },
    statistics: {
      floors: stats.total_floors || 0,
      rooms: stats.total_rooms || 0,
      beds: stats.total_beds || 0,
      availableBeds: stats.available_beds || 0,
      occupiedBeds: stats.occupied_beds || 0,
      maintenanceBeds: stats.maintenance_beds || 0
    }
  };
};

module.exports = {
  getAllHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
  getHostelSummary
};

