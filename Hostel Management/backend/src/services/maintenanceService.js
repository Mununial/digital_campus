const db = require('../config/db');
const activityService = require('./activityService');

// Valid status transitions state machine
const ALLOWED_STATUS_TRANSITIONS = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  ASSIGNED: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['ASSIGNED', 'RESOLVED', 'OPEN'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'ASSIGNED', 'RESOLVED', 'CLOSED']
};

/**
 * Validates location hierarchy for room / bed / floor / hostel.
 */
async function validateLocationHierarchy(hostelId, floorId, roomId, bedId, connection = null) {
  const executor = connection || db.pool;

  if (bedId) {
    const [rows] = await executor.query(
      `SELECT b.id as bed_id, r.id as room_id, f.id as floor_id, f.hostel_id
       FROM beds b
       JOIN rooms r ON b.room_id = r.id
       JOIN floors f ON r.floor_id = f.id
       WHERE b.id = ?`,
      [Number(bedId)]
    );
    if (rows.length === 0) {
      throw new Error('Specified bed does not exist.');
    }
    const loc = rows[0];
    if (Number(loc.hostel_id) !== Number(hostelId)) {
      throw new Error('Bed does not belong to the specified hostel.');
    }
    if (roomId && Number(loc.room_id) !== Number(roomId)) {
      throw new Error('Bed does not belong to the specified room.');
    }
    if (floorId && Number(loc.floor_id) !== Number(floorId)) {
      throw new Error('Bed does not belong to the specified floor.');
    }
    return loc;
  }

  if (roomId) {
    const [rows] = await executor.query(
      `SELECT r.id as room_id, f.id as floor_id, f.hostel_id
       FROM rooms r
       JOIN floors f ON r.floor_id = f.id
       WHERE r.id = ?`,
      [Number(roomId)]
    );
    if (rows.length === 0) {
      throw new Error('Specified room does not exist.');
    }
    const loc = rows[0];
    if (Number(loc.hostel_id) !== Number(hostelId)) {
      throw new Error('Room does not belong to the specified hostel.');
    }
    if (floorId && Number(loc.floor_id) !== Number(floorId)) {
      throw new Error('Room does not belong to the specified floor.');
    }
    return loc;
  }

  if (floorId) {
    const [rows] = await executor.query(
      `SELECT id as floor_id, hostel_id FROM floors WHERE id = ?`,
      [Number(floorId)]
    );
    if (rows.length === 0) {
      throw new Error('Specified floor does not exist.');
    }
    if (Number(rows[0].hostel_id) !== Number(hostelId)) {
      throw new Error('Floor does not belong to the specified hostel.');
    }
    return rows[0];
  }

  return null;
}

/**
 * Creates a maintenance request.
 */
