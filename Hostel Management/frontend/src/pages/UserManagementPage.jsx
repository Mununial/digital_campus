import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { KeyRound, Shield, Building2, UserX, UserCheck, ShieldAlert, UserPlus, Eye, EyeOff } from 'lucide-react';
import './UserManagementPage.css';

const UserManagementPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'CREATE' | 'HOSTELS' | 'RESET' | 'ROLE' | 'DETAILS'
  const [selectedUser, setSelectedUser] = useState(null);
  const [hostelsList, setHostelsList] = useState([]);

  const [modalError, setModalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    gender: '',
    phone: '',
    password: '',
    role: 'STUDENT',
    student_id: '',
    hostel_ids: []
  });

  const [selectedHostels, setSelectedHostels] = useState([]);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [newRoleVal, setNewRoleVal] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getUsers({
        page,
        limit: 15,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: searchTerm || undefined
      });
      const userList = res.users || res.data?.users || (Array.isArray(res.data) ? res.data : []);
      const totalP = res.totalPages || res.data?.totalPages || 1;
      const totalCount = res.total ?? res.data?.total ?? 0;
      setUsers(userList);
      setTotalPages(totalP);
      setTotalUsers(totalCount);
    } catch (err) {
      setError(err.message || err.data?.message || err.response?.data?.message || 'Failed to fetch user directory.');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter, searchTerm]);

  const fetchHostels = async () => {
    try {
      const res = await api.getHostels();
      setHostelsList(res.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error('Failed to load hostels list:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchHostels();
  }, [fetchUsers]);

  const showSuccessMsg = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Status toggle handler
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change account status for '${user.username}' to ${newStatus}?`)) return;

    try {
      await api.updateUserStatus(user.id, newStatus);
      showSuccessMsg(`Account '${user.username}' status changed to ${newStatus}.`);
      fetchUsers();
    } catch (err) {
      setError(err.message || err.data?.message || err.response?.data?.message || 'Failed to update account status.');
    }
  };

  // Open Create User Modal
  const openCreateModal = () => {
    setModalError('');
    setShowPassword(false);
    setFormData({
      username: '',
      email: '',
      full_name: '',
      gender: '',
      phone: '',
      password: '',
      role: 'STUDENT',
      student_id: '',
      hostel_ids: []
    });
    setActiveModal('CREATE');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    setError('');

    try {
      await api.createUser(formData);
      showSuccessMsg(`User '${formData.username}' created successfully.`);
      setActiveModal(null);
      fetchUsers();
    } catch (err) {
      const errMsg = err.message || err.data?.message || err.response?.data?.message || 'Failed to create user account.';
      setModalError(errMsg);
      setError(errMsg);
    } finally {
      setModalLoading(false);
    }
  };

  // Open Superintendent Hostels Assignment Modal
  const openHostelModal = (user) => {
    setSelectedUser(user);
    setModalError('');
    // Parse assigned hostels if any
    const existing = user.assigned_hostels ? hostelsList.filter(h => user.assigned_hostels.includes(h.name)).map(h => h.id) : [];
    setSelectedHostels(existing);
    setActiveModal('HOSTELS');
  };

  const handleHostelSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    setError('');

    try {
      await api.updateSuperintendentHostels(selectedUser.id, selectedHostels);
      showSuccessMsg(`Hostel assignments updated for '${selectedUser.username}'.`);
      setActiveModal(null);
      fetchUsers();
    } catch (err) {
      const errMsg = err.message || err.data?.message || err.response?.data?.message || 'Failed to update hostel assignments.';
      setModalError(errMsg);
      setError(errMsg);
    } finally {
      setModalLoading(false);
    }
  };

  // Open Password Reset Modal
  const openResetModal = (user) => {
    setSelectedUser(user);
    setModalError('');
    setShowPassword(false);
    setNewPasswordVal('');
    setActiveModal('RESET');
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    setError('');

    try {
      await api.adminResetPassword(selectedUser.id, newPasswordVal);
      showSuccessMsg(`Password reset successfully for '${selectedUser.username}'.`);
      setActiveModal(null);
    } catch (err) {
      const errMsg = err.message || err.data?.message || err.response?.data?.message || 'Failed to reset password.';
      setModalError(errMsg);
      setError(errMsg);
    } finally {
      setModalLoading(false);
    }
  };

  // Open Role Change Modal
  const openRoleModal = (user) => {
    setSelectedUser(user);
    setModalError('');
    setNewRoleVal(user.role);
    setActiveModal('ROLE');
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    setError('');

    try {
      await api.updateUserRole(selectedUser.id, newRoleVal);
      showSuccessMsg(`Role updated for '${selectedUser.username}' to ${newRoleVal}.`);
      setActiveModal(null);
      fetchUsers();
    } catch (err) {
      const errMsg = err.message || err.data?.message || err.response?.data?.message || 'Failed to update user role.';
      setModalError(errMsg);
      setError(errMsg);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="user-mgmt-container">
      {/* Header Section */}
      <div className="user-mgmt-header">
        <div>
          <h1>User Management & Identity Control</h1>
          <p className="subtitle">Manage system accounts, user status, superintendent assignments, and security audit logs.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/admin/security-audit')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={16} />
            Security Audit Logs
          </button>
          <button className="btn btn-primary" onClick={openCreateModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={16} />
            Create New User
          </button>
        </div>
      </div>

      {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filter Toolbar */}
      <div className="user-mgmt-filters">
        <div className="search-box">
          <input
            type="text"
            className="form-control"
            placeholder="Search by username, email or student name..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>

        <div className="filter-dropdowns">
          <select
            className="form-control"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="SUPERINTENDENT">Superintendent</option>
            <option value="STUDENT">Student</option>
          </select>

          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="table-responsive card">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User / Identifier</th>
              <th>Gender</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Hostel Scoping / Profile</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center py-4">Loading user accounts...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4 text-muted">No user accounts found matching current filters.</td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td>
                    <div className="user-cell">
                      <span className="username">{u.username}</span>
                      {u.full_name && <span className="subtext">{u.full_name}</span>}
                      {u.student_name && !u.full_name && <span className="subtext">{u.student_name} ({u.student_code})</span>}
                    </div>
                  </td>
                  <td>
                    {u.gender ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: u.gender === 'MALE' ? '#dbeafe' : u.gender === 'FEMALE' ? '#fce7f3' : '#f3e8ff',
                        color: u.gender === 'MALE' ? '#1e40af' : u.gender === 'FEMALE' ? '#9d174d' : '#6b21a8'
                      }}>
                        {u.gender === 'MALE' ? 'Male' : u.gender === 'FEMALE' ? 'Female' : 'Other'}
                      </span>
                    ) : (
                      <span className="text-muted text-sm">—</span>
                    )}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge role-${u.role.toLowerCase()}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${u.status.toLowerCase()}`}>
                      {u.status}
                    </span>
                    {u.must_change_password ? <span className="badge badge-warning ml-1" title="Must change password on next login">Required</span> : null}
                  </td>
                  <td>
                    {u.role === 'SUPERINTENDENT' ? (
                      <div className="hostel-scoping">
                        {u.assigned_hostels ? (
                          u.assigned_hostels.split(',').map((hName, idx) => (
                            <span key={idx} className="hostel-pill">
                              <Building2 size={11} />
                              {hName.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="hostel-pill hostel-pill-warning">
                            ⚠️ Unassigned (No Hostels)
                          </span>
                        )}
                      </div>
                    ) : u.role === 'STUDENT' ? (
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>Student Account</span>
                    ) : (
                      <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>All Hostels (Global)</span>
                    )}
                  </td>
                  <td className="text-muted">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {u.role === 'SUPERINTENDENT' && (
                        <button
                          type="button"
                          className="user-action-btn"
                          title="Assign Hostels"
                          onClick={() => openHostelModal(u)}
                        >
                          <Building2 size={13} />
                          <span>Hostels</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="user-action-btn"
                        title="Reset Password"
                        onClick={() => openResetModal(u)}
                      >
                        <KeyRound size={13} />
                        <span>Reset Pass</span>
                      </button>
                      <button
                        type="button"
                        className="user-action-btn"
                        title="Change Role"
                        onClick={() => openRoleModal(u)}
                      >
                        <Shield size={13} />
                        <span>Role</span>
                      </button>
                      <button
                        type="button"
                        className={`user-action-btn ${u.status === 'ACTIVE' ? 'user-action-danger' : 'user-action-success'}`}
                        title={u.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                        onClick={() => handleToggleStatus(u)}
                      >
                        {u.status === 'ACTIVE' ? (
                          <>
                            <UserX size={13} />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <span>Showing page {page} of {totalPages} ({totalUsers} total users)</span>
          <div className="pagination-controls">
            <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button className="btn btn-sm btn-secondary" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {activeModal === 'CREATE' && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Create New User Account</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '6px' }}>{modalError}</div>}
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. john_doe"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    placeholder="e.g. john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    className="form-control"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="MALE">Male ()</option>
                    <option value="FEMALE">Female ()</option>
                    <option value="OTHER">Other ()</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Initial Temporary Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      required
                      placeholder="e.g. Pass1234"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: '#666'
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <small style={{ display: 'block', marginTop: '0.35rem', color: '#6b7280', fontSize: '0.82rem' }}>
                    Must be at least 8 characters long, with 1 uppercase letter (A-Z), 1 lowercase letter (a-z), and 1 number (0-9).
                  </small>
                </div>
                <div className="form-group">
                  <label>User Role *</label>
                  <select
                    className="form-control"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="SUPERINTENDENT">Superintendent</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                {formData.role === 'SUPERINTENDENT' && (
                  <div className="hostel-assignment-card">
                    <div className="card-header-row">
                      <div>
                        <h4 className="card-title-label">
                          <Building2 size={16} style={{ color: '#4f46e5' }} />
                          Assign Hostels to Warden (Multi-Select)
                        </h4>
                        <p className="card-subtitle-text">Wardens can manage multiple hostels simultaneously</p>
                      </div>
                      <div className="select-action-buttons">
                        <button
                          type="button"
                          className="btn-link-action"
                          onClick={() => setFormData({ ...formData, hostel_ids: hostelsList.map(h => h.id) })}
                        >
                          Select All
                        </button>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <button
                          type="button"
                          className="btn-link-action text-danger"
                          onClick={() => setFormData({ ...formData, hostel_ids: [] })}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="hostel-selection-grid">
                      {hostelsList.map(h => {
                        const isChecked = formData.hostel_ids.includes(h.id);
                        return (
                          <label key={h.id} className={`hostel-select-box ${isChecked ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [...formData.hostel_ids, h.id]
                                  : formData.hostel_ids.filter(id => id !== h.id);
                                setFormData({ ...formData, hostel_ids: ids });
                              }}
                            />
                            <Building2 size={15} className="hostel-box-icon" />
                            <div className="hostel-box-info">
                              <span className="hostel-box-name">{h.name}</span>
                              {h.code && <span className="hostel-box-code">({h.code})</span>}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="selection-counter-bar">
                      <span>{formData.hostel_ids.length} of {hostelsList.length} Hostels Selected</span>
                      {formData.hostel_ids.length === 0 && (
                        <span style={{ color: '#d97706', fontSize: '0.75rem' }}>⚠️ Warning: No hostels selected</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPERINTENDENT HOSTEL ASSIGNMENT MODAL */}
      {activeModal === 'HOSTELS' && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} style={{ color: '#4f46e5' }} />
                  Assign Hostels — {selectedUser.username}
                </h2>
                <span className="subtitle" style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Managing scoping permissions for {selectedUser.full_name || selectedUser.email || selectedUser.username}
                </span>
              </div>
              <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form onSubmit={handleHostelSubmit}>
              <div className="modal-body">
                {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '6px' }}>{modalError}</div>}
                
                <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
                  <p className="card-subtitle-text" style={{ fontSize: '0.85rem' }}>
                    Select all hostels this Warden is authorized to view & manage:
                  </p>
                  <div className="select-action-buttons">
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={() => setSelectedHostels(hostelsList.map(h => h.id))}
                    >
                      Select All
                    </button>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <button
                      type="button"
                      className="btn-link-action text-danger"
                      onClick={() => setSelectedHostels([])}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="hostel-selection-grid" style={{ maxHeight: '280px' }}>
                  {hostelsList.map(h => {
                    const isChecked = selectedHostels.includes(h.id);
                    return (
                      <label key={h.id} className={`hostel-select-box ${isChecked ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...selectedHostels, h.id]
                              : selectedHostels.filter(id => id !== h.id);
                            setSelectedHostels(ids);
                          }}
                        />
                        <Building2 size={16} className="hostel-box-icon" />
                        <div className="hostel-box-info">
                          <span className="hostel-box-name">{h.name}</span>
                          {h.code && <span className="hostel-box-code">({h.code})</span>}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="selection-counter-bar">
                  <span>{selectedHostels.length} of {hostelsList.length} Hostels Assigned</span>
                  {selectedHostels.length === 0 && (
                    <span style={{ color: '#d97706', fontSize: '0.75rem' }}>⚠️ Warning: Warden will have 0 assigned hostels</span>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Saving...' : 'Save Hostel Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN RESET PASSWORD MODAL */}
      {activeModal === 'RESET' && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Reset Password - {selectedUser.username}</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form onSubmit={handleResetSubmit}>
              <div className="modal-body">
                {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '6px' }}>{modalError}</div>}
                <p className="text-muted mb-3">Set a new temporary password for <strong>{selectedUser.username}</strong>. The user will be required to change it upon next login.</p>
                <div className="form-group">
                  <label>New Temporary Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      required
                      placeholder="Enter strong temporary password"
                      value={newPasswordVal}
                      onChange={(e) => setNewPasswordVal(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: '#666'
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <small style={{ display: 'block', marginTop: '0.35rem', color: '#6b7280', fontSize: '0.82rem' }}>
                    Must be at least 8 characters long, with 1 uppercase letter (A-Z), 1 lowercase letter (a-z), and 1 number (0-9).
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE ROLE MODAL */}
      {activeModal === 'ROLE' && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Change Role - {selectedUser.username}</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form onSubmit={handleRoleSubmit}>
              <div className="modal-body">
                {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '6px' }}>{modalError}</div>}
                <p className="text-muted mb-3">Select the new role for <strong>{selectedUser.username}</strong>:</p>
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    className="form-control"
                    value={newRoleVal}
                    onChange={(e) => setNewRoleVal(e.target.value)}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="SUPERINTENDENT">Superintendent</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? 'Updating Role...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
