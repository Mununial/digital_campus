import axios from 'axios';

// Get API base URL from Vite environment variables (safe for browser)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor (for future authorization tokens)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') ||
                  localStorage.getItem('portalToken') ||
                  localStorage.getItem('token') ||
                  localStorage.getItem('college_erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (centralized error handling)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const serverMessage = error.response?.data?.message || error.response?.data?.error || error.message;
    const customError = {
      message: serverMessage || 'An error occurred while communicating with the server.',
      status: error.response?.status || 500,
      data: error.response?.data || null,
      response: error.response
    };
    
    // Log error for debugging
    console.error('API Error:', customError);
    
    return Promise.reject(customError);
  }
);

// Dashboard overview API method attached to api instance
api.getDashboardOverview = () => api.get('/dashboard/overview');



// Notice API methods
api.getNotices = (params = {}) => api.get('/notices', { params });
api.getUnreadCount = () => api.get('/notices/unread-count');
api.getNoticeById = (id) => api.get(`/notices/${id}`);
api.createNotice = (data) => api.post('/notices', data);
api.updateNotice = (id, data) => api.put(`/notices/${id}`, data);
api.updateNoticeStatus = (id, status) => api.patch(`/notices/${id}/status`, { status });
api.markNoticeRead = (id) => api.post(`/notices/${id}/read`);
api.deleteNotice = (id) => api.delete(`/notices/${id}`);

// Complaint API methods
api.getComplaints = (params = {}) => api.get('/complaints', { params });
api.getComplaintSummary = () => api.get('/complaints/summary');
api.getComplaintById = (id) => api.get(`/complaints/${id}`);
api.createComplaint = (data) => api.post('/complaints', data);
api.updateComplaintStatus = (id, status, comment = '', resolution = '') => api.patch(`/complaints/${id}/status`, { status, comment, resolution });
api.deleteComplaint = (id) => api.delete(`/complaints/${id}`);
api.assignComplaint = (id, assignedTo) => api.post(`/complaints/${id}/assign`, { assignedTo });
api.addComplaintComment = (id, comment, isInternal = false) => api.post(`/complaints/${id}/comments`, { comment, isInternal });

// Visitor API methods
api.getVisits = (params = {}) => api.get('/visitors', { params });
api.getVisitorSummary = () => api.get('/visitors/summary');
api.getCurrentVisitors = (params = {}) => api.get('/visitors/current', { params });
api.getVisitById = (id) => api.get(`/visitors/${id}`);
api.createVisit = (data) => api.post('/visitors', data);
api.approveVisit = (id, comment = '') => api.post(`/visitors/${id}/approve`, { comment });
api.rejectVisit = (id, comment = '') => api.post(`/visitors/${id}/reject`, { comment });
api.cancelVisit = (id, comment = '') => api.post(`/visitors/${id}/cancel`, { comment });
api.checkInVisit = (id, comment = '') => api.post(`/visitors/${id}/check-in`, { comment });
api.checkOutVisit = (id, comment = '') => api.post(`/visitors/${id}/check-out`, { comment });

// Mess & Food Management API methods
api.getMessMenus = (params = {}) => api.get('/mess/menu', { params });
api.getTodayMessMenu = (params = {}) => api.get('/mess/menu/today', { params });
api.getWeeklyMessMenu = (params = {}) => api.get('/mess/menu/weekly', { params });
api.createMessMenuItem = (data) => api.post('/mess/menu', data);
api.updateMessMenuItem = (id, data) => api.put(`/mess/menu/${id}`, data);
api.deleteMessMenuItem = (id) => api.delete(`/mess/menu/${id}`);

api.getMealParticipationRoster = (params = {}) => api.get('/mess/participation', { params });
api.getMyMealParticipation = (params = {}) => api.get('/mess/participation/me', { params });
api.setMealParticipation = (data) => api.post('/mess/participation', data);

api.getMessSummary = (params = {}) => api.get('/mess/summary', { params });
api.getMessAnalytics = (params = {}) => api.get('/mess/analytics', { params });

// Fee & Payment Management API methods
api.getFeeStructures = (params = {}) => api.get('/fees/structures', { params });
api.createFeeStructure = (data) => api.post('/fees/structures', data);
api.updateFeeStructure = (id, data) => api.put(`/fees/structures/${id}`, data);
api.toggleFeeStructureStatus = (id, is_active) => api.patch(`/fees/structures/${id}/status`, { is_active });

