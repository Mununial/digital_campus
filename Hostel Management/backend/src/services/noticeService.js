const db = require('../config/db');
const { getAssignedHostels } = require('../utils/authorization');
const activityService = require('./activityService');

/**
 * Get student's assigned hostel ID via active room/bed assignment.
 */
async function getStudentHostelId(userId) {
  const sql = `
    SELECT r.hostel_id
    FROM students s
    JOIN beds b ON s.bed_id = b.id
    JOIN rooms r ON b.room_id = r.id
    WHERE s.user_id = ? AND s.status = 'ACTIVE'
    LIMIT 1
  `;
  const [rows] = await db.pool.query(sql, [userId]);
  return rows.length > 0 ? rows[0].hostel_id : null;
}

/**
 * Retrieve paginated and filtered notices according to user role and hostel scope.
 */
async function getNotices(params, user) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const { status, priority, hostelId, readState, search } = params;

  let whereClauses = [];
  let queryParams = [];

  // ── Role-based Scope Filtering ────────────────────────────────────────────
  if (user.role === 'STUDENT') {
    // Students only see published, non-expired notices for all hostels or their assigned hostel
    const studentHostelId = await getStudentHostelId(user.id);
    whereClauses.push(`n.status = 'PUBLISHED'`);
    whereClauses.push(`(n.expires_at IS NULL OR n.expires_at > NOW())`);

    if (studentHostelId) {
      whereClauses.push(`(n.hostel_id IS NULL OR n.hostel_id = ?)`);
      queryParams.push(studentHostelId);
    } else {
      whereClauses.push(`n.hostel_id IS NULL`);
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostelIds = await getAssignedHostels(user.id);
    if (assignedHostelIds.length > 0) {
      const ph = assignedHostelIds.map(() => '?').join(',');
      whereClauses.push(`(n.hostel_id IS NULL OR n.hostel_id IN (${ph}))`);
      queryParams.push(...assignedHostelIds);
    } else {
      whereClauses.push(`n.hostel_id IS NULL`);
    }

    if (status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status.toUpperCase())) {
      whereClauses.push(`n.status = ?`);
      queryParams.push(status.toUpperCase());
    }
  } else if (user.role === 'SUPER_ADMIN') {
    if (status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status.toUpperCase())) {
      whereClauses.push(`n.status = ?`);
      queryParams.push(status.toUpperCase());
    }
  }

  // ── Additional Filters ───────────────────────────────────────────────────
  if (priority && ['GENERAL', 'IMPORTANT', 'URGENT'].includes(priority.toUpperCase())) {
    whereClauses.push(`n.priority = ?`);
    queryParams.push(priority.toUpperCase());
  }

  if (hostelId !== undefined && hostelId !== '' && hostelId !== 'all') {
    if (hostelId === 'general' || hostelId === 'null' || hostelId === '0') {
      whereClauses.push(`n.hostel_id IS NULL`);
    } else {
      const parsedHostelId = parseInt(hostelId, 10);
      if (!isNaN(parsedHostelId)) {
        whereClauses.push(`n.hostel_id = ?`);
        queryParams.push(parsedHostelId);
      }
    }
  }

  if (search && search.trim() !== '') {
    const searchTerm = `%${search.trim()}%`;
    if (user.role === 'STUDENT') {
      whereClauses.push(`n.title LIKE ?`);
      queryParams.push(searchTerm);
    } else {
      whereClauses.push(`(n.title LIKE ? OR n.description LIKE ?)`);
      queryParams.push(searchTerm, searchTerm);
    }
  }

  // Read state filtering (read / unread)
  if (readState === 'read') {
    whereClauses.push(`nr.id IS NOT NULL`);
  } else if (readState === 'unread') {
    whereClauses.push(`nr.id IS NULL`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // ── Count Query ──────────────────────────────────────────────────────────
  const countSql = `
    SELECT COUNT(DISTINCT n.id) AS total
    FROM notices n
    LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = ?
    ${whereSql}
  `;
  const countParams = [user.id, ...queryParams];
  const [countRows] = await db.pool.query(countSql, countParams);
  const totalNotices = Number(countRows[0]?.total || countRows[0]?.count || 0);

  // ── Main List Query ──────────────────────────────────────────────────────
  const listSql = `
    SELECT
      n.id,
      n.title,
      n.description,
      n.created_by,
      u.username AS creator_name,
      n.hostel_id,
      h.name AS hostel_name,
      n.priority,
      n.status,
      n.published_at,
      n.expires_at,
      n.created_at,
      n.updated_at,
      CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END AS is_read
    FROM notices n
    LEFT JOIN users u ON n.created_by = u.id
    LEFT JOIN hostels h ON n.hostel_id = h.id
    LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = ?
    ${whereSql}
    ORDER BY
      CASE n.priority
        WHEN 'URGENT' THEN 1
        WHEN 'IMPORTANT' THEN 2
        WHEN 'GENERAL' THEN 3
        ELSE 4
      END ASC,
      n.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const listParams = [user.id, ...queryParams, limit, offset];
  const [rows] = await db.pool.query(listSql, listParams);

  const formattedNotices = rows.map(r => ({
    ...r,
    is_read: Boolean(r.is_read)
  }));

  const totalPages = Math.ceil(totalNotices / limit) || 1;

  return {
    notices: formattedNotices,
    pagination: {
      currentPage: page,
      limit,
      totalPages,
      totalNotices
    }
  };
}

/**
 * Get unread published notices count for current user.
 */
async function getUnreadCount(user) {
  let whereClauses = [
    `n.status = 'PUBLISHED'`,
    `(n.expires_at IS NULL OR n.expires_at > NOW())`,
    `nr.id IS NULL`
  ];
  let params = [user.id];

  if (user.role === 'STUDENT') {
    const studentHostelId = await getStudentHostelId(user.id);
    if (studentHostelId) {
      whereClauses.push(`(n.hostel_id IS NULL OR n.hostel_id = ?)`);
      params.push(studentHostelId);
    } else {
      whereClauses.push(`n.hostel_id IS NULL`);
    }
  } else if (user.role === 'SUPERINTENDENT') {
    const assignedHostelIds = await getAssignedHostels(user.id);
    if (assignedHostelIds.length > 0) {
      const ph = assignedHostelIds.map(() => '?').join(',');
      whereClauses.push(`(n.hostel_id IS NULL OR n.hostel_id IN (${ph}))`);
      params.push(...assignedHostelIds);
    } else {
      whereClauses.push(`n.hostel_id IS NULL`);
    }
  }

  const sql = `
    SELECT COUNT(n.id) AS unreadCount
    FROM notices n
    LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = ?
    WHERE ${whereClauses.join(' AND ')}
  `;

  const [rows] = await db.pool.query(sql, params);
  return Number(rows[0]?.unreadCount || 0);
}

/**
 * Get single notice details and auto-mark as read for students.
 */
async function getNoticeById(id, user) {
  const sql = `
    SELECT
      n.id,
      n.title,
      n.description,
      n.created_by,
      u.username AS creator_name,
      n.hostel_id,
      h.name AS hostel_name,
      n.priority,
      n.status,
      n.published_at,
      n.expires_at,
      n.created_at,
      n.updated_at,
      CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END AS is_read
    FROM notices n
    LEFT JOIN users u ON n.created_by = u.id
    LEFT JOIN hostels h ON n.hostel_id = h.id
    LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = ?
    WHERE n.id = ?
  `;
  const [rows] = await db.pool.query(sql, [user.id, id]);

  if (rows.length === 0) {
    const err = new Error('Notice not found');
    err.status = 404;
    throw err;
  }

  const notice = rows[0];

  // ── Permission Scoping Check ─────────────────────────────────────────────
  if (user.role === 'STUDENT') {
    if (notice.status !== 'PUBLISHED') {
      const err = new Error('Notice not found or unauthorized');
      err.status = 403;
      throw err;
    }
    if (notice.expires_at && new Date(notice.expires_at) < new Date()) {
      const err = new Error('Notice has expired');
      err.status = 403;
      throw err;
    }
    if (notice.hostel_id !== null) {
      const studentHostelId = await getStudentHostelId(user.id);
      if (studentHostelId !== notice.hostel_id) {
        const err = new Error('Unauthorized to view notice for another hostel');
        err.status = 403;
        throw err;
      }
    }
    // Auto-mark notice as read for student upon viewing
    await markNoticeRead(id, user.id);
    notice.is_read = true;
  } else if (user.role === 'SUPERINTENDENT') {
    if (notice.hostel_id !== null) {
      const assigned = await getAssignedHostels(user.id);
      if (!assigned.includes(notice.hostel_id)) {
        const err = new Error('Unauthorized to view notice for unassigned hostel');
        err.status = 403;
        throw err;
      }
    }
  }

  return {
    ...notice,
    is_read: Boolean(notice.is_read)
  };
}

/**
 * Create a new notice with role-based scoping enforcement.
 */
async function createNotice(data, user) {
  const { title, description, priority = 'GENERAL', target, hostel_id, status = 'DRAFT', expires_at } = data;

  let finalHostelId = null;
  if (target === 'SPECIFIC_HOSTEL' || hostel_id) {
    if (!hostel_id) {
      const err = new Error('Hostel selection is required for specific hostel notices');
      err.status = 400;
      throw err;
    }
    finalHostelId = parseInt(hostel_id, 10);

    if (user.role === 'SUPERINTENDENT') {
      const assigned = await getAssignedHostels(user.id);
      if (!assigned.includes(finalHostelId)) {
        const err = new Error('Superintendents can only create notices for assigned hostels');
        err.status = 403;
        throw err;
      }
    }
  } else {
    // All Hostels Target (hostel_id = null)
    if (user.role !== 'SUPER_ADMIN') {
      const err = new Error('Only Super Admin can create notices targeting all hostels');
      err.status = 403;
      throw err;
    }
  }

  const published_at = status === 'PUBLISHED' ? new Date() : null;
  const expiresDate = expires_at ? new Date(expires_at) : null;

  const sql = `
    INSERT INTO notices (title, description, created_by, hostel_id, priority, status, published_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.pool.query(sql, [
    title.trim(),
    description.trim(),
    user.id,
    finalHostelId,
    priority,
    status,
    published_at,
    expiresDate
  ]);

  const createdNotice = await getNoticeById(result.insertId, user);

  await activityService.logActivity({
    actorId: user.id,
    action: status === 'PUBLISHED' ? 'NOTICE_PUBLISHED' : 'NOTICE_CREATED',
    module: 'NOTICES',
    entityType: 'NOTICE',
    entityId: result.insertId,
    hostelId: finalHostelId,
    description: `Created notice '${title.trim()}' (${status})`,
    metadata: { priority, status, target }
  });

  return createdNotice;
}

/**
 * Update an existing notice.
 */
async function updateNotice(id, data, user) {
  const existingNotice = await getNoticeById(id, user);

  // Permission Check
  if (user.role === 'SUPERINTENDENT') {
    if (existingNotice.hostel_id === null) {
      const err = new Error('Superintendents cannot modify all-hostel notices');
      err.status = 403;
      throw err;
    }
    const assigned = await getAssignedHostels(user.id);
    if (!assigned.includes(existingNotice.hostel_id)) {
      const err = new Error('Unauthorized to modify notice for unassigned hostel');
      err.status = 403;
      throw err;
    }
  }

  const { title, description, priority, target, hostel_id, status, expires_at } = data;

  let newHostelId = existingNotice.hostel_id;
  if (target === 'ALL_HOSTELS') {
    if (user.role !== 'SUPER_ADMIN') {
      const err = new Error('Only Super Admin can publish notices to all hostels');
      err.status = 403;
      throw err;
    }
    newHostelId = null;
  } else if (target === 'SPECIFIC_HOSTEL' || hostel_id) {
    newHostelId = parseInt(hostel_id, 10);
    if (user.role === 'SUPERINTENDENT') {
      const assigned = await getAssignedHostels(user.id);
      if (!assigned.includes(newHostelId)) {
        const err = new Error('Superintendents can only assign notices to their assigned hostels');
        err.status = 403;
        throw err;
      }
    }
  }

  const newStatus = status || existingNotice.status;
  let published_at = existingNotice.published_at;
  if (newStatus === 'PUBLISHED' && !published_at) {
    published_at = new Date();
  }

  const expiresDate = expires_at !== undefined ? (expires_at ? new Date(expires_at) : null) : existingNotice.expires_at;

  const sql = `
    UPDATE notices
    SET title = ?, description = ?, hostel_id = ?, priority = ?, status = ?, published_at = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  await db.pool.query(sql, [
    title ? title.trim() : existingNotice.title,
    description ? description.trim() : existingNotice.description,
    newHostelId,
    priority || existingNotice.priority,
    newStatus,
    published_at,
    expiresDate,
    id
  ]);

  return getNoticeById(id, user);
}

/**
 * Patch notice status (DRAFT -> PUBLISHED -> ARCHIVED).
 */
async function updateNoticeStatus(id, newStatus, user) {
  const existingNotice = await getNoticeById(id, user);

  if (user.role === 'SUPERINTENDENT') {
    if (existingNotice.hostel_id === null) {
      const err = new Error('Superintendents cannot modify status of all-hostel notices');
      err.status = 403;
      throw err;
    }
    const assigned = await getAssignedHostels(user.id);
    if (!assigned.includes(existingNotice.hostel_id)) {
      const err = new Error('Unauthorized');
      err.status = 403;
      throw err;
    }
  }

  let published_at = existingNotice.published_at;
  if (newStatus === 'PUBLISHED' && !published_at) {
    published_at = new Date();
  }

  const sql = `UPDATE notices SET status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  await db.pool.query(sql, [newStatus, published_at, id]);

  const actionType = newStatus === 'PUBLISHED' ? 'NOTICE_PUBLISHED' : (newStatus === 'ARCHIVED' ? 'NOTICE_ARCHIVED' : 'NOTICE_UPDATED');
  await activityService.logActivity({
    actorId: user.id,
    action: actionType,
    module: 'NOTICES',
    entityType: 'NOTICE',
    entityId: id,
    hostelId: existingNotice.hostel_id,
    description: `Updated notice '${existingNotice.title}' status to '${newStatus}'`,
    metadata: { previous_status: existingNotice.status, new_status: newStatus }
  });

  return getNoticeById(id, user);
}

/**
 * Mark a notice as read for a specific user.
 */
async function markNoticeRead(noticeId, userId) {
  const sql = `
    INSERT INTO notice_reads (notice_id, user_id, read_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP
  `;
  await db.pool.query(sql, [noticeId, userId]);
}

/**
 * Delete a notice (SUPER_ADMIN only).
 */
async function deleteNotice(id, user) {
  if (user.role !== 'SUPER_ADMIN') {
    const err = new Error('Only Super Admin can permanently delete notices');
    err.status = 403;
    throw err;
  }

  const existingNotice = await getNoticeById(id, user);

  const sql = `DELETE FROM notices WHERE id = ?`;
  const [result] = await db.pool.query(sql, [id]);
  if (result.affectedRows === 0) {
    const err = new Error('Notice not found');
    err.status = 404;
    throw err;
  }

  await activityService.logActivity({
    actorId: user.id,
    action: 'NOTICE_DELETED',
    module: 'NOTICES',
    entityType: 'NOTICE',
    entityId: id,
    hostelId: existingNotice ? existingNotice.hostel_id : null,
    description: `Deleted notice '${existingNotice ? existingNotice.title : id}'`
  });
}

/**
 * Fetch 3 to 5 recent published notices for dashboard display.
 */
async function getRecentNotices(user, limit = 5) {
  const result = await getNotices({ page: 1, limit, status: 'PUBLISHED' }, user);
  return result.notices || [];
}

module.exports = {
  getNotices,
  getUnreadCount,
  getNoticeById,
  createNotice,
  updateNotice,
  updateNoticeStatus,
  markNoticeRead,
  deleteNotice,
  getRecentNotices
};