async function createMaintenanceRequest(data, actor) {
  if (!actor) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  const { title, description, category = 'OTHER', priority = 'MEDIUM' } = data;

  if (!title || !title.trim()) {
    const err = new Error('Maintenance title is required.');
    err.status = 400;
    throw err;
  }

  if (!description || !description.trim()) {
    const err = new Error('Maintenance description is required.');
    err.status = 400;
    throw err;
  }

  let hostelId = data.hostel_id ? Number(data.hostel_id) : null;
  let floorId = data.floor_id ? Number(data.floor_id) : null;
  let roomId = data.room_id ? Number(data.room_id) : null;
  let bedId = data.bed_id ? Number(data.bed_id) : null;
  let studentId = null;
  let reqPriority = priority;

  // 1. Student reporting workflow
  if (actor.role === 'STUDENT') {
    // Priority check for students
    if (reqPriority === 'URGENT') {
      const err = new Error('Students cannot directly submit URGENT priority maintenance requests. Please select HIGH if urgent.');
      err.status = 400;
      throw err;
    }

    // Find student profile and active accommodation
    const [studentRows] = await db.pool.query(`SELECT id FROM students WHERE user_id = ?`, [actor.id]);
    if (studentRows.length === 0) {
      const err = new Error('Student profile record not found.');
      err.status = 404;
      throw err;
    }
    studentId = studentRows[0].id;

    const [allocRows] = await db.pool.query(
      `SELECT sa.hostel_id, sa.room_id, sa.bed_id, r.floor_id
       FROM student_allocations sa
       JOIN rooms r ON sa.room_id = r.id
       WHERE sa.student_id = ? AND sa.status = 'ACTIVE'`,
      [studentId]
    );

    if (allocRows.length === 0) {
      const err = new Error('You do not have an active accommodation allocation to report maintenance for.');
      err.status = 400;
      throw err;
    }

    const alloc = allocRows[0];
    hostelId = alloc.hostel_id;
    floorId = alloc.floor_id;
    roomId = alloc.room_id;
    bedId = alloc.bed_id;
  } else {
    // Staff workflow
    if (!hostelId) {
      const err = new Error('Hostel ID is required for staff maintenance creation.');
      err.status = 400;
      throw err;
    }

    if (actor.role === 'SUPERINTENDENT') {
      const assignedHostels = actor.assignedHostels || [];
      if (!assignedHostels.includes(hostelId)) {
        const err = new Error('Access denied. You are not authorized for this hostel.');
        err.status = 403;
        throw err;
      }
    }

    // Location hierarchy validation
    try {
      await validateLocationHierarchy(hostelId, floorId, roomId, bedId);
    } catch (locErr) {
      const err = new Error(`Location validation failed: ${locErr.message}`);
      err.status = 400;
      throw err;
    }
  }

  // Insert Maintenance Request
  const [insertRes] = await db.pool.query(
    `INSERT INTO maintenance_requests
      (hostel_id, floor_id, room_id, bed_id, category, title, description, priority, status, reported_by, student_id, reported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, NOW())`,
    [hostelId, floorId, roomId, bedId, category, title.trim(), description.trim(), reqPriority, actor.id, studentId]
  );

  const maintenanceId = insertRes.insertId;

  // Insert initial update entry
  await db.pool.query(
    `INSERT INTO maintenance_updates (maintenance_id, user_id, message, new_status)
     VALUES (?, ?, ?, 'OPEN')`,
    [maintenanceId, actor.id, `Maintenance request reported by ${actor.username || 'user'}.`]
  );

  // Activity Log
  await activityService.logActivity({
    actorId: actor.id,
    action: 'MAINTENANCE_CREATED',
    module: 'OPERATIONS',
    entityType: 'MAINTENANCE',
    entityId: maintenanceId,
    hostelId,
    studentId,
    description: `Created maintenance request #${maintenanceId}: '${title}' (${category}, ${reqPriority})`,
    metadata: { maintenanceId, title, category, priority: reqPriority, hostelId, roomId, bedId }
  });

  return getMaintenanceById(maintenanceId, actor);
}

/**
 * Fetch paginated maintenance requests.
 */