api.getStudentFees = (params = {}) => api.get('/fees', { params });
api.getMyFees = (params = {}) => api.get('/fees/me', { params });
api.getStudentFeeById = (id) => api.get(`/fees/${id}`);
api.assignStudentFee = (data) => api.post('/fees/assign', data);
api.waiveStudentFee = (id, waiver_reason) => api.patch(`/fees/${id}/waive`, { waiver_reason });

api.getPayments = (params = {}) => api.get('/fees/payments', { params });
api.recordPayment = (data) => api.post('/fees/payments', data);
api.getPaymentReceipt = (paymentId) => api.get(`/fees/receipts/${paymentId}`);

api.getFeeSummary = (params = {}) => api.get('/fees/summary', { params });

// Reports & Analytics Center API methods
api.getOverviewReport = (params = {}) => api.get('/reports/overview', { params });
api.getReportOverview = api.getOverviewReport;

api.getStudentReport = (params = {}) => api.get('/reports/students', { params });
api.getReportStudents = api.getStudentReport;

api.getAttendanceReport = (params = {}) => api.get('/reports/attendance', { params });
api.getReportAttendance = api.getAttendanceReport;

api.getOccupancyReport = (params = {}) => api.get('/reports/occupancy', { params });
api.getReportOccupancy = api.getOccupancyReport;

api.getComplaintReport = (params = {}) => api.get('/reports/complaints', { params });
api.getReportComplaints = api.getComplaintReport;

api.getVisitorReport = (params = {}) => api.get('/reports/visitors', { params });
api.getReportVisitors = api.getVisitorReport;

api.getMessReport = (params = {}) => api.get('/reports/mess', { params });
api.getReportMess = api.getMessReport;

api.getFeeReport = (params = {}) => api.get('/reports/fees', { params });
api.getReportFees = api.getFeeReport;

// Attendance Management API methods
api.getHostelAttendance = (hostelId, date) => api.get(`/attendance/hostel/${hostelId}`, { params: { date } });
api.getHostelAttendanceSummary = (hostelId, date) => api.get(`/attendance/hostel/${hostelId}/summary`, { params: { date } });
api.getStudentAttendance = (studentId) => api.get(`/attendance/student/${studentId}`);
api.getMyAttendance = () => api.get('/attendance/me');
api.getAttendanceRange = (params = {}) => api.get('/attendance/range', { params });
api.bulkMarkAttendance = (data) => api.post('/attendance/bulk', data);
api.updateAttendanceRecord = (id, status) => api.put(`/attendance/${id}`, { status });

// Student Allocations, Transfers & Checkout API methods
api.getAllocations = async (params = {}) => {
  try {
    const res = await api.get('/allocations', { params });
    if (res && (res.data || Array.isArray(res))) return res;
  } catch (err) {
    console.warn('API /allocations notice, checking authentic database snapshot:', err.message);
  }
  try {
    const snapshotRes = await fetch('/data/allocationsMaster.json');
    if (snapshotRes.ok) {
      const catalog = await snapshotRes.json();
      const seen = new Set();
      const list = [];
      for (const item of Object.values(catalog)) {
        if (item?.currentAllocation && !seen.has(item.currentAllocation.id)) {
          seen.add(item.currentAllocation.id);
          list.push({
            ...item.currentAllocation,
            full_name: item.student.full_name,
            roll_number: item.student.roll_number,
            branch: item.student.branch
          });
        }
      }
      return { data: list, total: list.length };
    }
  } catch (catErr) {}
  return { data: [], total: 0 };
};

api.getAllocationById = (id) => api.get(`/allocations/${id}`);

api.getMyAllocation = async () => {
  // First, check Day Scholar status from session
  try {
    const rawUser = localStorage.getItem('bec_portal_user') || localStorage.getItem('user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.hostel_required === 'No' || u.isDayScholar) {
        const dayScholarErr = new Error('You are a Day Scholar. Hostel facility not applicable.');
        dayScholarErr.status = 403;
        dayScholarErr.response = {
          status: 403,
          data: {
            isDayScholar: true,
            message: 'You are a Day Scholar. Hostel facility not applicable.'
          }
        };
        throw dayScholarErr;
      }
    }
  } catch (parseErr) {
    if (parseErr.status === 403) throw parseErr;
  }

  // 1. Try real server API endpoint
  try {
    const res = await api.get('/allocations/me');
    if (res && (res.currentAllocation || res.data?.currentAllocation)) {
      return res;
    }
  } catch (err) {
    if (err.status === 403 || err.response?.status === 403) {
      throw err;
    }
    console.warn('API /allocations/me notice, checking authentic database snapshot:', err.message);
  }

  // 2. Static Firebase Hosting fallback: resolve from authentic exported allocations catalog
  try {
    const rawUser = localStorage.getItem('bec_portal_user') || localStorage.getItem('user');
    const u = rawUser ? JSON.parse(rawUser) : {};
    const key = (u.rollNo || u.roll_number || u.username || u.email || '').toLowerCase().trim();

    const snapshotRes = await fetch('/data/allocationsMaster.json');
    if (snapshotRes.ok) {
      const catalog = await snapshotRes.json();
      const match = catalog[key] || catalog[u.email?.toLowerCase()] || catalog[u.id];
      if (match) {
        return { data: match };
      }
    }
  } catch (catErr) {
    console.warn('Allocations catalog lookup error:', catErr.message);
  }

  throw new Error('No accommodation profile found.');
};

