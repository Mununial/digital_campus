import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './StudentAttendancePage.css';

const StudentAttendancePage = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ totalMarked: 0, present: 0, absent: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getMyAttendance();
      if (res.success) {
        setHistory(res.history || []);
        setSummary(res.summary || { totalMarked: 0, present: 0, absent: 0, percentage: 0 });
      } else {
        setError(res.message || 'Failed to load attendance records.');
      }
    } catch (err) {
      console.error('Error fetching student attendance:', err);
      setError(err.message || 'Unable to load attendance details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const percentage = summary.percentage || 0;
  const isHealthy = percentage >= 85;
  const isWarning = percentage >= 75 && percentage < 85;
  const isCritical = percentage < 75;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // Generate date status map for calendar view
  const dateStatusMap = {};
  history.forEach(item => {
    if (item.date) {
      // Format as YYYY-MM-DD
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      dateStatusMap[dateKey] = item.status;
    }
  });

  return (
    <div className="student-attendance-container">
      {/* Hero Banner with Attendance Health Gauge */}
      <div className="student-attendance-hero">
        <div className="student-hero-flex">
          <div className="hero-main-title">
            <h1>
              <i className="fa-solid fa-calendar-check"></i> My Attendance Record
            </h1>
            <p>Track your daily hostel presence, monthly standing, and eligibility requirements.</p>
          </div>

          <div className="percentage-gauge-box">
            <div 
              className="gauge-val" 
              style={{ color: isHealthy ? '#4ade80' : isWarning ? '#fbbf24' : '#f87171' }}
            >
              {percentage}%
            </div>
            <div className="gauge-label">
              {isHealthy ? '🟢 Excellent Standing' : isWarning ? '🟡 Satisfactory' : '🔴 Critical Warning'}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alert Warning if Attendance < 75% */}
      {isCritical && summary.totalMarked > 0 && (
        <div className="alert alert-error mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffe4e6', color: '#be123c', padding: '16px 20px', borderRadius: '16px', border: '1px solid #fecdd3' }}>
          <i className="fa-solid fa-triangle-exclamation text-xl"></i>
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Attendance Defaulter Warning</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
              Your attendance is currently below the mandatory 75% minimum threshold ({percentage}%). Please meet your Hostel Superintendent.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error mb-4" style={{ background: '#ffe4e6', color: '#be123c', padding: '12px 16px', borderRadius: '12px' }}>
          <i className="fa-solid fa-circle-exclamation mr-2"></i> {error}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="student-stats-grid">
        <div className="student-stat-card">
          <div className="student-stat-icon kpi-icon-indigo">
            <i className="fa-solid fa-calendar-days"></i>
          </div>
          <div>
            <div className="val">{summary.totalMarked}</div>
            <div className="lbl">Total Recorded Days</div>
          </div>
        </div>

        <div className="student-stat-card">
          <div className="student-stat-icon kpi-icon-emerald">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div className="val" style={{ color: '#15803d' }}>{summary.present}</div>
            <div className="lbl">Days Present</div>
          </div>
        </div>

        <div className="student-stat-card">
          <div className="student-stat-icon kpi-icon-rose">
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <div>
            <div className="val" style={{ color: '#be123c' }}>{summary.absent}</div>
            <div className="lbl">Days Absent</div>
          </div>
        </div>
      </div>

      {/* Recent History Table */}
      <div className="attendance-history-card">
        <h3>
          <i className="fa-solid fa-clock-rotate-left text-indigo-600"></i> Attendance History Log
        </h3>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-2xl mb-2"></i>
            <p style={{ fontWeight: 600 }}>Loading attendance history...</p>
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <i className="fa-solid fa-calendar-xmark text-slate-300 text-4xl mb-2"></i>
            <p style={{ fontWeight: 600 }}>No attendance records recorded yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="roll-call-table">
              <thead>
                <tr>
                  <th>Roll Call Date</th>
                  <th>Status</th>
                  <th>Hostel Residence</th>
                  <th>Verified By</th>
                  <th>Marked At</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.id || row.date}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      <i className="fa-regular fa-calendar text-indigo-500 mr-2"></i>
                      {formatDate(row.date)}
                    </td>
                    <td>
                      <span className={`status-pill ${row.status === 'PRESENT' ? 'status-approved' : 'status-rejected'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <i className={`fa-solid ${row.status === 'PRESENT' ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ color: '#475569' }}>
                      {row.hostel_name || 'Main Hostel'}
                    </td>
                    <td style={{ color: '#475569', fontWeight: 600 }}>
                      {row.marked_by_name || 'Superintendent'}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {row.marked_at ? new Date(row.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendancePage;
