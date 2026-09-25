import React, { useState, useEffect } from 'react';
import { getOperationsSummary } from '../api/operations';
import { useNavigate } from 'react-router-dom';

export default function OperationsDashboardPage({ role = 'SUPER_ADMIN' }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const basePath = role === 'SUPERINTENDENT' ? '/superintendent' : '/admin';

  useEffect(() => {
    setLoading(true);
    setError(null);
    getOperationsSummary()
      .then(data => setSummary(data))
      .catch(err => setError(err.message || 'Failed to fetch operations summary metrics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading Hostel Operations Hub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger p-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  const m = summary?.maintenanceMetrics || {};
  const insp = summary?.inspectionMetrics || {};
  const hostels = summary?.hostelHealth || [];

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="h4 font-weight-bold mb-1">
            <i className="bi bi-speedometer2 text-primary me-2"></i>
            Hostel Operations & Daily Maintenance Hub
          </h2>
          <p className="text-muted small mb-0">
            Real-time status overview of room health, pending maintenance tasks, and hostel infrastructure.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={() => navigate(`${basePath}/maintenance`)}
          >
            <i className="bi bi-tools me-1"></i>
            Maintenance Center
          </button>
          <button
            className="btn btn-dark"
            onClick={() => navigate(`${basePath}/inspections`)}
          >
            <i className="bi bi-clipboard-check me-1"></i>
            Room Inspections
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="row g-3 mb-4">
        {/* Open Maintenance */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 bg-primary text-white h-100 p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-white-50 small font-weight-bold d-block text-uppercase">Open Maintenance</span>
                <h2 className="display-6 font-weight-bold mb-0">{m.totalActive || 0}</h2>
              </div>
              <i className="bi bi-tools display-5 text-white-50"></i>
            </div>
            <small className="mt-2 text-white-50">
              {m.openCount || 0} Open, {m.assignedCount || 0} Assigned, {m.inProgressCount || 0} In Progress
            </small>
          </div>
        </div>

        {/* Urgent Maintenance */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 bg-danger text-white h-100 p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-white-50 small font-weight-bold d-block text-uppercase">Urgent Priority</span>
                <h2 className="display-6 font-weight-bold mb-0">{m.urgentCount || 0}</h2>
              </div>
              <i className="bi bi-exclamation-triangle-fill display-5 text-white-50"></i>
            </div>
            <small className="mt-2 text-white-50">High-priority physical repairs pending</small>
          </div>
        </div>

        {/* Rooms Inspected Today */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 bg-dark text-white h-100 p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-white-50 small font-weight-bold d-block text-uppercase">Inspected Today</span>
                <h2 className="display-6 font-weight-bold mb-0">{insp.inspectedToday || 0}</h2>
              </div>
              <i className="bi bi-calendar-check display-5 text-white-50"></i>
            </div>
            <small className="mt-2 text-white-50">Rooms checked on current date</small>
          </div>
        </div>

        {/* Critical Condition Rooms */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 bg-warning text-dark h-100 p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-dark-50 small font-weight-bold d-block text-uppercase">Critical Rooms</span>
                <h2 className="display-6 font-weight-bold mb-0">{insp.criticalRooms || 0}</h2>
              </div>
              <i className="bi bi-house-exclamation display-5 text-dark-50"></i>
            </div>
            <small className="mt-2 text-dark-50">
              {insp.attentionRequiredRooms || 0} rooms require attention
            </small>
          </div>
        </div>
      </div>

      {/* Hostel Operations Health Summary Table */}
      <div className="card shadow-sm border mb-4">
        <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
          <h5 className="card-title font-weight-bold mb-0">
            <i className="bi bi-building me-2"></i>
            Hostel Infrastructure Health Overview
          </h5>
          <span className="badge bg-secondary">{hostels.length} Hostels</span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Hostel Code & Name</th>
                <th className="text-center">Total Rooms</th>
                <th className="text-center">Occupied Beds</th>
                <th className="text-center">Open Maintenance</th>
                <th className="text-center">Critical Condition Rooms</th>
                <th className="text-end">Status</th>
              </tr>
            </thead>
            <tbody>
              {hostels.map(h => (
                <tr key={h.hostel_id}>
                  <td>
                    <div className="fw-bold">{h.hostel_name}</div>
                    <small className="text-muted">Code: {h.hostel_code}</small>
                  </td>
                  <td className="text-center fw-bold">{h.total_rooms}</td>
                  <td className="text-center">{h.occupied_beds}</td>
                  <td className="text-center">
                    {h.open_maintenance > 0 ? (
                      <span className="badge bg-primary fs-6">{h.open_maintenance}</span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="text-center">
                    {h.critical_rooms > 0 ? (
                      <span className="badge bg-danger fs-6">{h.critical_rooms}</span>
                    ) : (
                      <span className="badge bg-success">GOOD</span>
                    )}
                  </td>
                  <td className="text-end">
                    {h.critical_rooms > 0 || h.open_maintenance > 5 ? (
                      <span className="badge bg-warning text-dark">Action Required</span>
                    ) : (
                      <span className="badge bg-success">Optimal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
