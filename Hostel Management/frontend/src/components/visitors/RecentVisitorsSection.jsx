import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function RecentVisitorsSection({ userRole, onRequestNewVisitor }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ current: 0, overdue: 0, todayVisits: 0, pending: 0, total: 0 });
  const [currentVisitors, setCurrentVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardVisitorData();
  }, []);

  const fetchDashboardVisitorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, currentRes] = await Promise.all([
        api.getVisitorSummary(),
        api.getCurrentVisitors({ limit: 5 })
      ]);
      setSummary(sumRes.data || {});
      setCurrentVisitors(currentRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard visitor data:', err);
      setError('Unable to load current visitor status.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckOut = async (visitId) => {
    try {
      await api.checkOutVisit(visitId, 'Quick checkout from dashboard');
      fetchDashboardVisitorData();
    } catch (err) {
      alert(err.message || 'Failed to check out visitor.');
    }
  };

  return (
    <div className="recent-visitors-section">
      <div className="section-header-flex">
        <div>
          <h3>Visitor Management Overview</h3>
          <p className="section-subtitle">Real-time gate tracking and current hostel visitors</p>
        </div>
        <div className="section-header-actions">
          {userRole === 'STUDENT' ? (
            <button type="button" className="btn-primary btn-sm" onClick={onRequestNewVisitor}>
              + Request Visitor
            </button>
          ) : (
            <button type="button" className="btn-primary btn-sm" onClick={onRequestNewVisitor}>
              + Register Visitor
            </button>
          )}
          <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/visitors')}>
            View All Visitors ➔
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="visitor-kpi-grid">
        <div className="visitor-kpi-card kpi-current">
          <div className="kpi-icon"></div>
          <div className="kpi-info">
            <span className="kpi-label">Currently Inside</span>
            <span className="kpi-number">{summary.current}</span>
          </div>
        </div>

        <div className={`visitor-kpi-card kpi-overdue ${summary.overdue > 0 ? 'alert-overdue' : ''}`}>
          <div className="kpi-icon">️</div>
          <div className="kpi-info">
            <span className="kpi-label">Overdue Visitors</span>
            <span className="kpi-number">{summary.overdue}</span>
          </div>
        </div>

        <div className="visitor-kpi-card kpi-today">
          <div className="kpi-icon"></div>
          <div className="kpi-info">
            <span className="kpi-label">Today's Visits</span>
            <span className="kpi-number">{summary.todayVisits}</span>
          </div>
        </div>

        <div className="visitor-kpi-card kpi-pending">
          <div className="kpi-icon"></div>
          <div className="kpi-info">
            <span className="kpi-label">Pending Requests</span>
            <span className="kpi-number">{summary.pending}</span>
          </div>
        </div>
      </div>

      {/* Current Visitors Table / List */}
      <div className="current-visitors-container">
        <h4 className="container-title">Currently Checked-In Visitors</h4>

        {loading ? (
          <div className="loading-state-inline">Loading current visitors...</div>
        ) : error ? (
          <div className="error-state-inline">{error}</div>
        ) : currentVisitors.length === 0 ? (
          <div className="empty-visitors-state">
            <span className="empty-icon"></span>
            <p>No active visitors inside the hostel right now.</p>
          </div>
        ) : (
          <div className="current-visitors-list">
            {currentVisitors.map((v) => {
              const isOverdue = Boolean(v.is_overdue || new Date(v.expected_check_out) < new Date());
              return (
                <div key={v.id} className={`current-visitor-item ${isOverdue ? 'item-overdue' : ''}`}>
                  <div className="item-main">
                    <span className="visitor-type-badge">{v.visitor_type}</span>
                    <strong className="visitor-title">{v.visitor_name}</strong>
                    <span className="visitor-phone"> {v.visitor_phone}</span>
                  </div>

                  <div className="item-student">
                    <span className="student-name">Visiting: {v.student_name}</span>
                    <span className="room-badge">Room {v.room_number || 'N/A'}</span>
                  </div>

                  <div className="item-time">
                    <span className="time-label">Entered:</span> {new Date(v.actual_check_in || v.expected_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isOverdue && <span className="overdue-tag">️ OVERDUE</span>}
                  </div>

                  {userRole !== 'STUDENT' && (
                    <div className="item-action">
                      <button
                        type="button"
                        className="btn-checkout-sm"
                        onClick={() => handleQuickCheckOut(v.id)}
                      >
                         Check Out
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
