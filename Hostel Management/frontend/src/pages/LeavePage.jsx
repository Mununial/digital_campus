import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './LeavePage.css';

export default function LeavePage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isStaff = user?.role === 'SUPERINTENDENT' || user?.role === 'SUPER_ADMIN';

  // State
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, onLeaveToday: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, PENDING, APPROVED, ON_LEAVE_TODAY, REJECTED
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(null); // leaveId
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);

  // New Request Form State
  const [formData, setFormData] = useState({
    leave_type: 'HOME_LEAVE',
    start_date: '',
    end_date: '',
    reason: '',
    destination_address: '',
    emergency_phone: '',
    document_url: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLeaves();
    fetchStats();
  }, [activeTab, typeFilter]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (activeTab !== 'ALL') {
        filters.status = activeTab;
      }
      if (typeFilter) {
        filters.leave_type = typeFilter;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }
      const res = await api.getLeaveApplications(filters);
      setLeaves(res.data || []);
    } catch (err) {
      console.error('Failed to fetch leave applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.getLeaveStats();
      setStats(res.data || { pending: 0, approved: 0, onLeaveToday: 0, total: 0 });
    } catch (err) {
      console.error('Failed to fetch leave stats:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeaves();
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.start_date || !formData.end_date || !formData.reason) {
      setFormError('Please fill out all required fields.');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setFormError('End Date cannot be earlier than Start Date.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.applyForLeave(formData);
      setShowApplyModal(false);
      setFormData({
        leave_type: 'HOME_LEAVE',
        start_date: '',
        end_date: '',
        reason: '',
        destination_address: '',
        emergency_phone: '',
        document_url: ''
      });
      fetchLeaves();
      fetchStats();
      alert(`Leave Application submitted successfully! Application Code: ${res.data.leave_number}`);
    } catch (err) {
      setFormError(err.message || 'Failed to submit Leave Application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      await api.approveRejectLeave(leaveId, 'APPROVE');
      fetchLeaves();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to approve leave application.');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!showRejectModal) return;

    try {
      await api.approveRejectLeave(showRejectModal, 'REJECT', rejectionReason);
      setShowRejectModal(null);
      setRejectionReason('');
      fetchLeaves();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to reject leave application.');
    }
  };

  const handleCancel = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this Leave Application?')) return;
    try {
      await api.cancelLeaveApplication(leaveId);
      fetchLeaves();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to cancel leave application.');
    }
  };

  const calculateDays = (startStr, endStr) => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="leave-container">
      {/* Header */}
      <div className="leave-header">
        <div>
          <h1>📝 Student Leave Applications</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {isStudent
              ? 'Apply for home leave, medical permission, or academic leave with automated attendance exemption.'
              : 'Review, approve, and manage student leave applications and attendance exemptions.'}
          </p>
        </div>
        {isStudent && (
          <button className="btn-sm btn-approve" style={{ padding: '0.65rem 1.2rem', fontSize: '0.95rem' }} onClick={() => setShowApplyModal(true)}>
            + Apply for Leave
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="leave-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper yellow">⏳</div>
          <div className="kpi-info">
            <h3>{stats.pending || 0}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper green">✅</div>
          <div className="kpi-info">
            <h3>{stats.approved || 0}</h3>
            <p>Approved Leaves</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper blue">🏡</div>
          <div className="kpi-info">
            <h3>{stats.onLeaveToday || 0}</h3>
            <p>On Leave Today</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper purple">📋</div>
          <div className="kpi-info">
            <h3>{stats.total || 0}</h3>
            <p>Total Requests</p>
          </div>
        </div>
      </div>

      {/* Controls & Tab Navigation */}
      <div className="leave-controls">
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>
            📋 All Applications
          </button>
          <button className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`} onClick={() => setActiveTab('PENDING')}>
            ⏳ Pending ({stats.pending || 0})
          </button>
          <button className={`tab-btn ${activeTab === 'APPROVED' ? 'active' : ''}`} onClick={() => setActiveTab('APPROVED')}>
            ✅ Approved
          </button>
          <button className={`tab-btn ${activeTab === 'ON_LEAVE_TODAY' ? 'active' : ''}`} onClick={() => setActiveTab('ON_LEAVE_TODAY')}>
            🏡 On Leave Today ({stats.onLeaveToday || 0})
          </button>
          <button className={`tab-btn ${activeTab === 'REJECTED' ? 'active' : ''}`} onClick={() => setActiveTab('REJECTED')}>
            ❌ Rejected / Cancelled
          </button>
        </div>

        <form className="filter-bar" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Leave No, Student Name, Roll No, Destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Leave Types</option>
            <option value="HOME_LEAVE">Home Visit Leave</option>
            <option value="MEDICAL_LEAVE">Medical / Hospital Leave</option>
            <option value="ACADEMIC_LEAVE">Academic / Exam Leave</option>
            <option value="OTHER">Other Personal Leave</option>
          </select>
          <button type="submit" className="btn-sm btn-ticket" style={{ width: 'auto', padding: '0.6rem 1rem' }}>
            Filter
          </button>
        </form>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          ⏳ Loading Leave Applications...
        </div>
      ) : leaves.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3>No Leave Applications Found</h3>
          <p style={{ color: '#64748b' }}>There are no leave applications matching your current filter selection.</p>
        </div>
      ) : (
        <div className="leave-grid">
          {leaves.map((leave) => {
            const dayCount = calculateDays(leave.start_date, leave.end_date);
            return (
              <div key={leave.id} className="leave-card">
                <div>
                  <div className="leave-card-header">
                    <span className="leave-number">{leave.leave_number}</span>
                    <span className={`pass-status-pill status-${leave.status}`}>{leave.status}</span>
                  </div>

                  <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    <span className={`badge-leave-type ${leave.leave_type}`}>
                      {leave.leave_type.replace('_', ' ')}
                    </span>
                    <span className="date-duration-pill">{dayCount} Day{dayCount > 1 ? 's' : ''}</span>
                  </div>

                  <div className="student-info-block">
                    <div className="student-name">{leave.student_name}</div>
                    <div className="student-sub">
                      <span>{leave.roll_number}</span> • <span>{leave.hostel_name} (Room {leave.room_number || 'N/A'})</span>
                    </div>
                  </div>

                  <div className="timing-block">
                    <div className="timing-row">
                      <span className="timing-label">Start Date:</span>
                      <span className="timing-val">{leave.start_date}</span>
                    </div>
                    <div className="timing-row">
                      <span className="timing-label">End Date:</span>
                      <span className="timing-val">{leave.end_date}</span>
                    </div>
                  </div>

                  <div className="pass-reason">
                    <strong>Reason:</strong> {leave.reason}
                    {leave.destination_address && <div><strong>Destination:</strong> {leave.destination_address}</div>}
                    {leave.emergency_phone && <div><strong>Emergency Contact:</strong> {leave.emergency_phone}</div>}
                    {leave.rejection_reason && (
                      <div style={{ color: '#dc2626', marginTop: '0.3rem' }}>
                        <strong>Rejection Note:</strong> {leave.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pass-card-actions">
                  <button className="btn-sm btn-ticket" onClick={() => setSelectedDetail(leave)}>
                    📄 View Details
                  </button>

                  {isStaff && leave.status === 'PENDING' && (
                    <>
                      <button className="btn-sm btn-approve" onClick={() => handleApprove(leave.id)}>
                        Approve
                      </button>
                      <button className="btn-sm btn-reject" onClick={() => setShowRejectModal(leave.id)}>
                        Reject
                      </button>
                    </>
                  )}

                  {isStudent && leave.status === 'PENDING' && (
                    <button className="btn-sm btn-cancel" onClick={() => handleCancel(leave.id)}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Leave Modal (Student) */}
      {showApplyModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', borderRadius: '16px', maxWidth: '520px', width: '90%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>+ Apply for Leave</h2>
              <button onClick={() => setShowApplyModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleApplySubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Leave Type *</label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="HOME_LEAVE">Home Visit Leave</option>
                  <option value="MEDICAL_LEAVE">Medical / Hospital Leave</option>
                  <option value="ACADEMIC_LEAVE">Academic / Exam / Seminar</option>
                  <option value="OTHER">Other Personal Permission</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Destination Address</label>
                <input
                  type="text"
                  placeholder="e.g. Home Address (At/Po, Dist, State)"
                  value={formData.destination_address}
                  onChange={(e) => setFormData({ ...formData, destination_address: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Emergency Parent Contact Phone</label>
                <input
                  type="tel"
                  placeholder="Parent / Guardian mobile number"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Reason for Leave *</label>
                <textarea
                  rows="3"
                  placeholder="State the reason for requesting leave..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-sm btn-cancel" style={{ flex: 1 }} onClick={() => setShowApplyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-sm btn-approve" style={{ flex: 1, padding: '0.65rem' }} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Detail Modal */}
      {selectedDetail && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="ticket-modal">
            <div className="ticket-border-header">
              <span style={{ fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                LEAVE APPLICATION SLIP
              </span>
              <h2>{selectedDetail.leave_number}</h2>
              <span className={`pass-status-pill status-${selectedDetail.status}`} style={{ marginTop: '0.4rem' }}>
                {selectedDetail.status}
              </span>
            </div>

            <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Student Name:</strong> {selectedDetail.student_name}</p>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Roll Number:</strong> {selectedDetail.roll_number}</p>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Hostel & Room:</strong> {selectedDetail.hostel_name} (Room {selectedDetail.room_number || 'N/A'})</p>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Leave Type:</strong> {selectedDetail.leave_type.replace('_', ' ')}</p>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Duration:</strong> {selectedDetail.start_date} to {selectedDetail.end_date} ({calculateDays(selectedDetail.start_date, selectedDetail.end_date)} Days)</p>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Reason:</strong> {selectedDetail.reason}</p>
              {selectedDetail.destination_address && <p style={{ margin: '0 0 0.4rem 0' }}><strong>Destination:</strong> {selectedDetail.destination_address}</p>}
              {selectedDetail.approved_by_name && (
                <p style={{ margin: '0 0 0.4rem 0', color: '#16a34a', fontWeight: 600 }}>
                  <strong>Approved By:</strong> {selectedDetail.approved_by_name}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-sm btn-ticket" onClick={() => window.print()}>
                🖨️ Print Slip
              </button>
              <button className="btn-sm btn-cancel" onClick={() => setSelectedDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '400px', width: '90%', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#b91c1c' }}>Reject Leave Application</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Please provide a reason for rejecting this leave application:
            </p>

            <form onSubmit={handleRejectSubmit}>
              <textarea
                rows="3"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1rem' }}
                required
              />

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-sm btn-cancel" style={{ flex: 1 }} onClick={() => setShowRejectModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-sm btn-reject" style={{ flex: 1 }}>
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
