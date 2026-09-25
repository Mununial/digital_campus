const { pool } = require('../config/db');
const activityService = require('./activityService');

/**
 * Cutoff time checker for student meal participation.
 * Default cutoff rules:
 * - BREAKFAST: 07:00 (7 AM same day)
 * - LUNCH:     09:00 (9 AM same day)
 * - SNACKS:    14:00 (2 PM same day)
 * - DINNER:    17:00 (5 PM same day)
 *
 * @param {string} mealDate - 'YYYY-MM-DD'
 * @param {string} mealType - 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER'
 * @returns {boolean} true if cutoff has passed, false if still allowed
 */
const isCutoffPassed = (mealDate, mealType) => {
  const now = new Date();
  const targetDate = new Date(mealDate + 'T00:00:00');
  
  // Cutoff hour definitions (24h format)
    const cutoffHours = {
    BREAKFAST: 7,
    LUNCH: 9,
    DINNER: 17
  };

  const cutoffHour = cutoffHours[mealType] ?? 12;

  // Set the cutoff deadline date/time
  const cutoffTime = new Date(mealDate + 'T00:00:00');
  cutoffTime.setHours(cutoffHour, 0, 0, 0);

  // If targetDate is in the past (before today), cutoff has passed
  const todayStr = now.toISOString().split('T')[0];
  if (mealDate < todayStr) return true;

  // If targetDate is today, compare current time with cutoff time
  if (mealDate === todayStr) {
    return now.getTime() >= cutoffTime.getTime();
  }

  // Future dates are allowed
  return false;
};

const DEFAULT_WEEKLY_TEMPLATE = [
  // Day 0: Monday
  { dayIndex: 0, meal_type: 'BREAKFAST', meal_name: 'Puri Sabzi & Boiled Egg / Banana', description: 'Hot puris with spiced aloo chana sabzi, boiled egg or banana, and hot tea' },
  { dayIndex: 0, meal_type: 'LUNCH', meal_name: 'Steamed Rice, Dal Tadka & Mix Veg', description: 'Basmati rice, yellow dal tadka, seasonal mixed vegetables, crispy papad, salad and curd' },
  { dayIndex: 0, meal_type: 'DINNER', meal_name: 'Tawa Roti, Egg Curry / Paneer Butter Masala', description: 'Fresh wheat rotis, rich egg curry or paneer butter masala, steamed rice and dal fry' },

  // Day 1: Tuesday
  { dayIndex: 1, meal_type: 'BREAKFAST', meal_name: 'Idli Sambar & Coconut Chutney', description: 'Soft steamed idlis with piping hot vegetable sambar and fresh coconut chutney' },
  { dayIndex: 1, meal_type: 'LUNCH', meal_name: 'Rice, Dal Fry, Aloo Gobhi Matar & Salad', description: 'Steamed rice, arhar dal fry, homestyle aloo gobhi matar sabzi and green salad' },
  { dayIndex: 1, meal_type: 'DINNER', meal_name: 'Roti, Veg Pulao, Dal Makhani & Sweet Kheer', description: 'Soft rotis, aromatic veg pulao, creamy dal makhani, mix veg curry and sweet rice kheer' },

  // Day 2: Wednesday
  { dayIndex: 2, meal_type: 'BREAKFAST', meal_name: 'Aloo Paratha with Curd & Pickle', description: 'Stuffed aloo parathas served with fresh curd, mango pickle and hot masala chai' },
  { dayIndex: 2, meal_type: 'LUNCH', meal_name: 'Rice, Odia Dalma & Bhindi Kurkuri', description: 'Steamed rice, authentic vegetable dalma, crispy bhindi fry and papad' },
  { dayIndex: 2, meal_type: 'DINNER', meal_name: 'Roti, Chicken Curry / Shahi Paneer & Rice', description: 'Hot rotis, special chicken curry or shahi paneer, jeera rice and dal tadka' },

  // Day 3: Thursday
  { dayIndex: 3, meal_type: 'BREAKFAST', meal_name: 'Uttapam / Masala Dosa with Sambar', description: 'Crispy dosa / onion uttapam served with lentil sambar and tomato chutney' },
  { dayIndex: 3, meal_type: 'LUNCH', meal_name: 'Rice, Chana Dal & Aloo Baingan Bhaja', description: 'Steamed rice, chana dal fry, spiced aloo baingan bhaja and cucumber salad' },
  { dayIndex: 3, meal_type: 'DINNER', meal_name: 'Phulka Roti, Jeera Rice, Kadai Sabzi & Gulab Jamun', description: 'Phulka rotis, jeera rice, seasonal kadai veg curry, dal fry and warm gulab jamun' },

  // Day 4: Friday
  { dayIndex: 4, meal_type: 'BREAKFAST', meal_name: 'Poha with Peanuts & Sev', description: 'Indori poha garnished with roasted peanuts, coriander and sev, boiled egg or fruit' },
  { dayIndex: 4, meal_type: 'LUNCH', meal_name: 'Rice, Yellow Moong Dal, Soyabean Aloo Curry', description: 'Steamed rice, yellow moong dal, soya chunks aloo curry and roasted papad' },
  { dayIndex: 4, meal_type: 'DINNER', meal_name: 'Roti, Egg Masala / Kadai Paneer, Rice & Dal', description: 'Fresh wheat rotis, egg curry or kadai paneer, steamed rice and dal fry' },

  // Day 5: Saturday
  { dayIndex: 5, meal_type: 'BREAKFAST', meal_name: 'Bread Butter Jam & Veg Cutlet / Omelette', description: 'Toasted bread with butter & fruit jam, crispy vegetable cutlet or masala omelette' },
  { dayIndex: 5, meal_type: 'LUNCH', meal_name: 'Rice, Dal Makhani & Kashmiri Aloo Dum', description: 'Steamed rice, rich dal makhani, Kashmiri aloo dum and cucumber tomato salad' },
  { dayIndex: 5, meal_type: 'DINNER', meal_name: 'Roti, Veg Fried Rice & Manchurian / Chilli Paneer', description: 'Soft rotis, Indo-Chinese veg fried rice, veg manchurian gravy / chilli paneer' },

  // Day 6: Sunday
  { dayIndex: 6, meal_type: 'BREAKFAST', meal_name: 'Chole Bhature & Masala Chai', description: 'Fluffy bhaturas with Punjabi chole, sliced onions & green chillies and special masala tea' },
  { dayIndex: 6, meal_type: 'LUNCH', meal_name: 'Sunday Special: Biryani / Chicken Curry / Shahi Paneer', description: 'Weekend special biryani / ghee rice, chicken masala / shahi paneer, boondi raita, papad & sweet' },
  { dayIndex: 6, meal_type: 'DINNER', meal_name: 'Roti, Special Bhog Khichdi, Aloo Bhaja & Ice Cream', description: 'Roti, special bhog khichdi / steamed rice, aloo bhaja, dal and ice cream' }
];

