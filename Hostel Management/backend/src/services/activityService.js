const db = require('../config/db');

// Sensitive key patterns to strip/scrub from metadata
const SENSITIVE_KEYS = [
  'password', 'password_hash', 'token', 'access_token', 'refresh_token',
  'jwt', 'secret', 'api_key', 'client_secret', 'credit_card', 'cvv', 'card_number'
];

const SENSITIVE_ID_KEYS = ['aadhaar', 'ssn', 'passport_number', 'identification_number'];

/**
 * Sanitizes metadata objects to remove or mask sensitive information.
 */
function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;

  const cleaned = JSON.parse(JSON.stringify(metadata));

  const scrubObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      const keyLower = key.toLowerCase();

      // Completely remove secret keys
      if (SENSITIVE_KEYS.some(k => keyLower.includes(k))) {
        delete obj[key];
        continue;
      }

      // Mask identity numbers to last 4 chars
      if (SENSITIVE_ID_KEYS.some(k => keyLower.includes(k))) {
        if (typeof obj[key] === 'string') {
          const val = obj[key].trim();
          obj[key] = val.length > 4 ? `****-****-${val.slice(-4)}` : '****';
        }
        continue;
      }

      // Recurse nested objects
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        scrubObject(obj[key]);
      }
    }
  };

  scrubObject(cleaned);
  return cleaned;
}

/**
 * Logs an operational activity event to the activity_log table.
 */
