/**
 * BEC Digital Campus Portal - Cross-Module Session Synchronizer
 */

const PortalAuth = {
  getToken() {
    return localStorage.getItem('portalToken') || localStorage.getItem('authToken') || localStorage.getItem('token') || '';
  },

  getCurrentUser() {
    const raw = localStorage.getItem('bec_portal_user') || localStorage.getItem('college_erp_user') || localStorage.getItem('bec_session_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  saveSession(token, user, moduleTokens = {}) {
    if (!token || !user) return;
    const hostelToken = moduleTokens.hostel || token;
    const reportingToken = moduleTokens.reporting || token;

    // 1. Module A Formatting (Attendance expects lowercase 'student', 'teacher', 'admin' and status: 'approved')
    let moduleARole = 'student';
    const rawRole = String(user.role || '').toLowerCase();
    if (rawRole.includes('admin')) moduleARole = 'admin';
    else if (rawRole.includes('teach') || rawRole.includes('fac') || rawRole.includes('superintendent')) moduleARole = 'teacher';
    else moduleARole = 'student';

    const moduleAUser = {
      uid: user.id || user.uid || 'usr_' + Date.now(),
      name: user.name || user.fullName || 'Student',
      email: user.email || '',
      rollNo: user.rollNo || '',
      tempId: user.rollNo || '',
      role: moduleARole,
      status: 'approved',
      branch: user.branch || 'CSE',
      year: user.year || '1st',
      section: user.section || 'A',
      semester: user.semester || '1',
      createdAt: new Date().toISOString()
    };

    // 2. Gateway Master Storage
    localStorage.setItem('portalToken', token);
    localStorage.setItem('bec_portal_user', JSON.stringify({
      ...user,
      normalizedRole: moduleARole
    }));

    // 3. Module B (Hostel Management React SPA)
    localStorage.setItem('authToken', hostelToken);

    // 4. Module C (Reporting & Verification System)
    localStorage.setItem('token', reportingToken);
    localStorage.setItem('college_erp_token', reportingToken);
    localStorage.setItem('college_erp_user', JSON.stringify(user));

    // 5. Module A (Attendance System)
    localStorage.setItem('bec_session_user', JSON.stringify(moduleAUser));

    // 6. Cookies for backend endpoints
    document.cookie = `portalToken=${token}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `authToken=${hostelToken}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `token=${hostelToken}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `reportingToken=${reportingToken}; path=/; max-age=604800; SameSite=Lax`;
  },

  clearSession() {
    localStorage.removeItem('portalToken');
    localStorage.removeItem('bec_portal_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('college_erp_token');
    localStorage.removeItem('college_erp_user');
    localStorage.removeItem('bec_session_user');

    document.cookie = "portalToken=; path=/; max-age=0";
    document.cookie = "authToken=; path=/; max-age=0";
    document.cookie = "token=; path=/; max-age=0";
  },

  async logout() {
    try {
      await fetch('/api/gateway/logout', { method: 'POST' });
    } catch (e) {}
    this.clearSession();
    window.location.href = '/';
  }
};

window.PortalAuth = PortalAuth;