async function getMaintenanceRequests(filters = {}, actor) {
  if (!actor) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  const {
    page = 1,
    limit = 20,
    category,
    status,
    priority,
    hostel_id: filterHostelId,
    assigned_to: filterAssignedTo,
    search,
    date_from: dateFrom,
    date_to: dateTo
  } = filters;

  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  const offset = (parsedPage - 1) * parsedLimit;

  let whereClauses = [];
  let queryParams = [];

  // Role scoping
  if (actor.role === 'STUDENT') {
    const [studentRows] = await db.pool.query(`SELECT id FROM students WHERE user_id = ?`, [actor.id]);
    const studentId = studentRows[0]?.id || 0;
    whereClauses.push('(mr.reported_by = ? OR mr.student_id = ?)');
    queryParams.push(actor.id, studentId);
  } else if (actor.role === 'SUPERINTENDENT') {
    const assigned = actor.assignedHostels || [];
    if (assigned.length === 0) {
      return { requests: [], total: 0, page: parsedPage, totalPages: 0 };
    }
    if (filterHostelId) {
      const hId = Number(filterHostelId);
      if (!assigned.includes(hId)) {
        const err = new Error('Access denied. Hostel is outside your scope.');
        err.status = 403;
        throw err;
      }
      whereClauses.push('mr.hostel_id = ?');
      queryParams.push(hId);
    } else {
      whereClauses.push(`mr.hostel_id IN (${assigned.map(() => '?').join(',')})`);
      queryParams.push(...assigned);
    }
  } else if (actor.role === 'SUPER_ADMIN') {
    if (filterHostelId) {
      whereClauses.push('mr.hostel_id = ?');
      queryParams.push(Number(filterHostelId));
    }
  }

  if (category) {
    whereClauses.push('mr.category = ?');
    queryParams.push(category.toUpperCase());
  }

  if (status) {
    whereClauses.push('mr.status = ?');
    queryParams.push(status.toUpperCase());
  }

  if (priority) {
    whereClauses.push('mr.priority = ?');
    queryParams.push(priority.toUpperCase());
  }

  if (filterAssignedTo) {
    whereClauses.push('mr.assigned_to = ?');
    queryParams.push(Number(filterAssignedTo));
  }

  if (dateFrom) {
    whereClauses.push('DATE(mr.created_at) >= ?');
    queryParams.push(dateFrom);
  }

  if (dateTo) {
    whereClauses.push('DATE(mr.created_at) <= ?');
    queryParams.push(dateTo);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClauses.push('(mr.title LIKE ? OR mr.description LIKE ? OR s.full_name LIKE ? OR s.student_id LIKE ? OR h.name LIKE ? OR r.room_number LIKE ?)');
    queryParams.push(term, term, term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) as total
    FROM maintenance_requests mr
    LEFT JOIN students s ON mr.student_id = s.id
    LEFT JOIN hostels h ON mr.hostel_id = h.id
    LEFT JOIN rooms r ON mr.room_id = r.id
    ${whereSql}
  `;

  const dataSql = `
    SELECT
      mr.*,
      h.name as hostel_name,
      h.code as hostel_code,
      f.floor_number,
      r.room_number,
      b.bed_number,
      s.full_name as student_name,
      s.student_id as student_code,
      u_rep.username as reporter_name,
      u_rep.email as reporter_email,
      u_assign.username as assignee_name,
      u_assign.email as assignee_email
    FROM maintenance_requests mr
    LEFT JOIN hostels h ON mr.hostel_id = h.id
    LEFT JOIN floors f ON mr.floor_id = f.id
    LEFT JOIN rooms r ON mr.room_id = r.id
    LEFT JOIN beds b ON mr.bed_id = b.id
    LEFT JOIN students s ON mr.student_id = s.id
    LEFT JOIN users u_rep ON mr.reported_by = u_rep.id
    LEFT JOIN users u_assign ON mr.assigned_to = u_assign.id
    ${whereSql}
    ORDER BY
      CASE mr.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
      mr.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [countRows] = await db.pool.query(countSql, queryParams);
  const total = countRows[0] ? countRows[0].total : 0;
  const totalPages = Math.ceil(total / parsedLimit);

  const [requests] = await db.pool.query(dataSql, [...queryParams, parsedLimit, offset]);

  return {
    requests,
    total,
    page: parsedPage,
    totalPages
  };
}

/**
 * Fetch a single maintenance request with updates timeline.
 */
async function getMaintenanceById(id, actor) {
  if (!actor) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  const sql = `
    SELECT
      mr.*,
      h.name as hostel_name,
      h.code as hostel_code,
      f.floor_number,
      r.room_number,
      b.bed_number,
      s.full_name as student_name,
      s.student_id as student_code,
      u_rep.username as reporter_name,
      u_assign.username as assignee_name
    FROM maintenance_requests mr
    LEFT JOIN hostels h ON mr.hostel_id = h.id
    LEFT JOIN floors f ON mr.floor_id = f.id
    LEFT JOIN rooms r ON mr.room_id = r.id
    LEFT JOIN beds b ON mr.bed_id = b.id
    LEFT JOIN students s ON mr.student_id = s.id
    LEFT JOIN users u_rep ON mr.reported_by = u_rep.id
    LEFT JOIN users u_assign ON mr.assigned_to = u_assign.id
    WHERE mr.id = ?
  `;

  const [rows] = await db.pool.query(sql, [Number(id)]);
  if (rows.length === 0) {
    const err = new Error('Maintenance request not found.');
    err.status = 404;
    throw err;
  }

  const record = rows[0];

  // Scoping check
  if (actor.role === 'STUDENT') {
    const [studentRows] = await db.pool.query(`SELECT id FROM students WHERE user_id = ?`, [actor.id]);
    const studentId = studentRows[0]?.id;
    if (record.reported_by !== actor.id && record.student_id !== studentId) {
      const err = new Error('Access denied. You can only view your own maintenance requests.');
      err.status = 403;
      throw err;
    }
  } else if (actor.role === 'SUPERINTENDENT') {
    const assigned = actor.assignedHostels || [];
    if (!assigned.includes(record.hostel_id)) {
      const err = new Error('Access denied. Request is outside your authorized hostel scope.');
      err.status = 403;
      throw err;
    }
  }

  // Fetch updates history timeline
  const [updates] = await db.pool.query(
    `SELECT mu.*, u.username as user_name, r.name as user_role
     FROM maintenance_updates mu
     JOIN users u ON mu.user_id = u.id
     JOIN roles r ON u.role_id = r.id
     WHERE mu.maintenance_id = ?
     ORDER BY mu.created_at ASC`,
    [Number(id)]
  );

  record.updates = updates;
  return record;
}

/**
 * Updates status of a maintenance request with state-machine transition rules.
 */
async function updateMaintenanceStatus(id, newStatus, resolutionNote, actor) {
  const currentReq = await getMaintenanceById(id, actor);
  const oldStatus = currentReq.status;
  const targetStatus = newStatus.toUpperCase();

  if (oldStatus === targetStatus) {
    return currentReq;
  }

  // Role permissions
  if (actor.role === 'STUDENT') {
    if (targetStatus !== 'REOPENED') {
      const err = new Error('Students are only authorized to REOPEN resolved maintenance requests.');
      err.status = 403;
      throw err;
    }
    if (oldStatus !== 'RESOLVED') {
      const err = new Error('Students can only reopen requests that are currently RESOLVED.');
      err.status = 400;
      throw err;
    }
  }

  // State machine validation
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[oldStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    const err = new Error(`Invalid status transition from '${oldStatus}' to '${targetStatus}'. Allowed transitions: [${allowedNext.join(', ')}]`);
    err.status = 400;
    throw err;
  }

  let extraSql = '';
  let extraParams = [];

  if (targetStatus === 'IN_PROGRESS' && !currentReq.started_at) {
    extraSql += ', started_at = NOW()';
  }

  if (targetStatus === 'RESOLVED') {
    if (!resolutionNote || !resolutionNote.trim()) {
      const err = new Error('A resolution note is required when resolving a maintenance request.');
      err.status = 400;
      throw err;
    }
    if (!currentReq.started_at) {
      extraSql += ', started_at = NOW()';
    }
    extraSql += ', resolved_at = NOW(), resolution_note = ?';
    extraParams.push(resolutionNote.trim());
  }

  await db.pool.query(
    `UPDATE maintenance_requests SET status = ? ${extraSql} WHERE id = ?`,
    [targetStatus, ...extraParams, Number(id)]
  );

  const noteMsg = resolutionNote ? ` Note: "${resolutionNote.trim()}"` : '';
  await db.pool.query(
    `INSERT INTO maintenance_updates (maintenance_id, user_id, message, old_status, new_status)
     VALUES (?, ?, ?, ?, ?)`,
    [Number(id), actor.id, `Status changed from ${oldStatus} to ${targetStatus}.${noteMsg}`, oldStatus, targetStatus]
  );

  // Activity log action selection
  let actAction = 'MAINTENANCE_STATUS_CHANGED';
  if (targetStatus === 'RESOLVED') actAction = 'MAINTENANCE_RESOLVED';
  else if (targetStatus === 'REOPENED') actAction = 'MAINTENANCE_REOPENED';
  else if (targetStatus === 'CLOSED') actAction = 'MAINTENANCE_CLOSED';

  await activityService.logActivity({
    actorId: actor.id,
    action: actAction,
    module: 'OPERATIONS',
    entityType: 'MAINTENANCE',
    entityId: Number(id),
    hostelId: currentReq.hostel_id,
    studentId: currentReq.student_id,
    description: `Updated maintenance request #${id} status to ${targetStatus}`,
    metadata: { maintenanceId: id, oldStatus, newStatus: targetStatus, resolutionNote }
  });

  return getMaintenanceById(id, actor);
}

/**
 * Assigns maintenance request to staff.
 */
async function assignMaintenance(id, assignedToUserId, actor) {
  if (actor.role === 'STUDENT') {
    const err = new Error('Students are not authorized to assign maintenance staff.');
    err.status = 403;
    throw err;
  }

  const currentReq = await getMaintenanceById(id, actor);

  // Verify staff user
  const [users] = await db.pool.query(
    `SELECT u.id, u.username, r.name as role
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = ? AND r.name IN ('SUPER_ADMIN', 'SUPERINTENDENT')`,
    [Number(assignedToUserId)]
  );

  if (users.length === 0) {
    const err = new Error('Selected assignee is not an authorized maintenance staff user.');
    err.status = 400;
    throw err;
  }

  const assignee = users[0];
  const oldStatus = currentReq.status;
  const newStatus = oldStatus === 'OPEN' ? 'ASSIGNED' : oldStatus;

  await db.pool.query(
    `UPDATE maintenance_requests SET assigned_to = ?, status = ? WHERE id = ?`,
    [assignee.id, newStatus, Number(id)]
  );

  await db.pool.query(
    `INSERT INTO maintenance_updates (maintenance_id, user_id, message, old_status, new_status)
     VALUES (?, ?, ?, ?, ?)`,
    [Number(id), actor.id, `Assigned to ${assignee.username}.`, oldStatus, newStatus]
  );

  await activityService.logActivity({
    actorId: actor.id,
    action: 'MAINTENANCE_ASSIGNED',
    module: 'OPERATIONS',
    entityType: 'MAINTENANCE',
    entityId: Number(id),
    hostelId: currentReq.hostel_id,
    studentId: currentReq.student_id,
    description: `Assigned maintenance request #${id} to ${assignee.username}`,
    metadata: { maintenanceId: id, assignedTo: assignee.id, assigneeName: assignee.username }
  });

  return getMaintenanceById(id, actor);
}

/**
 * Elevates or changes priority of maintenance request.
 */
async function updateMaintenancePriority(id, newPriority, reason, actor) {
  if (actor.role === 'STUDENT') {
    const err = new Error('Students are not authorized to change maintenance priority.');
    err.status = 403;
    throw err;
  }

  const currentReq = await getMaintenanceById(id, actor);
  const oldPriority = currentReq.priority;
  const targetPriority = newPriority.toUpperCase();

  if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(targetPriority)) {
    const err = new Error('Invalid priority level.');
    err.status = 400;
    throw err;
  }

  if (oldPriority === targetPriority) return currentReq;

  await db.pool.query(
    `UPDATE maintenance_requests SET priority = ? WHERE id = ?`,
    [targetPriority, Number(id)]
  );

  const reasonMsg = reason ? ` Reason: "${reason.trim()}"` : '';
  await db.pool.query(
    `INSERT INTO maintenance_updates (maintenance_id, user_id, message)
     VALUES (?, ?, ?)`,
    [Number(id), actor.id, `Priority changed from ${oldPriority} to ${targetPriority}.${reasonMsg}`]
  );

  await activityService.logActivity({
    actorId: actor.id,
    action: 'MAINTENANCE_PRIORITY_CHANGED',
    module: 'OPERATIONS',
    entityType: 'MAINTENANCE',
    entityId: Number(id),
    hostelId: currentReq.hostel_id,
    studentId: currentReq.student_id,
    description: `Changed maintenance request #${id} priority from ${oldPriority} to ${targetPriority}`,
    metadata: { maintenanceId: id, oldPriority, newPriority: targetPriority, reason }
  });

  return getMaintenanceById(id, actor);
}

