/**
 * BEC Digital Campus Portal - Role-Based Visibility & Route Guard
 */

const PortalRole = {
  getRole() {
    const user = window.PortalAuth ? window.PortalAuth.getCurrentUser() : null;
    return user ? (user.role || 'STUDENT').toUpperCase() : 'GUEST';
  },

  isAdmin() {
    const user = window.PortalAuth ? window.PortalAuth.getCurrentUser() : null;
    if (!user) return false;
    return Boolean(user.isAdmin || user.role === 'SUPER_ADMIN' || user.role === 'admin' || user.is_admin === 1);
  },

  isStudent() {
    return this.getRole() === 'STUDENT';
  },

  applyRoleVisibility() {
    const isAdmin = this.isAdmin();
    const role = this.getRole();

    // Elements marked with data-role="admin"
    document.querySelectorAll('[data-role="admin"]').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    // Elements marked with data-role="student"
    document.querySelectorAll('[data-role="student"]').forEach(el => {
      el.style.display = (role === 'STUDENT') ? '' : 'none';
    });

    // Elements marked with data-role="faculty"
    document.querySelectorAll('[data-role="faculty"]').forEach(el => {
      el.style.display = (role === 'SUPERINTENDENT' || role === 'FACULTY' || isAdmin) ? '' : 'none';
    });
  }
};

window.PortalRole = PortalRole;
document.addEventListener('DOMContentLoaded', () => {
  PortalRole.applyRoleVisibility();
});
