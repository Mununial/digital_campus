import React, { useState, useEffect } from 'react';
import { getMaintenanceAnalytics } from '../../api/operations';

export default function MaintenanceAnalyticsTab({ hostels = [] }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHostel, setSelectedHostel] = useState('');

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMaintenanceAnalytics({ hostel_id: selectedHostel });
      setAnalytics(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch maintenance resolution & hotspot analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedHostel]);

  return (
    <div className="analytics-tab-container">
      {/* Top Bar Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-chart-line text-indigo-600"></i>
            Resolution-Time & Repeated-Problem Analytics
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
            Track mean time to resolve (MTTR) by category and pinpoint high-complaint hotspot rooms across campus.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            className="filter-select"
            value={selectedHostel}
            onChange={(e) => setSelectedHostel(e.target.value)}
          >
            <option value="">All Campus Hostels</option>
            {hostels.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <button type="button" className="filter-reset-btn" onClick={fetchAnalyticsData}>
            <i className="fa-solid fa-rotate-right mr-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error-custom" style={{ marginBottom: '20px' }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div className="spinner mb-3" style={{ margin: '0 auto' }}></div>
          <p style={{ fontWeight: 600 }}>Calculating resolution metrics & hotspot rooms...</p>
        </div>
      ) : !analytics ? null : (
        <>
          {/* MTTR Summary Cards */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-stopwatch text-amber-500"></i>
              Mean Time to Resolve (MTTR) by Category
            </h3>

            {analytics.mttr_by_category && analytics.mttr_by_category.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                {analytics.mttr_by_category.map((cat, idx) => (
                  <div key={idx} style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '16px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="badge-category" style={{ margin: 0 }}>{cat.category}</span>
                      <small style={{ color: '#64748b', fontSize: '0.78rem' }}>{cat.total_resolved} resolved</small>
                    </div>

                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                      {Number(cat.avg_resolution_hours).toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>hours</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px' }}>
                      Average repair duration
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
                No completed maintenance requests recorded yet to calculate MTTR.
              </div>
            )}
          </div>

          {/* Hotspot Rooms Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-fire text-rose-500"></i>
                  Hotspot Rooms (Repeated Problem Analytics)
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                  Rooms with 2 or more maintenance tickets submitted in the past 30 days.
                </p>
              </div>
              <span className="priority-pill priority-urgent" style={{ fontSize: '0.82rem' }}>
                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                {analytics.hotspot_rooms ? analytics.hotspot_rooms.length : 0} Hotspot Rooms Identified
              </span>
            </div>

            {analytics.hotspot_rooms && analytics.hotspot_rooms.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="modern-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Hostel & Room</th>
                      <th style={{ textAlign: 'center' }}>Complaints Count (30d)</th>
                      <th>Categories Affected</th>
                      <th>Latest Ticket Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.hotspot_rooms.map((hr, index) => (
                      <tr key={index}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-door-closed text-indigo-500"></i>
                            Room {hr.room_number}
                          </div>
                          <small style={{ color: '#64748b' }}>{hr.hostel_name}</small>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            background: '#ffe4e6',
                            color: '#e11d48',
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <i className="fa-solid fa-bug"></i>
                            {hr.complaint_count} Complaints
                          </span>
                        </td>
                        <td>
                          <span className="badge-category" style={{ margin: 0 }}>{hr.categories_affected}</span>
                        </td>
                        <td>
                          <small style={{ color: '#64748b' }}>
                            {new Date(hr.last_complaint_date).toLocaleDateString()}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '24px', borderRadius: '12px', textAlign: 'center', fontSize: '0.9rem' }}>
                <i className="fa-solid fa-circle-check text-green-600" style={{ fontSize: '1.8rem', marginBottom: '8px', display: 'block' }}></i>
                <strong>No Hotspot Rooms Detected!</strong>
                <p style={{ margin: '4px 0 0 0', color: '#15803d' }}>
                  All campus rooms have 1 or zero complaints in the last 30 days. No recurring failure patterns found.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
