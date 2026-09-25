const db = require('../config/db');

/**
 * Retrieves the list of hostel IDs assigned to a superintendent.
 * @param {number} userId - The user ID of the superintendent
 * @returns {Promise<number[]>} Array of assigned hostel IDs
 */
const getAssignedHostels = async (userId) => {
  const [rows] = await db.pool.query(
    'SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?',
    [userId]
  );
  return rows.map(r => r.hostel_id);
};

/**
 * Checks if the user has access to a specific hostel.
 * @param {object} user - Authenticated user object { id, role }
 * @param {number} hostelId - Hostel ID to check
 * @returns {Promise<boolean>} True if authorized
 */
const hasHostelAccess = async (user, hostelId) => {
  if (!user || !user.role) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  
  if (user.role === 'SUPERINTENDENT') {
    const assigned = await getAssignedHostels(user.id);
    return assigned.includes(Number(hostelId));
  }
  
  if (user.role === 'STUDENT') {
    // A student only has access if they are assigned to a bed in this hostel
    const [rows] = await db.pool.query(
      `SELECT s.id FROM students s
       JOIN beds b ON s.bed_id = b.id
       JOIN rooms r ON b.room_id = r.id
       WHERE s.user_id = ? AND r.hostel_id = ?`,
      [user.id, hostelId]
    );
    return rows.length > 0;
  }
  
  return false;
};

/**
 * Checks if the user has access to a specific student record.
 * @param {object} user - Authenticated user object { id, role }
 * @param {number} studentId - Primary key ID of the student
 * @returns {Promise<boolean>} True if authorized
 */
const hasStudentAccess = async (user, studentId) => {
  if (!user || !user.role) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  
  if (user.role === 'SUPERINTENDENT') {
    const assigned = await getAssignedHostels(user.id);
    if (assigned.length === 0) return false;
    
    // Find the hostel this student belongs to
    const [rows] = await db.pool.query(
      `SELECT r.hostel_id FROM students s
       JOIN beds b ON s.bed_id = b.id
       JOIN rooms r ON b.room_id = r.id
       WHERE s.id = ?`,
      [studentId]
    );
    
    if (rows.length === 0) return false;
    return assigned.includes(rows[0].hostel_id);
  }
  
  if (user.role === 'STUDENT') {
    const [rows] = await db.pool.query(
      'SELECT id FROM students WHERE user_id = ? AND id = ?',
      [user.id, studentId]
    );
    return rows.length > 0;
  }
  
  return false;
};

/**
 * Checks if the user has access to a specific room.
 * @param {object} user - Authenticated user object { id, role }
 * @param {number} roomId - Room ID to check
 * @returns {Promise<boolean>} True if authorized
 */
const hasRoomAccess = async (user, roomId) => {
  if (!user || !user.role) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  
  if (user.role === 'SUPERINTENDENT') {
    const assigned = await getAssignedHostels(user.id);
    if (assigned.length === 0) return false;
    
    const [rows] = await db.pool.query(
      'SELECT hostel_id FROM rooms WHERE id = ?',
      [roomId]
    );
    if (rows.length === 0) return false;
    return assigned.includes(rows[0].hostel_id);
  }
  
  return false; // Students cannot access room administration
};

/**
 * Checks if the user has access to a specific bed.
 * @param {object} user - Authenticated user object { id, role }
 * @param {number} bedId - Bed ID to check
 * @returns {Promise<boolean>} True if authorized
 */
const hasBedAccess = async (user, bedId) => {
  if (!user || !user.role) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  
  if (user.role === 'SUPERINTENDENT') {
    const assigned = await getAssignedHostels(user.id);
    if (assigned.length === 0) return false;
    
    const [rows] = await db.pool.query(
      `SELECT r.hostel_id FROM beds b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ?`,
      [bedId]
    );
    if (rows.length === 0) return false;
    return assigned.includes(rows[0].hostel_id);
  }
  
  return false; // Students cannot access bed administration
};

/**
 * Checks if the user has access to a specific floor.
 * @param {object} user - Authenticated user object { id, role }
 * @param {number} floorId - Floor ID to check
 * @returns {Promise<boolean>} True if authorized
 */
const hasFloorAccess = async (user, floorId) => {
  if (!user || !user.role) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  
  if (user.role === 'SUPERINTENDENT') {
    const assigned = await getAssignedHostels(user.id);
    if (assigned.length === 0) return false;
    
    const [rows] = await db.pool.query(
      'SELECT hostel_id FROM floors WHERE id = ?',
      [floorId]
    );
    if (rows.length === 0) return false;
    return assigned.includes(rows[0].hostel_id);
  }
  
  return false; // Students cannot access floor administration
};

module.exports = {
  getAssignedHostels,
  hasHostelAccess,
  hasStudentAccess,
  hasRoomAccess,
  hasBedAccess,
  hasFloorAccess
};