/**
 * Appends a custom text comment / update to maintenance request timeline.
 */
async function addMaintenanceUpdate(id, message, actor) {
  const currentReq = await getMaintenanceById(id, actor);

  if (!message || !message.trim()) {
    const err = new Error('Update message cannot be empty.');
    err.status = 400;
    throw err;
  }

  await db.pool.query(
    `INSERT INTO maintenance_updates (maintenance_id, user_id, message)
     VALUES (?, ?, ?)`,
    [Number(id), actor.id, message.trim()]
  );

  return getMaintenanceById(id, actor);
}

/**
 * Real-Time Duplicate Request Detection
 */
async function checkDuplicateRequests(filtersOrHostelId, roomId, category, title) {
  let hostel_id, room_id, cat, t;
  if (typeof filtersOrHostelId === 'object' && filtersOrHostelId !== null) {
    hostel_id = filtersOrHostelId.hostel_id || filtersOrHostelId.hostelId;
    room_id = filtersOrHostelId.room_id || filtersOrHostelId.roomId;
    cat = filtersOrHostelId.category;
    t = filtersOrHostelId.title;
  } else {
    hostel_id = filtersOrHostelId;
    room_id = roomId;
    cat = category;
    t = title;
  }

  const whereClauses = ["m.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED')", "m.reported_at >= NOW() - INTERVAL 72 HOUR"];
  const params = [];

  if (hostel_id) {
    whereClauses.push('m.hostel_id = ?');
    params.push(hostel_id);
  }

  if (room_id) {
    whereClauses.push('m.room_id = ?');
    params.push(room_id);
  }

  if (cat) {
    whereClauses.push('m.category = ?');
    params.push(cat);
  }

  const sql = `
    SELECT 
      m.id, m.title, m.category, m.priority, m.status, m.reported_at, m.upvote_count,
      h.name as hostel_name, r.room_number,
      t.full_name as technician_name
    FROM maintenance_requests m
    LEFT JOIN hostels h ON m.hostel_id = h.id
    LEFT JOIN rooms r ON m.room_id = r.id
    LEFT JOIN technicians t ON m.technician_id = t.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY m.reported_at DESC
  `;

  const [rows] = await db.pool.query(sql, params);
  return rows;
}