api.getStudentAllocationHistory = (studentId) => api.get(`/allocations/student/${studentId}/history`);
api.getAvailableBeds = (hostel_id, room_id) => api.get('/allocations/available-beds', { params: { hostel_id, room_id } });
api.allocateStudent = (data) => api.post('/allocations', data);
api.transferStudent = (id, data) => api.post(`/allocations/${id}/transfer`, data);
api.checkoutStudent = (id, data) => api.post(`/allocations/${id}/checkout`, data);
api.getAllocationConsistency = () => api.get('/allocations/consistency');

// Student Management API methods
api.getStudents = (params = {}) => api.get('/students', { params });
api.getStudentById = (id) => api.get(`/students/${id}`);
api.createStudent = (data) => api.post('/students', data);
api.bulkImportStudents = (records) => api.post('/students/bulk-import', { records });
api.updateStudent = (id, data) => api.put(`/students/${id}`, data);
api.deactivateStudent = (id, status) => api.patch(`/students/${id}/deactivate`, { status });

// User Management & Security Hardening API methods
api.getUsers = (params = {}) => api.get('/users', { params });
api.getUserById = (id) => api.get(`/users/${id}`);
api.createUser = (data) => api.post('/users', data);
api.updateUserStatus = (id, status) => api.patch(`/users/${id}/status`, { status });
api.updateUserRole = (id, role) => api.patch(`/users/${id}/role`, { role });
api.adminResetPassword = (id, new_password) => api.post(`/users/${id}/reset-password`, { new_password });
api.updateSuperintendentHostels = (id, hostel_ids) => api.put(`/users/${id}/hostels`, { hostel_ids });
api.getMe = () => api.get('/auth/me');
api.changePassword = (data) => api.post('/auth/change-password', data);
api.updateSelfProfile = (data) => api.patch('/profile', data);
api.getAuditLogs = (params = {}) => api.get('/security/audit', { params });

// Phase 17 — Master Data & Data Integrity Center API methods
api.getMasterSummary = () => api.get('/master/summary');
api.getDataIntegrity = (params = {}) => api.get('/master/data-integrity', { params });
api.getDataIntegritySummary = () => api.get('/data-integrity/summary');
api.repairDataIntegrity = (issueType, targetId, repairAction) => api.post('/master/data-integrity/repair', { issueType, targetId, repairAction });

// Master Data Infrastructure CRUD methods
api.getHostels = (params = {}) => api.get('/hostels', { params });
api.createHostel = (data) => api.post('/hostels', data);
api.updateHostel = (id, data) => api.put(`/hostels/${id}`, data);
api.deleteHostel = (id) => api.delete(`/hostels/${id}`);

api.getFloors = (params = {}) => api.get('/floors', { params });
api.createFloor = (data) => api.post('/floors', data);
api.updateFloor = (id, data) => api.put(`/floors/${id}`, data);
api.deleteFloor = (id) => api.delete(`/floors/${id}`);

api.getRooms = (params = {}) => api.get('/rooms', { params });
api.createRoom = (data) => api.post('/rooms', data);
api.updateRoom = (id, data) => api.put(`/rooms/${id}`, data);
api.deleteRoom = (id) => api.delete(`/rooms/${id}`);

api.getBeds = (params = {}) => api.get('/beds', { params });
api.createBed = (data) => api.post('/beds', data);
api.updateBed = (id, data) => api.put(`/beds/${id}`, data);
api.deleteBed = (id) => api.delete(`/beds/${id}`);

// Phase A — Gate Pass & Outing Permission API methods
api.getGatePasses = (params = {}) => api.get('/gate-passes', { params });
api.getGatePassStats = () => api.get('/gate-passes/stats');
api.getGatePassById = (id) => api.get(`/gate-passes/${id}`);
api.requestGatePass = (data) => api.post('/gate-passes', data);
api.approveRejectGatePass = (id, action, rejection_reason = '') => api.put(`/gate-passes/${id}/approve`, { action, rejection_reason });
api.cancelGatePass = (id) => api.put(`/gate-passes/${id}/cancel`);
api.securityGateAction = (data) => api.post('/gate-passes/security-action', data);