class MessService {
  /**
   * Fetch menu items by hostel and/or date range.
   */
  static async getMenus({ hostelId, date, startDate, endDate, mealType }) {
    let sql = `
      SELECT m.id, m.hostel_id, DATE_FORMAT(m.menu_date, '%Y-%m-%d') as menu_date, m.meal_type, m.meal_name, m.description, m.is_available, m.created_by, m.created_at, m.updated_at, h.name as hostel_name, u.username as creator_name
      FROM mess_menus m
      LEFT JOIN hostels h ON m.hostel_id = h.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (hostelId !== undefined && hostelId !== null) {
      sql += ` AND (m.hostel_id = ? OR m.hostel_id IS NULL)`;
      params.push(hostelId);
    }

    if (date) {
      sql += ` AND m.menu_date = ?`;
      params.push(date);
    } else if (startDate && endDate) {
      sql += ` AND m.menu_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    if (mealType) {
      sql += ` AND m.meal_type = ?`;
      params.push(mealType);
    }

    sql += ` ORDER BY m.menu_date ASC, FIELD(m.meal_type, 'BREAKFAST', 'LUNCH', 'DINNER')`;

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Get today's menu for a hostel.
   */
  static async getTodayMenu(hostelId) {
    const today = new Date().toISOString().split('T')[0];
    return this.getMenus({ hostelId, date: today });
  }

  /**
   * Ensure standard default mess menu exists for a week range.
   */
  static async ensureDefaultWeeklyMenu(hostelId, startStr) {
    const monday = new Date(startStr);
    for (const t of DEFAULT_WEEKLY_TEMPLATE) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + t.dayIndex);
      const menuDate = d.toISOString().split('T')[0];

      let dupCheckSql = `
        SELECT id FROM mess_menus
        WHERE menu_date = ? AND meal_type = ? AND (hostel_id = ? OR (hostel_id IS NULL AND ? IS NULL))
      `;
      const [existing] = await pool.query(dupCheckSql, [menuDate, t.meal_type, hostelId || null, hostelId || null]);

      if (existing.length === 0) {
        const insertSql = `
          INSERT INTO mess_menus (hostel_id, menu_date, meal_type, meal_name, description, is_available, created_by)
          VALUES (?, ?, ?, ?, ?, 1, 1)
        `;
        await pool.query(insertSql, [hostelId || null, menuDate, t.meal_type, t.meal_name, t.description]);
      }
    }
  }

  /**
   * Get weekly menu starting from startDate or current week's Monday.
   */
  static async getWeeklyMenu(hostelId, startDate) {
    let monday;
    if (startDate) {
      monday = new Date(startDate);
    } else {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      monday = new Date(now.setDate(diff));
    }

    const startStr = monday.toISOString().split('T')[0];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const endStr = sunday.toISOString().split('T')[0];

    let rows = await this.getMenus({ hostelId, startDate: startStr, endDate: endStr });

    // If weekly rows are empty or fewer than 21, auto-seed default menu items for this week
    if (!rows || rows.length < 21) {
      await this.ensureDefaultWeeklyMenu(hostelId, startStr);
      rows = await this.getMenus({ hostelId, startDate: startStr, endDate: endStr });
    }

    return {
      startDate: startStr,
      endDate: endStr,
      items: rows
    };
  }

  /**
   * Get menu item by ID.
   */
  static async getMenuItemById(id) {
    const sql = `
      SELECT m.id, m.hostel_id, DATE_FORMAT(m.menu_date, '%Y-%m-%d') as menu_date, m.meal_type, m.meal_name, m.description, m.is_available, m.created_by, m.created_at, m.updated_at, h.name as hostel_name
      FROM mess_menus m
      LEFT JOIN hostels h ON m.hostel_id = h.id
      WHERE m.id = ?
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Create a new menu item.
   * If an item already exists for (hostel_id, menu_date, meal_type), upsert/update it.
   */
  static async createMenuItem({ hostelId, menuDate, mealType, mealName, description, isAvailable, createdBy }) {
    const validMealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'];
    if (!validMealTypes.includes(mealType)) {
      throw new Error(`Invalid meal type: ${mealType}. Must be one of BREAKFAST, LUNCH, DINNER.`);
    }

    if (!mealName || !mealName.trim()) {
      throw new Error('Meal name is required.');
    }

    // Check for existing entry for same hostel/date/meal_type
    let dupCheckSql = `
      SELECT id FROM mess_menus
      WHERE menu_date = ? AND meal_type = ? AND (hostel_id = ? OR (hostel_id IS NULL AND ? IS NULL))
    `;
    const [existing] = await pool.query(dupCheckSql, [menuDate, mealType, hostelId || null, hostelId || null]);
    
    let targetId;
    if (existing.length > 0) {
      targetId = existing[0].id;
      const updateSql = `
        UPDATE mess_menus
        SET meal_name = ?, description = ?, is_available = ?
        WHERE id = ?
      `;
      await pool.query(updateSql, [
        mealName.trim(),
        description ? description.trim() : null,
        isAvailable !== undefined ? (isAvailable ? 1 : 0) : 1,
        targetId
      ]);
    } else {
      const insertSql = `
        INSERT INTO mess_menus (hostel_id, menu_date, meal_type, meal_name, description, is_available, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const [result] = await pool.query(insertSql, [
        hostelId || null,
        menuDate,
        mealType,
        mealName.trim(),
        description ? description.trim() : null,
        isAvailable !== undefined ? (isAvailable ? 1 : 0) : 1,
        createdBy
      ]);
      targetId = result.insertId;
    }

    const created = await this.getMenuItemById(targetId);

    await activityService.logActivity({
      actorId: createdBy,
      action: 'MENU_CREATED',
      module: 'MESS',
      entityType: 'MENU',
      entityId: targetId,
      hostelId: hostelId || null,
      description: `Saved ${mealType} mess menu '${mealName.trim()}' for ${menuDate}`,
      metadata: { menu_date: menuDate, meal_type: mealType }
    });

    return created;
  }

  /**
   * Update menu item.
   */
  static async updateMenuItem(id, { mealName, description, isAvailable }, user) {
    const existing = await this.getMenuItemById(id);
    if (!existing) {
      throw new Error('Menu item not found.');
    }

    // Scope check: Superintendents can only update menus for assigned hostels (or general menus if assigned to at least one hostel)
    if (user.role === 'SUPERINTENDENT' && existing.hostel_id) {
      const [sh] = await pool.query(
        'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
        [user.id, existing.hostel_id]
      );
      if (sh.length === 0) {
        throw new Error('Unauthorized: You can only update menus for your assigned hostels.');
      }
    }

    const updateSql = `
      UPDATE mess_menus
      SET meal_name = COALESCE(?, meal_name),
          description = COALESCE(?, description),
          is_available = COALESCE(?, is_available)
      WHERE id = ?
    `;

    const availVal = isAvailable !== undefined ? (isAvailable ? 1 : 0) : null;
    await pool.query(updateSql, [
      mealName !== undefined ? mealName.trim() : null,
      description !== undefined ? description.trim() : null,
      availVal,
      id
    ]);

    await activityService.logActivity({
      actorId: user.id,
      action: 'MENU_UPDATED',
      module: 'MESS',
      entityType: 'MENU',
      entityId: id,
      hostelId: existing.hostel_id,
      description: `Updated ${existing.meal_type} mess menu #${id}`,
      metadata: { meal_type: existing.meal_type, is_available: availVal }
    });

    return this.getMenuItemById(id);
  }

  /**
   * Copy all meals from sourceDate to multiple targetDates for a hostel.
   */
  static async copyDayMenu({ hostelId, sourceDate, targetDates, user }) {
    if (!Array.isArray(targetDates) || targetDates.length === 0) {
      throw new Error('At least one target date is required.');
    }

    // Authorization check for SUPERINTENDENT
    if (user.role === 'SUPERINTENDENT' && hostelId) {
      const [sh] = await pool.query(
        'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
        [user.id, hostelId]
      );
      if (sh.length === 0) {
        throw new Error('Unauthorized: You can only copy menus for your assigned hostels.');
      }
    }

    // Get source date menu items
    const sourceItems = await this.getMenus({ hostelId: hostelId || null, date: sourceDate });
    if (sourceItems.length === 0) {
      throw new Error(`No menu items found on source date ${sourceDate} to copy.`);
    }

    let copiedCount = 0;
    for (const targetDate of targetDates) {
      if (targetDate === sourceDate) continue;

      for (const item of sourceItems) {
        let checkSql = `
          SELECT id FROM mess_menus 
          WHERE menu_date = ? AND meal_type = ? AND (hostel_id = ? OR (hostel_id IS NULL AND ? IS NULL))
        `;
        const [existing] = await pool.query(checkSql, [targetDate, item.meal_type, hostelId || null, hostelId || null]);

        if (existing.length > 0) {
          await pool.query(
            `UPDATE mess_menus SET meal_name = ?, description = ?, is_available = ? WHERE id = ?`,
            [item.meal_name, item.description, item.is_available, existing[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO mess_menus (hostel_id, menu_date, meal_type, meal_name, description, is_available, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [hostelId || null, targetDate, item.meal_type, item.meal_name, item.description, item.is_available, user.id]
          );
        }
        copiedCount++;
      }
    }

    await activityService.logActivity({
      actorId: user.id,
      action: 'MENU_COPIED',
      module: 'MESS',
      entityType: 'MENU',
      entityId: null,
      hostelId: hostelId || null,
      description: `Copied ${sourceDate} menu to ${targetDates.length} target dates`,
      metadata: { source_date: sourceDate, target_count: targetDates.length }
    });

    return { success: true, copiedCount, targetDates };
  }

  /**
   * Delete menu item.
   */
  static async deleteMenuItem(id, user) {
    const existing = await this.getMenuItemById(id);
    if (!existing) {
      throw new Error('Menu item not found.');
    }

    if (user.role === 'SUPERINTENDENT') {
      const [sh] = await pool.query(
        'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
        [user.id, existing.hostel_id]
      );
      if (sh.length === 0) {
        throw new Error('Unauthorized: You can only delete menus for your assigned hostels.');
      }
    }

    await pool.query('DELETE FROM mess_menus WHERE id = ?', [id]);
    return { success: true, id };
  }

  /**
   * Record or update student meal participation (TAKING / NOT_TAKING).
   * Enforces cutoff verification for student roles.
   */
  static async setMealParticipation({ studentId, hostelId, mealDate, mealType, status, isStudentRole = true }) {
    const validMealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    if (!validMealTypes.includes(mealType)) {
      throw new Error(`Invalid meal type: ${mealType}.`);
    }

    const validStatus = ['TAKING', 'NOT_TAKING'];
    if (!validStatus.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be TAKING or NOT_TAKING.`);
    }

    // Cutoff check for student
    if (isStudentRole && isCutoffPassed(mealDate, mealType)) {
      throw new Error(`Cutoff time for ${mealType} on ${mealDate} has passed. Updates are no longer allowed.`);
    }

    const upsertSql = `
      INSERT INTO meal_attendance (student_id, hostel_id, meal_date, meal_type, status, marked_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE status = VALUES(status), marked_at = NOW()
    `;

    await pool.query(upsertSql, [studentId, hostelId, mealDate, mealType, status]);

    const [rows] = await pool.query(
      `SELECT * FROM meal_attendance WHERE student_id = ? AND meal_date = ? AND meal_type = ?`,
      [studentId, mealDate, mealType]
    );

    return rows[0];
  }

  /**
   * Get student's own meal participation history.
   */
  static async getStudentParticipation(studentId, { startDate, endDate, page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (p - 1) * l;

    let whereClause = `WHERE ma.student_id = ?`;
    const params = [studentId];

    if (startDate && endDate) {
      whereClause += ` AND ma.meal_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    const countSql = `SELECT COUNT(*) as total FROM meal_attendance ma ${whereClause}`;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT ma.*, m.meal_name, m.description as menu_description
      FROM meal_attendance ma
      LEFT JOIN mess_menus m ON (ma.hostel_id = m.hostel_id OR m.hostel_id IS NULL) 
                             AND ma.meal_date = m.menu_date 
                             AND ma.meal_type = m.meal_type
      ${whereClause}
      ORDER BY ma.meal_date DESC, FIELD(ma.meal_type, 'BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER')
      LIMIT ${l} OFFSET ${offset}
    `;

    const [records] = await pool.query(dataSql, params);

    return {
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      records
    };
  }

  /**
   * Get hostel meal participation roster (Staff view).
   */
  static async getHostelParticipation({ hostelId, mealDate, mealType, status, page = 1, limit = 20, search }) {
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (p - 1) * l;

    let whereClause = `WHERE ma.hostel_id = ?`;
    const params = [hostelId];

    if (mealDate) {
      whereClause += ` AND ma.meal_date = ?`;
      params.push(mealDate);
    }

    if (mealType) {
      whereClause += ` AND ma.meal_type = ?`;
      params.push(mealType);
    }

    if (status) {
      whereClause += ` AND ma.status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      whereClause += ` AND (s.full_name LIKE ? OR s.student_id LIKE ? OR s.roll_number LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const countSql = `
      SELECT COUNT(*) as total
      FROM meal_attendance ma
      JOIN students s ON ma.student_id = s.id
      ${whereClause}
    `;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT ma.*, s.full_name as student_name, s.student_id as student_code, r.room_number
      FROM meal_attendance ma
      JOIN students s ON ma.student_id = s.id
      LEFT JOIN beds b ON s.bed_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      ${whereClause}
      ORDER BY ma.meal_date DESC, FIELD(ma.meal_type, 'BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'), s.full_name ASC
      LIMIT ${l} OFFSET ${offset}
    `;

    const [records] = await pool.query(dataSql, params);

    return {
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      records
    };
  }

  /**
   * Get mess summary & expected counts for today or specific date.
   */
  static async getMessSummary(hostelId, mealDate) {
    const targetDate = mealDate || new Date().toISOString().split('T')[0];

    // Total active students in this hostel
    let studentCountSql = `SELECT COUNT(*) as total FROM students s WHERE s.status = 'ACTIVE'`;
    const studentParams = [];
    if (hostelId) {
      studentCountSql = `SELECT COUNT(*) as total FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.status = 'ACTIVE' AND r.hostel_id = ?`;
      studentParams.push(hostelId);
    }

    const [studentRows] = await pool.query(studentCountSql, studentParams);
    const totalStudents = studentRows[0]?.total || 0;

    // Get menu for target date
    const menuItems = await this.getMenus({ hostelId, date: targetDate });

    // Get participation stats per meal
    let participationSql = `
      SELECT meal_type, status, COUNT(*) as count
      FROM meal_attendance
      WHERE meal_date = ?
    `;
    const partParams = [targetDate];
    if (hostelId) {
      participationSql += ` AND hostel_id = ?`;
      partParams.push(hostelId);
    }
    participationSql += ` GROUP BY meal_type, status`;

    const [partRows] = await pool.query(participationSql, partParams);

    const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    const summary = {};

    mealTypes.forEach(type => {
      const takingRow = partRows.find(r => r.meal_type === type && r.status === 'TAKING');
      const notTakingRow = partRows.find(r => r.meal_type === type && r.status === 'NOT_TAKING');

      const taking = takingRow ? Number(takingRow.count) : 0;
      const notTaking = notTakingRow ? Number(notTakingRow.count) : 0;

      // Default assume taking unless explicitly marked NOT_TAKING
      const unselected = Math.max(0, totalStudents - (taking + notTaking));

      summary[type] = {
        mealType: type,
        taking,
        notTaking,
        unselected,
        totalActiveStudents: totalStudents,
        expectedMeals: taking + unselected, // Default opt-in if unselected
        menu: menuItems.find(m => m.meal_type === type) || null
      };
    });

    return {
      date: targetDate,
      hostelId: hostelId || 'ALL',
      totalStudents,
      meals: summary
    };
  }

  /**
   * Get basic mess analytics (participation percentages).
   */
  static async getMessAnalytics(hostelId, startDate, endDate) {
    const end = endDate || new Date().toISOString().split('T')[0];
    let start = startDate;
    if (!start) {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    }

    let sql = `
      SELECT meal_type, status, COUNT(*) as count
      FROM meal_attendance
      WHERE meal_date BETWEEN ? AND ?
    `;
    const params = [start, end];
    if (hostelId) {
      sql += ` AND hostel_id = ?`;
      params.push(hostelId);
    }
    sql += ` GROUP BY meal_type, status`;

    const [rows] = await pool.query(sql, params);

    const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    const analytics = {};

    mealTypes.forEach(type => {
      const taking = Number(rows.find(r => r.meal_type === type && r.status === 'TAKING')?.count || 0);
      const notTaking = Number(rows.find(r => r.meal_type === type && r.status === 'NOT_TAKING')?.count || 0);
      const total = taking + notTaking;
      const percentage = total > 0 ? parseFloat(((taking / total) * 100).toFixed(1)) : 100;

      analytics[type] = {
        taking,
        notTaking,
        totalResponses: total,
        participationPercentage: percentage
      };
    });

    return {
      startDate: start,
      endDate: end,
      hostelId: hostelId || 'ALL',
      analytics
    };
  }

  /**
   * Copy all meals from a source date to multiple target dates for a hostel.
   */
  static async copyDayMenu({ hostelId, sourceDate, targetDates, user }) {
    if (!sourceDate || !targetDates || !Array.isArray(targetDates) || targetDates.length === 0) {
      throw new Error('Invalid sourceDate or targetDates provided.');
    }

    // Fetch source day items
    const sourceItems = await this.getMenus({ hostelId, date: sourceDate });
    if (!sourceItems || sourceItems.length === 0) {
      throw new Error(`No menu items found for source date ${sourceDate}.`);
    }

    let itemsCopiedCount = 0;

    for (const targetDate of targetDates) {
      for (const item of sourceItems) {
        // Upsert item for (targetDate, meal_type, hostelId)
        let dupCheckSql = `
          SELECT id FROM mess_menus
          WHERE menu_date = ? AND meal_type = ? AND (hostel_id = ? OR (hostel_id IS NULL AND ? IS NULL))
        `;
        const [existing] = await pool.query(dupCheckSql, [targetDate, item.meal_type, hostelId || null, hostelId || null]);

        if (existing.length > 0) {
          const updateSql = `
            UPDATE mess_menus
            SET meal_name = ?, description = ?, is_available = ?
            WHERE id = ?
          `;
          await pool.query(updateSql, [item.meal_name, item.description, item.is_available, existing[0].id]);
        } else {
          const insertSql = `
            INSERT INTO mess_menus (hostel_id, menu_date, meal_type, meal_name, description, is_available, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          await pool.query(insertSql, [
            hostelId || null,
            targetDate,
            item.meal_type,
            item.meal_name,
            item.description,
            item.is_available,
            user ? user.id : null
          ]);
        }
        itemsCopiedCount++;
      }
    }

    if (user && user.id) {
      await activityService.logActivity({
        actorId: user.id,
        action: 'MENU_COPIED',
        module: 'MESS',
        entityType: 'MENU',
        hostelId: hostelId || null,
        description: `Copied menu from ${sourceDate} to ${targetDates.length} days (${targetDates.join(', ')})`,
        metadata: { sourceDate, targetDates, itemsCopiedCount }
      });
    }

    return {
      success: true,
      message: `Successfully copied menu from ${sourceDate} to ${targetDates.length} day(s).`,
      copiedItemsCount: itemsCopiedCount
    };
  }
}

module.exports = MessService;