/**
 * Upvote an existing maintenance request
 */
async function upvoteMaintenanceRequest(user, requestId) {
  const student = await db.pool.query('SELECT id FROM students WHERE user_id = ?', [user.id]);
  const studentId = student[0].length > 0 ? student[0][0].id : null;

  if (!studentId) {
    throw new Error('Only active students can upvote maintenance requests.');
  }

  const req = await getMaintenanceById(requestId, user);
  if (!req) {
    throw new Error('Maintenance request not found.');
  }

  try {
    await db.pool.query(
      `INSERT INTO maintenance_upvotes (maintenance_id, user_id, student_id) VALUES (?, ?, ?)`,
      [Number(requestId), user.id, studentId]
    );

    await db.pool.query(
      `UPDATE maintenance_requests SET upvote_count = COALESCE(upvote_count, 0) + 1 WHERE id = ?`,
      [Number(requestId)]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.message.includes('Duplicate')) {
      throw new Error('You have already upvoted this maintenance request.');
    }
    throw err;
  }

  return getMaintenanceById(requestId, user);
}

/**
 * Assign a Technician to a Maintenance Request
 */
async function assignTechnicianToRequest(user, requestId, technicianId, notes) {
  if (user.role === 'STUDENT') {
    throw new Error('Students are not authorized to assign technicians.');
  }

  const req = await getMaintenanceById(requestId, user);
  if (!req) throw new Error('Maintenance request not found.');

  const [techs] = await db.pool.query('SELECT * FROM technicians WHERE id = ?', [technicianId]);
  if (techs.length === 0) throw new Error('Selected technician not found.');
  const tech = techs[0];

  await db.pool.query(
    `UPDATE maintenance_requests 
     SET technician_id = ?, status = 'ASSIGNED', started_at = COALESCE(started_at, NOW())
     WHERE id = ?`,
    [technicianId, Number(requestId)]
  );

  await db.pool.query(
    `UPDATE technicians SET status = 'ON_JOB', total_jobs_done = total_jobs_done + 1 WHERE id = ?`,
    [technicianId]
  );

  const notesMsg = notes ? ` Notes: "${notes.trim()}"` : '';
  await db.pool.query(
    `INSERT INTO maintenance_updates (maintenance_id, user_id, message)
     VALUES (?, ?, ?)`,
    [Number(requestId), user.id, `Assigned to Technician ${tech.full_name} (${tech.skill_category}, Phone: ${tech.phone}).${notesMsg}`]
  );

  await activityService.logActivity({
    actorId: user.id,
    action: 'ASSIGN_TECHNICIAN',
    module: 'MAINTENANCE',
    entityType: 'MAINTENANCE',
    entityId: Number(requestId),
    hostelId: req.hostel_id,
    description: `Assigned Technician ${tech.full_name} to Maintenance Request #${requestId}`
  });

  return getMaintenanceById(requestId, user);
}