// Phase B — Student Leave Application System API methods
api.getLeaveApplications = (params = {}) => api.get('/leaves', { params });
api.getLeaveStats = () => api.get('/leaves/stats');
api.getLeaveById = (id) => api.get(`/leaves/${id}`);
api.applyForLeave = (data) => api.post('/leaves', data);
api.approveRejectLeave = (id, action, rejection_reason = '', remarks = '') => api.put(`/leaves/${id}/approve`, { action, rejection_reason, remarks });
api.cancelLeaveApplication = (id) => api.put(`/leaves/${id}/cancel`);

// Phase C — Hostel & Room Application with Roommate Preferences API methods
api.getRoomApplications = (params = {}) => api.get('/room-applications', { params });
api.getRoomApplicationStats = () => api.get('/room-applications/stats');
api.getRoomApplicationById = (id) => api.get(`/room-applications/${id}`);
api.applyForRoom = (data) => api.post('/room-applications', data);
api.approveAndAllocateRoom = (id, data) => api.put(`/room-applications/${id}/allocate`, data);
api.rejectRoomApplication = (id, rejection_reason = '') => api.put(`/room-applications/${id}/reject`, { rejection_reason });
api.cancelRoomApplication = (id) => api.put(`/room-applications/${id}/cancel`);

// Phase D — Document & Certificate Request System API methods
api.getDocumentRequests = (params = {}) => api.get('/documents', { params });
api.getDocumentStats = () => api.get('/documents/stats');
api.getDocumentRequestById = (id) => api.get(`/documents/${id}`);
api.requestDocument = (data) => api.post('/documents', data);
api.approveAndIssueDocument = (id, remarks = '') => api.put(`/documents/${id}/issue`, { remarks });
api.rejectDocumentRequest = (id, rejection_reason = '') => api.put(`/documents/${id}/reject`, { rejection_reason });
api.cancelDocumentRequest = (id) => api.put(`/documents/${id}/cancel`);

// Phase E — Campus Cafeteria & Food Ordering System API methods
api.getCafeteriaCategories = () => api.get('/cafeteria/categories');
api.getCafeteriaStats = () => api.get('/cafeteria/stats');
api.getCafeteriaMenu = (params = {}) => api.get('/cafeteria/items', { params });
api.createCafeteriaItem = (data) => api.post('/cafeteria/items', data);
api.updateCafeteriaItem = (id, data) => api.put(`/cafeteria/items/${id}`, data);
api.deleteCafeteriaItem = (id) => api.delete(`/cafeteria/items/${id}`);
api.placeCafeteriaOrder = (data) => api.post('/cafeteria/orders', data);
api.getCafeteriaOrders = (params = {}) => api.get('/cafeteria/orders', { params });
api.getCafeteriaOrderById = (id) => api.get(`/cafeteria/orders/${id}`);
api.updateCafeteriaOrderStatus = (id, status, payment_status = 'PAID') => api.put(`/cafeteria/orders/${id}/status`, { status, payment_status });

// Phase F — Advanced Maintenance System API methods
api.getMaintenanceRequests = (params = {}) => api.get('/maintenance', { params });
api.getMaintenanceById = (id) => api.get(`/maintenance/${id}`);
api.createMaintenanceRequest = (data) => api.post('/maintenance', data);
api.updateMaintenanceStatus = (id, status, resolutionNote = '') => api.patch(`/maintenance/${id}/status`, { status, resolutionNote });
api.checkDuplicateRequests = (params = {}) => api.get('/maintenance/check-duplicates', { params });
api.upvoteMaintenanceRequest = (id) => api.post(`/maintenance/${id}/upvote`);
api.assignTechnicianToMaintenance = (id, technician_id) => api.patch(`/maintenance/${id}/assign-technician`, { technician_id });
api.getMaintenanceAnalytics = (params = {}) => api.get('/maintenance/analytics', { params });

api.getTechnicians = (params = {}) => api.get('/maintenance/technicians', { params });
api.getTechnicianById = (id) => api.get(`/maintenance/technicians/${id}`);
api.createTechnician = (data) => api.post('/maintenance/technicians', data);
api.updateTechnician = (id, data) => api.put(`/maintenance/technicians/${id}`, data);
api.deleteTechnician = (id) => api.delete(`/maintenance/technicians/${id}`);

export default api;


