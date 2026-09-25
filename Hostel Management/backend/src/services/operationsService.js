const db = require('../config/db');

/**
 * Returns comprehensive operations dashboard summary and hostel health stats.
 */
async function getOperationsSummary(actor) {
  if (!actor) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  if (actor.role === 'STUDENT') {
    const err = new Error('Access denied. Operations summary is restricted to administrative staff.');
    err.status = 403;
    throw err;
  }

  let hostelWhereMaint = '';
  let hostelWhereInsp = '';
  let hostelWhereRooms = '';
  let queryParamsMaint = [];
  let queryParamsInsp = [];
  let queryParamsRooms = [];

  if (actor.role === 'SUPERINTENDENT') {
    const assigned = actor.assignedHostels || [];
    if (assigned.length === 0) {
      return {
        maintenanceMetrics: { openCount: 0, assignedCount: 0, inProgressCount: 0, resolvedCount: 0, urgentCount: 0, totalActive: 0 },
        inspectionMetrics: { inspectedToday: 0, criticalRooms: 0, attentionRequiredRooms: 0 },
        hostelHealth: []
      };
    }
    const placeholders = assigned.map(() => '?').join(',');
    hostelWhereMaint = `WHERE mr.hostel_id IN (${placeholders})`;
    queryParamsMaint.push(...assigned);

    hostelWhereInsp = `WHERE ri.hostel_id IN (${placeholders})`;
    queryParamsInsp.push(...assigned);

    hostelWhereRooms = `WHERE f.hostel_id IN (${placeholders})`;
    queryParamsRooms.push(...assigned);
  }

  // 1. Maintenance Status Breakdown
  const maintSql = `
    SELECT
      SUM(CASE WHEN mr.status = 'OPEN' THEN 1 ELSE 0 END) as openCount,
      SUM(CASE WHEN mr.status = 'ASSIGNED' THEN 1 ELSE 0 END) as assignedCount,
      SUM(CASE WHEN mr.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgressCount,
      SUM(CASE WHEN mr.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolvedCount,
      SUM(CASE WHEN mr.priority = 'URGENT' AND mr.status != 'CLOSED' THEN 1 ELSE 0 END) as urgentCount
    FROM maintenance_requests mr
    ${hostelWhereMaint}
  `;

  const [maintRows] = await db.pool.query(maintSql, queryParamsMaint);
  const m = maintRows[0] || {};
  const maintenanceMetrics = {
    openCount: Number(m.openCount || 0),
    assignedCount: Number(m.assignedCount || 0),
    inProgressCount: Number(m.inProgressCount || 0),
    resolvedCount: Number(m.resolvedCount || 0),
    urgentCount: Number(m.urgentCount || 0),
    totalActive: Number(m.openCount || 0) + Number(m.assignedCount || 0) + Number(m.inProgressCount || 0)
  };

  // 2. Inspection Metrics Today & Latest Room Conditions
  // Rooms inspected today
  const inspTodaySql = `
    SELECT COUNT(DISTINCT ri.room_id) as inspectedToday
    FROM room_inspections ri
    ${hostelWhereInsp ? hostelWhereInsp + ' AND DATE(ri.inspection_date) = CURDATE()' : 'WHERE DATE(ri.inspection_date) = CURDATE()'}
  `;
  const [inspTodayRows] = await db.pool.query(inspTodaySql, queryParamsInsp);
  const inspectedToday = Number(inspTodayRows[0]?.inspectedToday || 0);

  // Latest room health condition (using latest inspection per room)
  const latestInspSql = `
    SELECT
      ri.room_id,
      ri.hostel_id,
      ri.cleanliness_status,
      ri.electrical_status,
      ri.plumbing_status,
      ri.furniture_status,
      ri.bed_status,
      ri.safety_status
    FROM room_inspections ri
    INNER JOIN (
      SELECT room_id, MAX(id) as max_id
      FROM room_inspections
      GROUP BY room_id
    ) latest ON ri.id = latest.max_id
    ${hostelWhereInsp}
  `;
  const [latestInsps] = await db.pool.query(latestInspSql, queryParamsInsp);

  let criticalRooms = 0;
  let attentionRequiredRooms = 0;

  latestInsps.forEach(row => {
    const conds = [
      row.cleanliness_status,
      row.electrical_status,
      row.plumbing_status,
      row.furniture_status,
      row.bed_status,
      row.safety_status
    ];
    if (conds.includes('CRITICAL')) {
      criticalRooms++;
    } else if (conds.includes('ATTENTION_REQUIRED')) {
      attentionRequiredRooms++;
    }
  });

  // 3. Hostel-Wise Health Summary
  let hostelFilterClause = '';
  let hostelParams = [];
  if (actor.role === 'SUPERINTENDENT') {
    const assigned = actor.assignedHostels || [];
    hostelFilterClause = `WHERE h.id IN (${assigned.map(() => '?').join(',')})`;
    hostelParams.push(...assigned);
  }

  const hostelHealthSql = `
    SELECT
      h.id as hostel_id,
      h.name as hostel_name,
      h.code as hostel_code,
      COUNT(DISTINCT r.id) as total_rooms,
      COUNT(DISTINCT sa.id) as occupied_beds,
      COUNT(DISTINCT CASE WHEN mr.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') THEN mr.id END) as open_maintenance
    FROM hostels h
    LEFT JOIN floors f ON f.hostel_id = h.id
    LEFT JOIN rooms r ON r.floor_id = f.id
    LEFT JOIN beds b ON b.room_id = r.id
    LEFT JOIN student_allocations sa ON sa.bed_id = b.id AND sa.status = 'ACTIVE'
    LEFT JOIN maintenance_requests mr ON mr.hostel_id = h.id AND mr.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')
    ${hostelFilterClause}
    GROUP BY h.id, h.name, h.code
    ORDER BY h.id ASC
  `;

  const [hostelHealthRows] = await db.pool.query(hostelHealthSql, hostelParams);

  // Map latest room inspection critical counts per hostel
  const hostelCriticalMap = {};
  latestInsps.forEach(row => {
    const conds = [row.cleanliness_status, row.electrical_status, row.plumbing_status, row.furniture_status, row.bed_status, row.safety_status];
    if (conds.includes('CRITICAL')) {
      hostelCriticalMap[row.hostel_id] = (hostelCriticalMap[row.hostel_id] || 0) + 1;
    }
  });

  const hostelHealth = hostelHealthRows.map(h => ({
    hostel_id: h.hostel_id,
    hostel_name: h.hostel_name,
    hostel_code: h.hostel_code,
    total_rooms: Number(h.total_rooms || 0),
    occupied_beds: Number(h.occupied_beds || 0),
    open_maintenance: Number(h.open_maintenance || 0),
    critical_rooms: Number(hostelCriticalMap[h.hostel_id] || 0)
  }));

  return {
    maintenanceMetrics,
    inspectionMetrics: {
      inspectedToday,
      criticalRooms,
      attentionRequiredRooms
    },
    hostelHealth
  };
}

module.exports = {
  getOperationsSummary
};
