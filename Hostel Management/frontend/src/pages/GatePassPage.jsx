import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './GatePassPage.css';

export default function GatePassPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isStaff = user?.role === 'SUPERINTENDENT' || user?.role === 'SUPER_ADMIN';

  // State
  const [passes, setPasses] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, checkedOut: 0, returnedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, PENDING, APPROVED, CHECKED_OUT, RETURNED, REJECTED, SCANNER
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(null); // passId
  const [rejectionReason, setRejectionReason] = useState('');

  // Security Scanner State
  const [scanCode, setScanCode] = useState('');
  const [scannedPass, setScannedPass] = useState(null);
  const [scanRemarks, setScanRemarks] = useState('');
  const [scanError, setScanError] = useState('');

  // New Request Form State
  const [formData, setFormData] = useState({
    pass_type: 'LOCAL_OUTING',
    out_date_time: '',
    expected_in_date_time: '',
    reason: '',
    destination: '',
    parent_phone: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPasses();
    fetchStats();
  }, [activeTab, typeFilter]);

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (activeTab !== 'ALL' && activeTab !== 'SCANNER') {
        filters.status = activeTab;
      }
      if (typeFilter) {
        filters.pass_type = typeFilter;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }
      const res = await api.getGatePasses(filters);
      setPasses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch gate passes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.getGatePassStats();
      setStats(res.data || { pending: 0, approved: 0, checkedOut: 0, returnedToday: 0 });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPasses();
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.out_date_time || !formData.expected_in_date_time || !formData.reason) {
      setFormError('Please fill out all required fields.');
      return;
    }

    if (new Date(formData.expected_in_date_time) <= new Date(formData.out_date_time)) {
      setFormError('Expected Return Time must be after Departure Time.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.requestGatePass(formData);
      setShowRequestModal(false);
      setFormData({
        pass_type: 'LOCAL_OUTING',
        out_date_time: '',
        expected_in_date_time: '',
        reason: '',
        destination: '',
        parent_phone: ''
      });
      fetchPasses();
      fetchStats();
      alert(`Gate Pass requested successfully! Pass Code: ${res.data.pass_number}`);
    } catch (err) {
      setFormError(err.message || 'Failed to request Gate Pass.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (passId) => {
    try {
      await api.approveRejectGatePass(passId, 'APPROVE');
      fetchPasses();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to approve gate pass.');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!showRejectModal) return;

    try {
      await api.approveRejectGatePass(showRejectModal, 'REJECT', rejectionReason);
      setShowRejectModal(null);
      setRejectionReason('');
      fetchPasses();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to reject gate pass.');
    }
  };

  const handleCancel = async (passId) => {
    if (!window.confirm('Are you sure you want to cancel this Gate Pass request?')) return;
    try {
      await api.cancelGatePass(passId);
      fetchPasses();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to cancel gate pass.');
    }
  };

  const handleScannerSearch = async (e) => {
    e.preventDefault();
    setScanError('');
    setScannedPass(null);

    if (!scanCode.trim()) return;

    try {
      const res = await api.getGatePassById(scanCode.trim());
      setScannedPass(res.data);
    } catch (err) {
      setScanError(err.message || 'Pass number not found.');
    }
  };

  const handleSecurityAction = async (action) => {
    if (!scannedPass) return;
    try {
      const res = await api.securityGateAction({
        pass_identifier: scannedPass.pass_number,
        action,
        security_remarks: scanRemarks
      });
      setScannedPass(res.data);
      setScanRemarks('');
      fetchPasses();
      fetchStats();
      alert(`Security status updated: ${action === 'CHECK_OUT' ? 'STUDENT CHECKED OUT' : 'STUDENT RETURNED'}`);
    } catch (err) {
      alert(err.message || 'Failed to record security action.');
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '—';
    const date = new Date(dtStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="gatepass-container">
      {/* Header */}
      <div className="gatepass-header">
        <div>
          <h1>🚪 Gate Pass & Outing Management</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {isStudent
              ? 'Apply for outing permissions, local gate passes, and track approval status.'
              : 'Approve student leave passes and verify main gate check-in / check-out entries.'}
          </p>
        </div>
        {isStudent && (
          <button className="btn-sm btn-approve" style={{ padding: '0.65rem 1.2rem', fontSize: '0.95rem' }} onClick={() => setShowRequestModal(true)}>
            + Request Gate Pass
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="gatepass-kpi-grid">
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
            <p>Approved / Active</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper purple">🚶‍♂️</div>
          <div className="kpi-info">
            <h3>{stats.checkedOut || 0}</h3>
            <p>Currently Out of Hostel</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper blue">🏠</div>
          <div className="kpi-info">
            <h3>{stats.returnedToday || 0}</h3>
            <p>Returned Today</p>
          </div>
        </div>
      </div>

      {/* Controls & Tab Navigation */}
      <div className="gatepass-controls">
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>
            📋 All Passes
          </button>
          <button className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`} onClick={() => setActiveTab('PENDING')}>
            ⏳ Pending ({stats.pending || 0})
          </button>
          <button className={`tab-btn ${activeTab === 'APPROVED' ? 'active' : ''}`} onClick={() => setActiveTab('APPROVED')}>
            ✅ Approved
          </button>
          <button className={`tab-btn ${activeTab === 'CHECKED_OUT' ? 'active' : ''}`} onClick={() => setActiveTab('CHECKED_OUT')}>
            🚶‍♂️ Out of Hostel ({stats.checkedOut || 0})
          </button>
          <button className={`tab-btn ${activeTab === 'RETURNED' ? 'active' : ''}`} onClick={() => setActiveTab('RETURNED')}>
            🏠 Returned
          </button>
          <button className={`tab-btn ${activeTab === 'REJECTED' ? 'active' : ''}`} onClick={() => setActiveTab('REJECTED')}>
            ❌ Rejected / Cancelled
          </button>
          {isStaff && (
            <button className={`tab-btn security-tab ${activeTab === 'SCANNER' ? 'active' : ''}`} onClick={() => setActiveTab('SCANNER')}>
              🔍 Security Gate Scanner
            </button>
          )}
        </div>

        {activeTab !== 'SCANNER' && (
          <form className="filter-bar" onSubmit={handleSearchSubmit}>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by Pass No, Student Name, Roll No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Outing Types</option>
              <option value="LOCAL_OUTING">Local Outing</option>
              <option value="OUTSTATION">Outstation Visit</option>
              <option value="LATE_NIGHT">Late Night / Project</option>
              <option value="EMERGENCY">Emergency / Medical</option>
            </select>
            <button type="submit" className="btn-sm btn-ticket" style={{ width: 'auto', padding: '0.6rem 1rem' }}>
              Filter
            </button>
          </form>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'SCANNER' && isStaff ? (
        <div className="security-scanner-card">
          <div className="scanner-header">
            <h2>🔍 Security Gate Scanner & Verification</h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Enter or scan a Gate Pass Code (e.g., <code>GP-20260923-XXXX</code>) to verify student permission and record departure/arrival.
            </p>
          </div>

          <form className="scanner-input-box" onSubmit={handleScannerSearch}>
            <input
              type="text"
              placeholder="Enter Pass Number (e.g. GP-20260923-7276)..."
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
            />
            <button type="submit" className="btn-verify">
              Verify Pass
            </button>
          </form>

          {scanError && (
            <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.8rem', borderRadius: '8px', marginTop: '1rem' }}>
              ⚠️ {scanError}
            </div>
          )}

          {scannedPass && (
            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '1.25rem', marginTop: '1.5rem', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fbbf24', fontSize: '1.2rem' }}>{scannedPass.pass_number}</h3>
                  <span className={`badge-type ${scannedPass.pass_type}`} style={{ marginTop: '0.3rem', display: 'inline-block' }}>
                    {scannedPass.pass_type.replace('_', ' ')}
                  </span>
                </div>
                <span className={`pass-status-pill status-${scannedPass.status}`} style={{ fontSize: '0.9rem' }}>
                  {scannedPass.status}
                </span>
              </div>

              <div style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '1rem', color: '#e2e8f0', fontSize: '0.95rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.3rem 0' }}>
                    <strong>Student Name:</strong> {scannedPass.student_name}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0' }}>
                    <strong>Roll Number:</strong> {scannedPass.roll_number}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0' }}>
                    <strong>Hostel & Room:</strong> {scannedPass.hostel_name} (Room {scannedPass.room_number || 'N/A'})
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 0.3rem 0' }}>
                    <strong>Expected Out:</strong> {formatDateTime(scannedPass.out_date_time)}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0' }}>
                    <strong>Expected In:</strong> {formatDateTime(scannedPass.expected_in_date_time)}
                  </p>
                  <p style={{ margin: '0 0 0.3rem 0' }}>
                    <strong>Reason:</strong> {scannedPass.reason}
                  </p>
                </div>
              </div>

              {/* Remarks Input */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Gate Remarks / Verification Note (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified ID, left on bicycle..."
                  value={scanRemarks}
                  onChange={(e) => setScanRemarks(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #475569', background: '#1e293b', color: '#fff' }}
                />
              </div>

              {/* Gate Actions */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                {scannedPass.status === 'APPROVED' && (
                  <button
                    className="btn-sm btn-approve"
                    style={{ flex: 1, padding: '0.75rem', fontSize: '1rem' }}
                    onClick={() => handleSecurityAction('CHECK_OUT')}
                  >
                    🚶‍♂️ Mark Check-Out (Departure)
                  </button>
                )}
                {scannedPass.status === 'CHECKED_OUT' && (
                  <button
                    className="btn-sm btn-ticket"
                    style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', background: '#0284c7' }}
                    onClick={() => handleSecurityAction('CHECK_IN')}
                  >
                    🏠 Mark Returned (Arrival)
                  </button>
                )}
                {scannedPass.status !== 'APPROVED' && scannedPass.status !== 'CHECKED_OUT' && (
                  <div style={{ color: '#f87171', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    ⚠️ Pass status is {scannedPass.status}. Security check-in/out disabled.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          ⏳ Loading Gate Passes...
        </div>
      ) : passes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3>No Gate Passes Found</h3>
          <p style={{ color: '#64748b' }}>There are no gate passes matching your current tab or filter selection.</p>
        </div>
      ) : (
        <div className="pass-grid">
          {passes.map((pass) => (
            <div key={pass.id} className="pass-card">
              <div>
                <div className="pass-card-header">
                  <span className="pass-number">{pass.pass_number}</span>
                  <span className={`pass-status-pill status-${pass.status}`}>{pass.status}</span>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <span className={`badge-type ${pass.pass_type}`}>{pass.pass_type.replace('_', ' ')}</span>
                </div>

                <div className="student-info-block">
                  <div className="student-name">{pass.student_name}</div>
                  <div className="student-sub">
                    <span>{pass.roll_number}</span> • <span>{pass.hostel_name}</span>
                  </div>
                </div>

                <div className="timing-block">
                  <div className="timing-row">
                    <span className="timing-label">Out Time:</span>
                    <span className="timing-val">{formatDateTime(pass.out_date_time)}</span>
                  </div>
                  <div className="timing-row">
                    <span className="timing-label">Expected In:</span>
                    <span className="timing-val">{formatDateTime(pass.expected_in_date_time)}</span>
                  </div>
                  {pass.actual_out_time && (
                    <div className="timing-row">
                      <span className="timing-label">Actual Departure:</span>
                      <span className="timing-val" style={{ color: '#7e22ce' }}>{formatDateTime(pass.actual_out_time)}</span>
                    </div>
                  )}
                  {pass.actual_in_time && (
                    <div className="timing-row">
                      <span className="timing-label">Actual Return:</span>
                      <span className="timing-val" style={{ color: '#0369a1' }}>{formatDateTime(pass.actual_in_time)}</span>
                    </div>
                  )}
                </div>

                <div className="pass-reason">
                  <strong>Reason:</strong> {pass.reason}
                  {pass.destination && <div><strong>Destination:</strong> {pass.destination}</div>}
                  {pass.rejection_reason && (
                    <div style={{ color: '#dc2626', marginTop: '0.3rem' }}>
                      <strong>Rejection Note:</strong> {pass.rejection_reason}
                    </div>
                  )}
                </div>
              </div>

              <div className="pass-card-actions">
                <button className="btn-sm btn-ticket" onClick={() => setSelectedTicket(pass)}>
                  📄 View Ticket
                </button>

                {isStaff && pass.status === 'PENDING' && (
                  <>
                    <button className="btn-sm btn-approve" onClick={() => handleApprove(pass.id)}>
                      Approve
                    </button>
                    <button className="btn-sm btn-reject" onClick={() => setShowRejectModal(pass.id)}>
                      Reject
                    </button>
                  </>
                )}

                {isStudent && pass.status === 'PENDING' && (
                  <button className="btn-sm btn-cancel" onClick={() => handleCancel(pass.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Gate Pass Modal (Student) */}
      {showRequestModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', borderRadius: '16px', maxWidth: '520px', width: '90%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>+ Request Gate Pass / Outing</h2>
              <button onClick={() => setShowRequestModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleRequestSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Outing Type *</label>
                <select
                  value={formData.pass_type}
                  onChange={(e) => setFormData({ ...formData, pass_type: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="LOCAL_OUTING">Local Outing (Shopping/Personal)</option>
                  <option value="OUTSTATION">Outstation Visit (Home/Family)</option>
                  <option value="LATE_NIGHT">Late Night Permission (Library/Project)</option>
                  <option value="EMERGENCY">Emergency / Medical Outing</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Departure Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.out_date_time}
                    onChange={(e) => setFormData({ ...formData, out_date_time: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Expected Return *</label>
                  <input
                    type="datetime-local"
                    value={formData.expected_in_date_time}
                    onChange={(e) => setFormData({ ...formData, expected_in_date_time: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Destination City / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Master Canteen Mall / Home (Cuttack)"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Parent / Guardian Emergency Contact</label>
                <input
                  type="tel"
                  placeholder="Parent phone number for verification"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Reason for Outing *</label>
                <textarea
                  rows="3"
                  placeholder="State the purpose of your outing..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-sm btn-cancel" style={{ flex: 1 }} onClick={() => setShowRequestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-sm btn-approve" style={{ flex: 1, padding: '0.65rem' }} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {selectedTicket && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="ticket-modal">
            <div className="ticket-border-header">
              <span style={{ fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                BEC COLLEGE HOSTEL PORTAL
              </span>
              <h2>OFFICIAL GATE PASS</h2>
              <span className={`pass-status-pill status-${selectedTicket.status}`} style={{ marginTop: '0.4rem' }}>
                {selectedTicket.status}
              </span>
            </div>

            <div className="qr-code-placeholder">
              <div style={{ fontSize: '1.75rem', marginBottom: '0.2rem' }}>📱</div>
              <span>{selectedTicket.pass_number}</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>SCAN AT GATE</span>
            </div>

            <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Student Name:</strong> {selectedTicket.student_name}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Roll Number:</strong> {selectedTicket.roll_number}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Hostel & Room:</strong> {selectedTicket.hostel_name} (Room {selectedTicket.room_number || 'N/A'})</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Outing Type:</strong> {selectedTicket.pass_type.replace('_', ' ')}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Out Time:</strong> {formatDateTime(selectedTicket.out_date_time)}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Expected In:</strong> {formatDateTime(selectedTicket.expected_in_date_time)}</p>
              {selectedTicket.approved_by_name && (
                <p style={{ margin: '0 0 0.3rem 0', color: '#16a34a', fontWeight: 600 }}>
                  <strong>Approved By:</strong> {selectedTicket.approved_by_name}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-sm btn-ticket" onClick={() => window.print()}>
                🖨️ Print Pass
              </button>
              <button className="btn-sm btn-cancel" onClick={() => setSelectedTicket(null)}>
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
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#b91c1c' }}>Reject Gate Pass</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Please provide a reason for rejecting this Gate Pass request:
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
