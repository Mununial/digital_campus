import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './StudentAccommodationPage.css';

const StudentAccommodationPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDayScholar, setIsDayScholar] = useState(false);

  useEffect(() => {
    fetchAccommodation();
  }, []);

  const fetchAccommodation = () => {
    setLoading(true);
    setError('');
    setIsDayScholar(false);
    api.getMyAllocation()
      .then(res => {
        setData(res.data?.data || res.data || null);
      })
      .catch(err => {
        console.error('Error fetching accommodation profile:', err);
        if (err.response?.data?.isDayScholar || err.response?.status === 403) {
          setIsDayScholar(true);
          setError(err.response?.data?.message || 'You are a Day Scholar. Hostel facility not applicable.');
        } else {
          setError(err.response?.data?.message || 'Unable to load accommodation details.');
        }
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="accommodation-container">
        <div className="loading-box">
          <div className="spinner-sm" style={{ margin: '0 auto 1rem auto' }}></div>
          <p style={{ color: '#64748b' }}>Loading your accommodation details...</p>
        </div>
      </div>
    );
  }

  if (isDayScholar) {
    return (
      <div className="accommodation-container">
        <div className="page-intro">
          <div className="page-intro-badge" style={{ background: '#fef3c7', color: '#d97706' }}>
            <i className="fa-solid fa-graduation-cap"></i> Non-Resident Status
          </div>
          <h1 className="page-title">Hostel Facility Not Applicable</h1>
          <p className="page-subtitle">You are registered as a Day Scholar in college admission records.</p>
        </div>

        <div className="accommodation-hero-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem auto' }}>
            <i className="fa-solid fa-school"></i>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>
            Day Scholar Student Profile
          </h2>
          <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Hostel accommodation is exclusively reserved for students registered with residential status. If you require hostel facility, please apply through the college administration.
          </p>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={() => window.location.href = '/'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fa-solid fa-arrow-left"></i> Return to Campus Portal
          </button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="accommodation-container">
        <div className="error-box">
          <div className="error-icon-box">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h3>Unable to Load Details</h3>
          <p>{error || 'No accommodation profile found.'}</p>
          <button className="btn btn-primary btn-sm mt-3" onClick={fetchAccommodation}>
            <i className="fa-solid fa-rotate-right mr-1"></i> Try Again
          </button>
        </div>
      </div>
    );
  }

  const { currentAllocation, roommates = [], history = [] } = data;

  return (
    <div className="accommodation-container">
      {/* Page Header */}
      <div className="page-intro">
        <div className="page-intro-badge">
          <i className="fa-solid fa-hotel"></i> Campus Residence
        </div>
        <h1 className="page-title">My Hostel Accommodation</h1>
        <p className="page-subtitle">Your active room assignment, roommates, and complete stay history.</p>
      </div>

      {/* Hero Active Allocation Card */}
      <div className="accommodation-hero-card">
        <div className="hero-glow-blob"></div>

        <div className="hero-top-row">
          <div>
            <span className={`alloc-badge ${currentAllocation ? 'active' : 'unallocated'}`}>
              <i className={`fa-solid ${currentAllocation ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
              {currentAllocation ? 'Active Room Allocation' : 'Not Allocated'}
            </span>
            <h2 className="hostel-name-heading">
              {currentAllocation ? currentAllocation.hostel_name : 'No room allotted yet'}
            </h2>
            <p className="hostel-sub-info">
              <i className="fa-solid fa-location-dot mr-1"></i>
              {currentAllocation
                ? `${currentAllocation.hostel_code ? `[${currentAllocation.hostel_code}] ` : ''}Campus Hostel Residence`
                : 'Please contact the hostel warden or administration for room allocation.'}
            </p>
          </div>

          {currentAllocation && (
            <div className="hero-actions-group">
              <button 
                type="button" 
                className="hero-action-btn"
                onClick={() => navigate('/student/complaints')}
                title="Report an issue in your room"
              >
                <i className="fa-solid fa-wrench"></i> Report Maintenance
              </button>
            </div>
          )}
        </div>

        {currentAllocation && (
          <div className="alloc-metrics-grid">
            <div className="metric-pill-box">
              <span className="metric-icon">
                <i className="fa-solid fa-door-open"></i>
              </span>
              <div>
                <span className="metric-label">Room No</span>
                <div className="metric-value">Room {currentAllocation.room_number}</div>
              </div>
            </div>

            <div className="metric-pill-box">
              <span className="metric-icon">
                <i className="fa-solid fa-bed"></i>
              </span>
              <div>
                <span className="metric-label">Bed Assignment</span>
                <div className="metric-value">Bed {currentAllocation.bed_number}</div>
              </div>
            </div>

            <div className="metric-pill-box">
              <span className="metric-icon">
                <i className="fa-solid fa-layer-group"></i>
              </span>
              <div>
                <span className="metric-label">Floor</span>
                <div className="metric-value">{currentAllocation.floor_name || 'Ground Floor'}</div>
              </div>
            </div>

            <div className="metric-pill-box">
              <span className="metric-icon">
                <i className="fa-solid fa-calendar-check"></i>
              </span>
              <div>
                <span className="metric-label">Stay Since</span>
                <div className="metric-value">
                  {currentAllocation.allocated_from
                    ? new Date(currentAllocation.allocated_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Current Term'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Roommates Card (if any) */}
      {currentAllocation && (
        <div className="roommates-card">
          <div className="card-title-bar">
            <h3>
              <i className="fa-solid fa-users text-indigo-600 mr-2"></i>
              Room Companions / Roommates
            </h3>
            <span className="roommate-count-pill">
              <i className="fa-solid fa-user-group mr-1"></i>
              {roommates.length === 0 ? 'No roommates currently' : `${roommates.length} Roommate${roommates.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {roommates.length === 0 ? (
            <div className="empty-roommates-box">
              <i className="fa-solid fa-user-slash empty-icon"></i>
              <p>You currently have no active roommates assigned in Room {currentAllocation.room_number}.</p>
            </div>
          ) : (
            <div className="roommates-grid">
              {roommates.map((rm) => {
                const initials = rm.full_name ? rm.full_name.substring(0, 2).toUpperCase() : 'RM';
                return (
                  <div key={rm.id} className="roommate-card-item">
                    <div className="roommate-avatar">
                      {rm.photo_url ? (
                        <img src={rm.photo_url} alt={rm.full_name} />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="roommate-info">
                      <strong className="roommate-name">{rm.full_name}</strong>
                      <span className="roommate-meta">
                        <i className="fa-solid fa-graduation-cap mr-1"></i>
                        {rm.branch} • Year {rm.year}
                      </span>
                      <span className="roommate-bed-tag">
                        <i className="fa-solid fa-bed mr-1"></i> Bed {rm.bed_number}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stay History Timeline */}
      <div className="history-card">
        <div className="card-title-bar">
          <h3>
            <i className="fa-solid fa-clock-rotate-left text-indigo-600 mr-2"></i>
            Accommodation History
          </h3>
          <span className="history-count-pill">
            <i className="fa-solid fa-list-check mr-1"></i>
            {history.length} Record{history.length !== 1 ? 's' : ''}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="empty-roommates-box">
            <i className="fa-solid fa-history empty-icon"></i>
            <p>No past accommodation history records found.</p>
          </div>
        ) : (
          <div className="history-timeline">
            {history.map((item) => {
              const fromDate = item.allocated_from
                ? new Date(item.allocated_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'N/A';
              const untilDate = item.allocated_until
                ? new Date(item.allocated_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Present';

              return (
                <div key={item.id} className={`timeline-entry status-${item.status?.toLowerCase()}`}>
                  <div className="timeline-header">
                    <div className="timeline-room-title">
                      <i className="fa-solid fa-building mr-1"></i> {item.hostel_name} &bull; Room {item.room_number} &bull; Bed {item.bed_number}
                    </div>
                    <span className={`timeline-status-pill ${item.status}`}>
                      <i className={`fa-solid ${item.status === 'ACTIVE' ? 'fa-check' : item.status === 'TRANSFERRED' ? 'fa-right-left' : 'fa-arrow-right-from-bracket'} mr-1`}></i>
                      {item.status}
                    </span>
                  </div>

                  <div className="timeline-dates">
                    <i className="fa-regular fa-calendar mr-1"></i>
                    <strong>Stay Period:</strong> {fromDate} &mdash; {untilDate}
                  </div>

                  {item.transfer_reason && (
                    <div className="timeline-reason" style={{ color: '#1e40af' }}>
                      <i className="fa-solid fa-arrow-right-arrow-left mr-1"></i>
                      <strong>Transfer Reason:</strong> {item.transfer_reason}
                    </div>
                  )}

                  {item.checkout_reason && (
                    <div className="timeline-reason" style={{ color: '#b91c1c' }}>
                      <i className="fa-solid fa-door-closed mr-1"></i>
                      <strong>Checkout Reason:</strong> {item.checkout_reason} {item.custom_reason ? `(${item.custom_reason})` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Warden Help Box */}
      <div className="warden-help-card">
        <div className="help-icon">
          <i className="fa-solid fa-headset"></i>
        </div>
        <div className="help-content">
          <h4>Room Change or Maintenance Inquiry?</h4>
          <p>
            Need a room transfer or having issues with your allocated bed? You can file a complaint under <strong>My Complaints</strong> or contact your Hostel Superintendent.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentAccommodationPage;
