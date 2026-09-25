const MessService = require('../services/messService');
const { pool } = require('../config/db');

class MessController {
  /**
   * GET /api/mess/menu
   */
  static async getMenus(req, res, next) {
    try {
      const { hostel_id, date, start_date, end_date, meal_type } = req.query;
      let targetHostelId = hostel_id ? parseInt(hostel_id, 10) : undefined;

      // Student scope check: force student's own hostel ID
      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query(
          `SELECT r.hostel_id FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.user_id = ?`,
          [req.user.id]
        );
        if (st.length > 0) {
          targetHostelId = st[0].hostel_id;
        }
      } else if (req.user.role === 'SUPERINTENDENT' && targetHostelId) {
        // Superintendent scope check
        const [sh] = await pool.query(
          'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
          [req.user.id, targetHostelId]
        );
        if (sh.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to view menus for this hostel.'
          });
        }
      }

      const menus = await MessService.getMenus({
        hostelId: targetHostelId,
        date,
        startDate: start_date,
        endDate: end_date,
        mealType: meal_type
      });

      return res.status(200).json({
        success: true,
        count: menus.length,
        data: menus
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mess/menu/today
   */
  static async getTodayMenu(req, res, next) {
    try {
      let hostelId = req.query.hostel_id ? parseInt(req.query.hostel_id, 10) : undefined;

      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query(
          `SELECT r.hostel_id FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.user_id = ?`,
          [req.user.id]
        );
        if (st.length > 0) {
          hostelId = st[0].hostel_id;
        }
      }

      const items = await MessService.getTodayMenu(hostelId);

      return res.status(200).json({
        success: true,
        date: new Date().toISOString().split('T')[0],
        hostel_id: hostelId,
        data: items
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mess/menu/weekly
   */
  static async getWeeklyMenu(req, res, next) {
    try {
      let hostelId = req.query.hostel_id ? parseInt(req.query.hostel_id, 10) : undefined;

      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query(
          `SELECT r.hostel_id FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.user_id = ?`,
          [req.user.id]
        );
        if (st.length > 0) {
          hostelId = st[0].hostel_id;
        }
      } else if (req.user.role === 'SUPERINTENDENT' && !hostelId) {
        if (req.user.assignedHostels && req.user.assignedHostels.length > 0) {
          hostelId = req.user.assignedHostels[0];
        }
      }

      const result = await MessService.getWeeklyMenu(hostelId, req.query.start_date);

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/mess/menu
   */
  static async createMenuItem(req, res, next) {
    try {
      const { hostel_id, menu_date, meal_type, meal_name, description, is_available } = req.body;
      const targetHostelId = hostel_id ? parseInt(hostel_id, 10) : null;

      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot create menu items.'
        });
      }

      if (req.user.role === 'SUPERINTENDENT') {
        if (!targetHostelId) {
          return res.status(400).json({
            success: false,
            message: 'Superintendents must specify an assigned hostel_id.'
          });
        }
        const [sh] = await pool.query(
          'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
          [req.user.id, targetHostelId]
        );
        if (sh.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'You can only create menus for your assigned hostels.'
          });
        }
      }

      if (!menu_date || !meal_type || !meal_name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: menu_date, meal_type, meal_name.'
        });
      }

      const menuItem = await MessService.createMenuItem({
        hostelId: targetHostelId,
        menuDate: menu_date,
        mealType: meal_type,
        mealName: meal_name,
        description,
        isAvailable: is_available,
        createdBy: req.user.id
      });

      return res.status(201).json({
        success: true,
        message: 'Menu item created successfully.',
        data: menuItem
      });
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('Invalid meal type') || err.message.includes('required')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * PUT /api/mess/menu/:id
   */
  static async updateMenuItem(req, res, next) {
    try {
      const { id } = req.params;
      const { meal_name, description, is_available } = req.body;

      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot edit menu items.'
        });
      }

      const updated = await MessService.updateMenuItem(
        id,
        { mealName: meal_name, description, isAvailable: is_available },
        req.user
      );

      return res.status(200).json({
        success: true,
        message: 'Menu item updated successfully.',
        data: updated
      });
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.message.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * DELETE /api/mess/menu/:id
   */
  static async deleteMenuItem(req, res, next) {
    try {
      const { id } = req.params;

      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot delete menu items.'
        });
      }

      const result = await MessService.deleteMenuItem(id, req.user);

      return res.status(200).json({
        success: true,
        message: 'Menu item deleted successfully.',
        data: result
      });
    } catch (err) {
      if (err.message.includes('Unauthorized')) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.message.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * POST /api/mess/participation
   */
  static async setMealParticipation(req, res, next) {
    try {
      const { meal_date, meal_type, status, student_id } = req.body;

      if (!meal_date || !meal_type || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: meal_date, meal_type, status.'
        });
      }

      let targetStudentId;
      let targetHostelId;

      if (req.user.role === 'STUDENT') {
        // IDOR Protection: Ignore student_id passed in body, derive from req.user.id
        const [st] = await pool.query(
          `SELECT s.id, r.hostel_id FROM students s LEFT JOIN beds b ON s.bed_id = b.id LEFT JOIN rooms r ON b.room_id = r.id WHERE s.user_id = ?`,
          [req.user.id]
        );
        if (st.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Student profile not found.'
          });
        }
        targetStudentId = st[0].id;
        targetHostelId = st[0].hostel_id;
      } else {
        // Staff setting status on behalf of student
        if (!student_id) {
          return res.status(400).json({
            success: false,
            message: 'Staff must specify student_id.'
          });
        }
        const [st] = await pool.query(
          `SELECT s.id, r.hostel_id FROM students s LEFT JOIN beds b ON s.bed_id = b.id LEFT JOIN rooms r ON b.room_id = r.id WHERE s.id = ?`,
          [student_id]
        );
        if (st.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Target student not found.'
          });
        }
        targetStudentId = st[0].id;
        targetHostelId = st[0].hostel_id;

        if (req.user.role === 'SUPERINTENDENT') {
          const [sh] = await pool.query(
            'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
            [req.user.id, targetHostelId]
          );
          if (sh.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'You are not authorized for this student\'s hostel.'
            });
          }
        }
      }

      const record = await MessService.setMealParticipation({
        studentId: targetStudentId,
        hostelId: targetHostelId,
        mealDate: meal_date,
        mealType: meal_type,
        status,
        isStudentRole: req.user.role === 'STUDENT'
      });

      return res.status(200).json({
        success: true,
        message: 'Meal participation updated.',
        data: record
      });
    } catch (err) {
      if (err.message.includes('Cutoff time') || err.message.includes('Invalid')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * GET /api/mess/participation/me
   */
  static async getMyParticipation(req, res, next) {
    try {
      if (req.user.role !== 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is for student access only.'
        });
      }

      const [st] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (st.length === 0) {
        return res.status(404).json({ success: false, message: 'Student profile not found.' });
      }

      const { start_date, end_date, page, limit } = req.query;
      const data = await MessService.getStudentParticipation(st[0].id, {
        startDate: start_date,
        endDate: end_date,
        page,
        limit
      });

      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mess/participation
   */
  static async getParticipation(req, res, next) {
    try {
      const { hostel_id, meal_date, meal_type, status, page, limit, search } = req.query;
      let targetHostelId = hostel_id ? parseInt(hostel_id, 10) : undefined;

      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot view other students\' meal participation roster.'
        });
      }

      if (req.user.role === 'SUPERINTENDENT') {
        if (!targetHostelId) {
          const [sh] = await pool.query('SELECT hostel_id FROM superintendent_hostels WHERE user_id = ?', [req.user.id]);
          if (sh.length === 0) {
            return res.status(403).json({ success: false, message: 'No assigned hostels.' });
          }
          targetHostelId = sh[0].hostel_id;
        } else {
          const [sh] = await pool.query(
            'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
            [req.user.id, targetHostelId]
          );
          if (sh.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'You are not authorized to view participation for this hostel.'
            });
          }
        }
      }

      const data = await MessService.getHostelParticipation({
        hostelId: targetHostelId,
        mealDate: meal_date,
        mealType: meal_type,
        status,
        page,
        limit,
        search
      });

      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mess/summary
   */
  static async getMessSummary(req, res, next) {
    try {
      let hostelId = req.query.hostel_id ? parseInt(req.query.hostel_id, 10) : undefined;

      if (req.user.role === 'STUDENT') {
        const [st] = await pool.query(
          `SELECT r.hostel_id FROM students s JOIN beds b ON s.bed_id = b.id JOIN rooms r ON b.room_id = r.id WHERE s.user_id = ?`,
          [req.user.id]
        );
        if (st.length > 0) hostelId = st[0].hostel_id;
      } else if (req.user.role === 'SUPERINTENDENT' && hostelId) {
        const [sh] = await pool.query(
          'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
          [req.user.id, hostelId]
        );
        if (sh.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized: Hostel not assigned to superintendent.'
          });
        }
      }

      const summary = await MessService.getMessSummary(hostelId, req.query.meal_date);

      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/mess/analytics
   */
  static async getMessAnalytics(req, res, next) {
    try {
      let hostelId = req.query.hostel_id ? parseInt(req.query.hostel_id, 10) : undefined;

      if (req.user.role === 'SUPERINTENDENT' && hostelId) {
        const [sh] = await pool.query(
          'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
          [req.user.id, hostelId]
        );
        if (sh.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized: Hostel not assigned to superintendent.'
          });
        }
      }

      const analytics = await MessService.getMessAnalytics(hostelId, req.query.start_date, req.query.end_date);

      return res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/mess/menu/copy
   */
  static async copyDayMenu(req, res, next) {
    try {
      const { hostel_id, sourceDate, targetDates } = req.body;
      let targetHostelId = hostel_id ? parseInt(hostel_id, 10) : undefined;

      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Students cannot copy menu items.'
        });
      }

      if (req.user.role === 'SUPERINTENDENT') {
        if (!targetHostelId) {
          if (req.user.assignedHostels && req.user.assignedHostels.length > 0) {
            targetHostelId = req.user.assignedHostels[0].id;
          } else {
            return res.status(400).json({
              success: false,
              message: 'Superintendents must specify an assigned hostel_id.'
            });
          }
        }
        const [sh] = await pool.query(
          'SELECT 1 FROM superintendent_hostels WHERE user_id = ? AND hostel_id = ?',
          [req.user.id, targetHostelId]
        );
        if (sh.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'You can only copy menus for your assigned hostels.'
          });
        }
      }

      if (!sourceDate || !targetDates || !Array.isArray(targetDates) || targetDates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: sourceDate and non-empty targetDates array.'
        });
      }

      const result = await MessService.copyDayMenu({
        hostelId: targetHostelId,
        sourceDate,
        targetDates,
        user: req.user
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MessController;