/**
 * Advanced Maintenance Analytics: MTTR & Hotspot Rooms
 */
async function getMaintenanceAnalytics(user) {
  const [mttrRows] = await db.pool.query(`
    SELECT 
      category,
      COUNT(*) as total_resolved,
      ROUND(AVG(TIMESTAMPDIFF(MINUTE, reported_at, resolved_at) / 60.0), 1) as avg_resolution_hours
    FROM maintenance_requests
    WHERE status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NOT NULL
    GROUP BY category
  `);

  const [hotspotRows] = await db.pool.query(`
    SELECT 
      r.id as room_id,
      r.room_number,
      h.name as hostel_name,
      h.code as hostel_code,
      COUNT(m.id) as total_complaints,
      GROUP_CONCAT(DISTINCT m.category SEPARATOR ', ') as issue_categories
    FROM maintenance_requests m
    JOIN rooms r ON m.room_id = r.id
    JOIN hostels h ON m.hostel_id = h.id
    WHERE m.reported_at >= NOW() - INTERVAL 30 DAY
    GROUP BY r.id, r.room_number, h.name, h.code
    HAVING COUNT(m.id) >= 2
    ORDER BY total_complaints DESC
    LIMIT 10
  `);

  const [overallMttr] = await db.pool.query(`
    SELECT 
      ROUND(AVG(TIMESTAMPDIFF(MINUTE, reported_at, resolved_at) / 60.0), 1) as overall_mttr_hours
    FROM maintenance_requests
    WHERE status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NOT NULL
  `);

  return {
    mttr_by_category: mttrRows,
    overall_mttr_hours: overallMttr[0]?.overall_mttr_hours || 0,
    hotspot_rooms: hotspotRows
  };
}

module.exports = {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMaintenanceById,
  updateMaintenanceStatus,
  assignMaintenance,
  updateMaintenancePriority,
  addMaintenanceUpdate,
  validateLocationHierarchy,
  checkDuplicateRequests,
  upvoteMaintenanceRequest,
  assignTechnicianToRequest,
  getMaintenanceAnalytics
};
