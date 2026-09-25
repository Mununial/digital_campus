import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './RoomApplicationPage.css';

export default function RoomApplicationPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isStaff = user?.role === 'SUPERINTENDENT' || user?.role === 'SUPER_ADMIN';

  // State
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ pending: 0, allocated: 0, rejected: 0, total: 0 });
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, PENDING, ALLOCATED, REJECTED
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Determine student gender from user profile or email/name
  const studentGender = user?.gender || user?.student_profile?.gender || (user?.username?.toLowerCase() === 'bec26002' || user?.email?.toLowerCase().includes('barsha') ? 'FEMALE' : (user?.username?.toLowerCase() === 'bec26001' ? 'MALE' : ''));
  const normGender = String(studentGender).toUpperCase();
  const isStudentMale = normGender.startsWith('M') || normGender.includes('BOY');
  const isStudentFemale = normGender.startsWith('F') || normGender.includes('GIRL');

  const eligibleHostels = isStudent ? hostels.filter(h => {
    const hGender = String(h.gender || '').toUpperCase();
    if (hGender === 'COED') return true;
    if (isStudentMale) return hGender === 'MALE' || hGender.includes('BOY');
    if (isStudentFemale) return hGender === 'FEMALE' || hGender.includes('GIRL');
    return true;
  }) : hostels;

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(null); // application
  const [availableBeds, setAvailableBeds] = useState([]);
  const [selectedBedId, setSelectedBedId] = useState('');
  const [allocationRemarks, setAllocationRemarks] = useState('');
  const [allocating, setAllocating] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(null); // applicationId
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);

  // New Application Form State
  const [formData, setFormData] = useState({
    preferred_hostel_id: '',
    room_type_preference: 'NON_AC',
    preferred_roommate_roll_no: '',
    special_requests: '',
    academic_year: 1
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchStats();
    fetchHostels();
  }, [activeTab, typeFilter]);

  const fetchHostels = async () => {
    try {
      const res = await api.getHostels();
      setHostels(res.data || []);
    } catch (err) {
      console.error('Failed to fetch hostels:', err);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (activeTab !== 'ALL') {
        filters.status = activeTab;
      }
      if (typeFilter) {
        filters.room_type_preference = typeFilter;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }
      const res = await api.getRoomApplications(filters);
      setApplications(res.data || []);
    } catch (err) {
      console.error('Failed to fetch room applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.getRoomApplicationStats();
      setStats(res.data || { pending: 0, allocated: 0, rejected: 0, total: 0 });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications();
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.preferred_hostel_id) {
      setFormError('Please select a Preferred Hostel.');
      return;
    }

    const chosen = hostels.find(h => String(h.id) === String(formData.preferred_hostel_id));
    if (chosen && chosen.gender !== 'COED') {
      const hg = String(chosen.gender).toUpperCase();
      if (isStudentMale && hg !== 'MALE') {
        setFormError(`Cannot apply to ${chosen.name}. Boys can only apply to Boys' hostels.`);
        return;
      }
      if (isStudentFemale && hg !== 'FEMALE') {
        setFormError(`Cannot apply to ${chosen.name}. Girls can only apply to Girls' hostels.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.applyForRoom(formData);
      setShowApplyModal(false);
      setFormData({
        preferred_hostel_id: '',
        room_type_preference: 'NON_AC',
        preferred_roommate_roll_no: '',
        special_requests: '',
        academic_year: 1
      });
      fetchApplications();
      fetchStats();
      alert(`Room Application submitted successfully! Application Code: ${res.data.application_number}`);
    } catch (err) {
      setFormError(err.message || 'Failed to submit Room Application.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAllocateModal = async (app) => {
    setShowAllocateModal(app);
    setSelectedBedId('');
    setAllocationRemarks('');
    try {
      const res = await api.getAvailableBeds(app.preferred_hostel_id);
      setAvailableBeds(res.data || []);
    } catch (err) {
      console.error('Failed to fetch available beds:', err);
      setAvailableBeds([]);
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBedId) {
      alert('Please select a Bed to allocate.');
      return;
    }

    setAllocating(true);
    try {
      await api.approveAndAllocateRoom(showAllocateModal.id, {
        bed_id: selectedBedId,
        remarks: allocationRemarks
      });
      setShowAllocateModal(null);
      fetchApplications();
      fetchStats();
      alert('Bed allocated and application approved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to allocate bed.');
    } finally {
      setAllocating(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!showRejectModal) return;

    try {
      await api.rejectRoomApplication(showRejectModal, rejectionReason);
      setShowRejectModal(null);
      setRejectionReason('');
      fetchApplications();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to reject room application.');
    }
  };

  const handleCancel = async (appId) => {
    if (!window.confirm('Are you sure you want to cancel this Room Application?')) return;
    try {
      await api.cancelRoomApplication(appId);
      fetchApplications();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to cancel room application.');
    }
  };

  return (
    <div className="roomapp-container">
      {/* Header */}
      <div className="roomapp-header">
        <div>
          <h1>🏠 Hostel & Room Allocation Applications</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {isStudent
              ? 'Apply for hostel room allocation, specify AC/Non-AC preferences, and request preferred roommates.'
              : 'Review student room requests, match roommate preferences, and allocate available beds in 1-click.'}
          </p>
        </div>
        {isStudent && (
          <button className="btn-sm btn-approve" style={{ padding: '0.65rem 1.2rem', fontSize: '0.95rem' }} onClick={() => setShowApplyModal(true)}>
            + Apply for Room Allocation
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="roomapp-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper yellow">⏳</div>
          <div className="kpi-info">
            <h3>{stats.pending || 0}</h3>
            <p>Pending Applications</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper green">🛏️</div>
          <div className="kpi-info">
            <h3>{stats.allocated || 0}</h3>
            <p>Allocated / Approved</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper purple">❌</div>
          <div className="kpi-info">
            <h3>{stats.rejected || 0}</h3>
            <p>Rejected / Cancelled</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper blue">📊</div>
          <div className="kpi-info">
            <h3>{stats.total || 0}</h3>
            <p>Total Applications</p>
          </div>
        </div>
      </div>

      {/* Controls & Tab Navigation */}
      <div className="roomapp-controls">
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>
            📋 All Applications
          </button>
          <button className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`} onClick={() => setActiveTab('PENDING')}>
            ⏳ Pending ({stats.pending || 0})
          </button>
          <button className={`tab-btn ${activeTab === 'ALLOCATED' ? 'active' : ''}`} onClick={() => setActiveTab('ALLOCATED')}>
            ✅ Allocated ({stats.allocated || 0})
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
              placeholder="Search by App No, Student Name, Roll No, Roommate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Room Types</option>
            <option value="AC">AC Room</option>
            <option value="NON_AC">Non-AC Room</option>
            <option value="SINGLE">Single Seater</option>
            <option value="DOUBLE">Double Seater</option>
            <option value="TRIPLE">Triple Seater</option>
            <option value="FOUR_BED">Four Seater</option>
          </select>
          <button type="submit" className="btn-sm btn-ticket" style={{ width: 'auto', padding: '0.6rem 1rem' }}>
            Filter
          </button>
        </form>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          ⏳ Loading Room Applications...
        </div>
      ) : applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3>No Room Applications Found</h3>
          <p style={{ color: '#64748b' }}>There are no room applications matching your current filter selection.</p>
        </div>
      ) : (
        <div className="roomapp-grid">
          {applications.map((app) => (
            <div key={app.id} className="roomapp-card">
              <div>
                <div className="roomapp-card-header">
                  <span className="roomapp-number">{app.application_number}</span>
                  <span className={`pass-status-pill status-${app.status}`}>{app.status}</span>
                </div>

                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
                  <span className={`badge-room-type ${app.room_type_preference}`}>
                    {app.room_type_preference.replace('_', ' ')}
                  </span>
                  <span className="date-duration-pill">Year {app.academic_year || 1}</span>
                </div>

                <div className="student-info-block">
                  <div className="student-name">{app.student_name}</div>
                  <div className="student-sub">
                    <span>{app.roll_number}</span> • <span>{app.branch}</span>
                  </div>
                </div>

                <div className="timing-block">
                  <div className="timing-row">
                    <span className="timing-label">Preferred Hostel:</span>
                    <span className="timing-val">{app.preferred_hostel_name}</span>
                  </div>
                  {app.allocated_bed_number && (
                    <div className="timing-row">
                      <span className="timing-label">Allocated Bed:</span>
                      <span className="timing-val" style={{ color: '#16a34a', fontWeight: 700 }}>
                        Room {app.allocated_room_number} (Bed {app.allocated_bed_number})
                      </span>
                    </div>
                  )}
                </div>

                {app.preferred_roommate_roll_no && (
                  <div className="roommate-pref-box">
                    🤝 <strong>Roommate Request:</strong> {app.preferred_roommate_name ? `${app.preferred_roommate_name} (${app.preferred_roommate_roll_no})` : app.preferred_roommate_roll_no}
                  </div>
                )}

                <div className="pass-reason">
                  {app.special_requests && <div><strong>Special Requests:</strong> {app.special_requests}</div>}
                  {app.rejection_reason && (
                    <div style={{ color: '#dc2626', marginTop: '0.3rem' }}>
                      <strong>Rejection Note:</strong> {app.rejection_reason}
                    </div>
                  )}
                </div>
              </div>

              <div className="pass-card-actions">
                <button className="btn-sm btn-ticket" onClick={() => setSelectedDetail(app)}>
                  📄 View Details
                </button>

                {isStaff && app.status === 'PENDING' && (
                  <>
                    <button className="btn-sm btn-approve" onClick={() => openAllocateModal(app)}>
                      🛏️ Allocate Bed
                    </button>
                    <button className="btn-sm btn-reject" onClick={() => setShowRejectModal(app.id)}>
                      Reject
                    </button>
                  </>
                )}

                {isStudent && app.status === 'PENDING' && (
                  <button className="btn-sm btn-cancel" onClick={() => handleCancel(app.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Room Modal (Student) */}
      {showApplyModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', borderRadius: '16px', maxWidth: '520px', width: '90%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>+ Apply for Room Allocation</h2>
              <button onClick={() => setShowApplyModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleApplySubmit}>
              {isStudent && (studentGender || isStudentFemale || isStudentMale) && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: isStudentFemale ? '#fdf2f8' : '#eff6ff',
                  border: `1px solid ${isStudentFemale ? '#fbcfe8' : '#bfdbfe'}`,
                  color: isStudentFemale ? '#be185d' : '#1d4ed8',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  marginBottom: '15px'
                }}>
                  {isStudentFemale ? "👧 Female Student: Filtered to Girls' Hostels Only" : "👦 Male Student: Filtered to Boys' Hostels Only"}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Preferred Hostel * {isStudent ? (isStudentFemale ? "(Girls' Hostels)" : "(Boys' Hostels)") : ''}
                </label>
                <select
                  value={formData.preferred_hostel_id}
                  onChange={(e) => setFormData({ ...formData, preferred_hostel_id: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                >
                  <option value="">Select Preferred Hostel...</option>
                  {eligibleHostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({String(h.gender).toUpperCase() === 'FEMALE' ? 'Girls' : (String(h.gender).toUpperCase() === 'MALE' ? 'Boys' : 'Co-ed')})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Room Type *</label>
                  <select
                    value={formData.room_type_preference}
                    onChange={(e) => setFormData({ ...formData, room_type_preference: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="NON_AC">Non-AC Standard</option>
                    <option value="AC">Air Conditioned (AC)</option>
                    <option value="SINGLE">Single Seater</option>
                    <option value="DOUBLE">Double Seater</option>
                    <option value="TRIPLE">Triple Seater</option>
                    <option value="FOUR_BED">Four Seater</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Academic Year</label>
                  <select
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Preferred Roommate Roll Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter friend's Roll Number (e.g. 2501316051)"
                  value={formData.preferred_roommate_roll_no}
                  onChange={(e) => setFormData({ ...formData, preferred_roommate_roll_no: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Special Requests / Medical Notes (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="Floor preference, medical condition, disability accommodation..."
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-sm btn-cancel" style={{ flex: 1 }} onClick={() => setShowApplyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-sm btn-approve" style={{ flex: 1, padding: '0.65rem' }} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Bed Wizard Modal (Staff) */}
      {showAllocateModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '500px', width: '90%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#15803d' }}>🛏️ Allocate Bed Wizard</h2>
              <button onClick={() => setShowAllocateModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Student:</strong> {showAllocateModal.student_name} ({showAllocateModal.roll_number})</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Target Hostel:</strong> {showAllocateModal.preferred_hostel_name}</p>
              <p style={{ margin: 0 }}><strong>Requested Type:</strong> <span className={`badge-room-type ${showAllocateModal.room_type_preference}`}>{showAllocateModal.room_type_preference}</span></p>
            </div>

            {showAllocateModal.preferred_roommate_roll_no && (
              <div className="roommate-pref-box" style={{ marginBottom: '1rem' }}>
                🤝 <strong>Requested Roommate:</strong> {showAllocateModal.preferred_roommate_name ? `${showAllocateModal.preferred_roommate_name} (${showAllocateModal.preferred_roommate_roll_no})` : showAllocateModal.preferred_roommate_roll_no}
              </div>
            )}

            <form onSubmit={handleAllocateSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Select Available Bed *</label>
                {availableBeds.length === 0 ? (
                  <div style={{ color: '#dc2626', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    ⚠️ No available beds in {showAllocateModal.preferred_hostel_name}. Please add rooms/beds or free up space.
                  </div>
                ) : (
                  <select
                    value={selectedBedId}
                    onChange={(e) => setSelectedBedId(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  >
                    <option value="">Select an available bed...</option>
                    {availableBeds.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        Room {bed.room_number || bed.room_id} — Bed {bed.bed_number}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Allocation Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Allocated per student preference"
                  value={allocationRemarks}
                  onChange={(e) => setAllocationRemarks(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-sm btn-cancel" style={{ flex: 1 }} onClick={() => setShowAllocateModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-sm btn-approve" style={{ flex: 1, padding: '0.65rem' }} disabled={allocating || availableBeds.length === 0}>
                  {allocating ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedDetail && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="ticket-modal">
            <div className="ticket-border-header">
              <span style={{ fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                ROOM ALLOCATION SLIP
              </span>
              <h2>{selectedDetail.application_number}</h2>
              <span className={`pass-status-pill status-${selectedDetail.status}`} style={{ marginTop: '0.4rem' }}>
                {selectedDetail.status}
              </span>
            </div>

            <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Student Name:</strong> {selectedDetail.student_name}</p>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Roll Number:</strong> {selectedDetail.roll_number}</p>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Branch & Year:</strong> {selectedDetail.branch} (Year {selectedDetail.academic_year || 1})</p>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Preferred Hostel:</strong> {selectedDetail.preferred_hostel_name}</p>
              <p style={{ margin: '0 0 0.4rem 0' }}><strong>Room Preference:</strong> {selectedDetail.room_type_preference.replace('_', ' ')}</p>
              {selectedDetail.allocated_bed_number && (
                <p style={{ margin: '0 0 0.4rem 0', color: '#16a34a', fontWeight: 700 }}>
                  <strong>Allocated Bed:</strong> Room {selectedDetail.allocated_room_number} (Bed {selectedDetail.allocated_bed_number})
                </p>
              )}
              {selectedDetail.preferred_roommate_roll_no && (
                <p style={{ margin: '0 0 0.4rem 0', color: '#86198f' }}>
                  <strong>Requested Roommate:</strong> {selectedDetail.preferred_roommate_name ? `${selectedDetail.preferred_roommate_name} (${selectedDetail.preferred_roommate_roll_no})` : selectedDetail.preferred_roommate_roll_no}
                </p>
              )}
              {selectedDetail.special_requests && <p style={{ margin: '0 0 0.4rem 0' }}><strong>Special Requests:</strong> {selectedDetail.special_requests}</p>}
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

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '400px', width: '90%', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#b91c1c' }}>Reject Room Application</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Please provide a reason for rejecting this room application:
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
