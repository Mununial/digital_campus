const db = require('../config/db');

/**
 * Strips sensitive keys from metadata before audit logging.
 */
const sanitizeMetadata = (data) => {
  if (!data || typeof data !== 'object') return null;
  const copy = { ...data };
  const sensitiveKeys = ['password', 'current_password', 'new_password', 'confirm_password', 'token', 'jwt', 'secret', 'credit_card', 'ssn', 'aadhaar'];
  
  for (const key of Object.keys(copy)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      delete copy[key];
    }
  }
  return copy;
};

const normalizeIp = (ip) => {
  if (!ip) return '127.0.0.1';
  const s = String(ip).trim();
  if (s === '::1' || s === '::ffff:127.0.0.1') return '127.0.0.1';
  if (s.startsWith('::ffff:')) return s.replace('::ffff:', '');
  return s;
};

/**
 * Logs a security audit event.
 * @param {object} event
 * @param {string} event.action - e.g. LOGIN_SUCCESS, LOGIN_FAILED, PASSWORD_CHANGED
 * @param {number|null} [event.user_id] - Target user ID
 * @param {number|null} [event.actor_id] - Performing user ID
 * @param {string|null} [event.ip_address]
 * @param {string|null} [event.user_agent]
 * @param {object|null} [event.metadata]
 */
const logSecurityEvent = async ({ action, user_id = null, actor_id = null, ip_address = null, user_agent = null, metadata = null }) => {
  try {
    const cleanMeta = metadata ? JSON.stringify(sanitizeMetadata(metadata)) : null;
    const cleanIp = normalizeIp(ip_address);
    await db.pool.query(
      `INSERT INTO security_audit_log (user_id, actor_id, action, ip_address, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, actor_id, action, cleanIp.slice(0, 45), user_agent ? String(user_agent).slice(0, 255) : null, cleanMeta]
    );
  } catch (err) {
    console.error('Failed to write to security_audit_log:', err.message);
  }
};

/**
 * Fetches security audit logs with pagination and filters (SUPER_ADMIN only).
 */
const getAuditLogs = async ({ page = 1, limit = 20, action, user_id, startDate, endDate }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = [];
  let queryParams = [];

  if (action) {
    whereClauses.push('sal.action = ?');
    queryParams.push(action);
  }

  if (user_id) {
    whereClauses.push('(sal.user_id = ? OR sal.actor_id = ?)');
    queryParams.push(Number(user_id), Number(user_id));
  }

  if (startDate) {
    whereClauses.push('sal.created_at >= ?');
    queryParams.push(startDate);
  }

  if (endDate) {
    whereClauses.push('sal.created_at <= ?');
    queryParams.push(endDate);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [countRows] = await db.pool.query(
    `SELECT COUNT(*) as total FROM security_audit_log sal ${whereSql}`,
    queryParams
  );
  const total = countRows[0]?.total || 0;

  const [logs] = await db.pool.query(
    `SELECT sal.id, sal.action, sal.ip_address, sal.user_agent, sal.metadata, sal.created_at,
            u.username as target_username, u.email as target_email,
            a.username as actor_username, a.email as actor_email
     FROM security_audit_log sal
     LEFT JOIN users u ON sal.user_id = u.id
     LEFT JOIN users a ON sal.actor_id = a.id
     ${whereSql}
     ORDER BY sal.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, limitNum, offset]
  );

  return {
    logs,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };
};

module.exports = {
  logSecurityEvent,
  getAuditLogs
};