async function logActivity({
  actorId = null,
  action,
  module: activityModule,
  entityType,
  entityId = null,
  hostelId = null,
  studentId = null,
  description,
  metadata = null
}, connection = null) {
  if (!action || !activityModule || !entityType || !description) {
    console.error('Invalid activity log call: missing required fields', { action, activityModule, entityType, description });
    return null;
  }

  const cleanedMeta = sanitizeMetadata(metadata);
  const metaJson = cleanedMeta ? JSON.stringify(cleanedMeta) : null;

  const sql = `
    INSERT INTO activity_log
      (actor_id, action, module, entity_type, entity_id, hostel_id, student_id, description, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  const params = [
    actorId ? Number(actorId) : null,
    action,
    activityModule.toUpperCase(),
    entityType.toUpperCase(),
    entityId ? Number(entityId) : null,
    hostelId ? Number(hostelId) : null,
    studentId ? Number(studentId) : null,
    description,
    metaJson
  ];

  try {
    const executor = connection || db.pool;
    const [result] = await executor.query(sql, params);
    return result.insertId;
  } catch (err) {
    console.error('Failed to write to activity_log:', err.message);
    // Best-effort policy for non-transaction calls
    if (connection) throw err; // propagate if inside active transaction
    return null;
  }
}

/**
 * Queries paginated activity logs with role & hostel scoping, date range, module, and search filtering.
 */
async function getActivities(filters = {}, user) {
  if (!user) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  // Student accounts cannot access administrative activity logs
  if (user.role === 'STUDENT') {
    const err = new Error('Access denied. Students are not authorized to view the system activity center.');
    err.status = 403;
    throw err;
  }

  const {
    page = 1,
    limit = 20,
    module: filterModule,
    action: filterAction,
    hostel_id: filterHostelId,
    student_id: filterStudentId,
    date_from: dateFrom,
    date_to: dateTo,
    search
  } = filters;

  // Filter validations
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  let whereClauses = [];
  let queryParams = [];

  // 1. Role Scoping
  if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = user.assignedHostels || [];
    if (assignedHostels.length === 0) {
      // Superintendent has no hostels assigned -> empty result
      return { activities: [], total: 0, page: parsedPage, totalPages: 0 };
    }

    // If explicit hostel_id filter is requested, ensure it is within assigned hostels
    if (filterHostelId) {
      const requestedId = Number(filterHostelId);
      if (!assignedHostels.includes(requestedId)) {
        const err = new Error('Access denied. Requested hostel is outside your authorized scope.');
        err.status = 403;
        throw err;
      }
      whereClauses.push('al.hostel_id = ?');
      queryParams.push(requestedId);
    } else {
      whereClauses.push(`al.hostel_id IN (${assignedHostels.map(() => '?').join(',')})`);
      queryParams.push(...assignedHostels);
    }
  } else if (user.role === 'SUPER_ADMIN') {
    if (filterHostelId) {
      whereClauses.push('al.hostel_id = ?');
      queryParams.push(Number(filterHostelId));
    }
  }

  // 2. Module & Action Filters
  if (filterModule) {
    whereClauses.push('al.module = ?');
    queryParams.push(filterModule.toUpperCase());
  }

  if (filterAction) {
    whereClauses.push('al.action = ?');
    queryParams.push(filterAction.toUpperCase());
  }

  if (filterStudentId) {
    whereClauses.push('al.student_id = ?');
    queryParams.push(Number(filterStudentId));
  }

  // 3. Date Range Validation (YYYY-MM-DD, max 365 days)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateFrom || dateTo) {
    if (dateFrom && !dateRegex.test(dateFrom)) {
      const err = new Error('Invalid date_from format. Expected YYYY-MM-DD.');
      err.status = 400;
      throw err;
    }
    if (dateTo && !dateRegex.test(dateTo)) {
      const err = new Error('Invalid date_to format. Expected YYYY-MM-DD.');
      err.status = 400;
      throw err;
    }

    if (dateFrom && dateTo) {
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      if (start > end) {
        const err = new Error('date_from cannot be after date_to.');
        err.status = 400;
        throw err;
      }
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        const err = new Error('Date range cannot exceed 365 days.');
        err.status = 400;
        throw err;
      }
      whereClauses.push('DATE(al.created_at) BETWEEN ? AND ?');
      queryParams.push(dateFrom, dateTo);
    } else if (dateFrom) {
      whereClauses.push('DATE(al.created_at) >= ?');
      queryParams.push(dateFrom);
    } else if (dateTo) {
      whereClauses.push('DATE(al.created_at) <= ?');
      queryParams.push(dateTo);
    }
  }

  // 4. Server-side Search
  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    whereClauses.push('(u.username LIKE ? OR u.email LIKE ? OR s.full_name LIKE ? OR s.student_id LIKE ? OR al.description LIKE ?)');
    queryParams.push(term, term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count Total Query
  const countSql = `
    SELECT COUNT(*) as total
    FROM activity_log al
    LEFT JOIN users u ON al.actor_id = u.id
    LEFT JOIN students s ON al.student_id = s.id
    ${whereSql}
  `;

  // Data Select Query
  const dataSql = `
    SELECT
      al.id,
      al.actor_id,
      al.action,
      al.module,
      al.entity_type,
      al.entity_id,
      al.hostel_id,
      al.student_id,
      al.description,
      al.metadata,
      al.created_at,
      u.username as actor_username,
      u.email as actor_email,
      r.name as actor_role,
      s.full_name as student_name,
      s.student_id as student_code,
      h.name as hostel_name,
      h.code as hostel_code
    FROM activity_log al
    LEFT JOIN users u ON al.actor_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN students s ON al.student_id = s.id
    LEFT JOIN hostels h ON al.hostel_id = h.id
    ${whereSql}
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ? OFFSET ?
  `;

  const [countRows] = await db.pool.query(countSql, queryParams);
  const total = countRows[0] ? countRows[0].total : 0;
  const totalPages = Math.ceil(total / parsedLimit);

  const [dataRows] = await db.pool.query(dataSql, [...queryParams, parsedLimit, offset]);

  // Clean metadata parsing if string
  const activities = dataRows.map(row => {
    let parsedMeta = row.metadata;
    if (typeof parsedMeta === 'string') {
      try {
        parsedMeta = JSON.parse(parsedMeta);
      } catch (e) {
        parsedMeta = null;
      }
    }
    return {
      ...row,
      metadata: sanitizeMetadata(parsedMeta)
    };
  });

  return {
    activities,
    total,
    page: parsedPage,
    totalPages
  };
}

/**
 * Retrieves a single activity by ID with role & hostel scoping.
 */
async function getActivityById(id, user) {
  if (!user) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  if (user.role === 'STUDENT') {
    const err = new Error('Access denied. Students cannot view administrative activity details.');
    err.status = 403;
    throw err;
  }

  const sql = `
    SELECT
      al.*,
      u.username as actor_username,
      u.email as actor_email,
      r.name as actor_role,
      s.full_name as student_name,
      s.student_id as student_code,
      h.name as hostel_name,
      h.code as hostel_code
    FROM activity_log al
    LEFT JOIN users u ON al.actor_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN students s ON al.student_id = s.id
    LEFT JOIN hostels h ON al.hostel_id = h.id
    WHERE al.id = ?
  `;

  const [rows] = await db.pool.query(sql, [Number(id)]);
  if (rows.length === 0) {
    const err = new Error('Activity record not found.');
    err.status = 404;
    throw err;
  }

  const activity = rows[0];

  // Role scoping check
  if (user.role === 'SUPERINTENDENT') {
    const assignedHostels = user.assignedHostels || [];
    if (activity.hostel_id && !assignedHostels.includes(activity.hostel_id)) {
      const err = new Error('Access denied. Activity is outside your assigned hostel scope.');
      err.status = 403;
      throw err;
    }
  }

  if (typeof activity.metadata === 'string') {
    try {
      activity.metadata = JSON.parse(activity.metadata);
    } catch (e) {
      activity.metadata = null;
    }
  }
  activity.metadata = sanitizeMetadata(activity.metadata);

  return activity;
}

/**
 * Returns activity summary statistics for today.
 */
async function getActivityStats(user) {
  if (!user) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  if (user.role === 'STUDENT') {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  let whereClauses = ['DATE(al.created_at) = CURDATE()'];
  let queryParams = [];

  if (user.role === 'SUPERINTENDENT') {
    const assigned = user.assignedHostels || [];
    if (assigned.length === 0) {
      return { totalToday: 0, loginsToday: 0, studentChangesToday: 0, financialToday: 0, operationalToday: 0 };
    }
    whereClauses.push(`al.hostel_id IN (${assigned.map(() => '?').join(',')})`);
    queryParams.push(...assigned);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const sql = `
    SELECT
      COUNT(*) as totalToday,
      SUM(CASE WHEN al.module = 'AUTHENTICATION' THEN 1 ELSE 0 END) as loginsToday,
      SUM(CASE WHEN al.module IN ('STUDENTS', 'ALLOCATIONS') THEN 1 ELSE 0 END) as studentChangesToday,
      SUM(CASE WHEN al.module = 'FEES' THEN 1 ELSE 0 END) as financialToday,
      SUM(CASE WHEN al.module IN ('ATTENDANCE', 'COMPLAINTS', 'VISITORS', 'MESS', 'NOTICES') THEN 1 ELSE 0 END) as operationalToday
    FROM activity_log al
    ${whereSql}
  `;

  const [rows] = await db.pool.query(sql, queryParams);
  const stats = rows[0] || {};

  return {
    totalToday: Number(stats.totalToday || 0),
    loginsToday: Number(stats.loginsToday || 0),
    studentChangesToday: Number(stats.studentChangesToday || 0),
    financialToday: Number(stats.financialToday || 0),
    operationalToday: Number(stats.operationalToday || 0)
  };
}

module.exports = {
  sanitizeMetadata,
  logActivity,
  getActivities,
  getActivityById,
  getActivityStats
};
