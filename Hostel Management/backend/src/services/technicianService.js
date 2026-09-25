const db = require('../config/db');
const activityService = require('./activityService');

/**
 * Fetch all technicians with optional filters
 */
async function getTechnicians(filters = {}) {
  const { skill_category, status, hostel_id, search } = filters;
  const whereClauses = [];
  const params = [];

  if (skill_category) {
    whereClauses.push('t.skill_category = ?');
    params.push(skill_category);
  }

  if (status) {
    whereClauses.push('t.status = ?');
    params.push(status);
  }

  if (hostel_id) {
    whereClauses.push('(t.assigned_hostel_id = ? OR t.assigned_hostel_id IS NULL)');
    params.push(hostel_id);
  }

  if (search) {
    whereClauses.push('(t.full_name LIKE ? OR t.phone LIKE ? OR t.email LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      t.*,
      h.name as assigned_hostel_name,
      h.code as assigned_hostel_code,
      (SELECT COUNT(*) FROM maintenance_requests m WHERE m.technician_id = t.id AND m.status IN ('ASSIGNED', 'IN_PROGRESS')) as active_jobs_count
    FROM technicians t
    LEFT JOIN hostels h ON t.assigned_hostel_id = h.id
    ${whereSql}
    ORDER BY t.full_name ASC
  `;

  const [rows] = await db.pool.query(sql, params);
  return rows;
}

/**
 * Fetch single technician by ID
 */
async function getTechnicianById(id) {
  const sql = `
    SELECT 
      t.*,
      h.name as assigned_hostel_name,
      (SELECT COUNT(*) FROM maintenance_requests m WHERE m.technician_id = t.id AND m.status IN ('ASSIGNED', 'IN_PROGRESS')) as active_jobs_count
    FROM technicians t
    LEFT JOIN hostels h ON t.assigned_hostel_id = h.id
    WHERE t.id = ?
  `;

  const [rows] = await db.pool.query(sql, [id]);
  return rows[0] || null;
}

/**
 * Create new technician (Staff)
 */
async function createTechnician(user, data) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to register technicians.');
  }

  const { full_name, phone, email, skill_category = 'GENERAL', assigned_hostel_id = null, status = 'AVAILABLE', rating = 5.00 } = data;

  if (!full_name || !full_name.trim() || !phone || !phone.trim()) {
    throw new Error('Technician Full Name and Phone number are required.');
  }

  const [result] = await db.pool.query(
    `INSERT INTO technicians (full_name, phone, email, skill_category, assigned_hostel_id, status, rating)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [full_name.trim(), phone.trim(), email ? email.trim() : null, skill_category, assigned_hostel_id || null, status, rating]
  );

  await activityService.logActivity({
    actorId: user.id,
    action: 'CREATE_TECHNICIAN',
    module: 'MAINTENANCE',
    entityType: 'TECHNICIAN',
    entityId: result.insertId,
    description: `Registered technician ${full_name} (${skill_category})`
  });

  return getTechnicianById(result.insertId);
}

/**
 * Update technician (Staff)
 */
async function updateTechnician(user, id, data) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to edit technicians.');
  }

  const existing = await getTechnicianById(id);
  if (!existing) {
    throw new Error('Technician record not found.');
  }

  const { full_name, phone, email, skill_category, assigned_hostel_id, status, rating } = data;

  await db.pool.query(
    `UPDATE technicians
     SET full_name = ?, phone = ?, email = ?, skill_category = ?, assigned_hostel_id = ?, status = ?, rating = ?
     WHERE id = ?`,
    [
      full_name ? full_name.trim() : existing.full_name,
      phone ? phone.trim() : existing.phone,
      email !== undefined ? email : existing.email,
      skill_category || existing.skill_category,
      assigned_hostel_id !== undefined ? assigned_hostel_id : existing.assigned_hostel_id,
      status || existing.status,
      rating !== undefined ? rating : existing.rating,
      id
    ]
  );

  return getTechnicianById(id);
}

/**
 * Delete technician (Staff)
 */
async function deleteTechnician(user, id) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to delete technicians.');
  }

  const existing = await getTechnicianById(id);
  if (!existing) {
    throw new Error('Technician record not found.');
  }

  await db.pool.query('DELETE FROM technicians WHERE id = ?', [id]);
  return { success: true, message: `Technician ${existing.full_name} removed from directory.` };
}

module.exports = {
  getTechnicians,
  getTechnicianById,
  createTechnician,
  updateTechnician,
  deleteTechnician
};
