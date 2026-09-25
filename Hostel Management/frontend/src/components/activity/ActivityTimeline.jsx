import React, { useState, useEffect } from 'react';
import { getActivities, getActivityStats } from '../../api/activity';
import { ActivityFilterBar } from './ActivityFilterBar';
import { ActivityDetailsModal } from './ActivityDetailsModal';
import './ActivityTimeline.css';

const getModuleBadgeClass = (module) => {
  switch (module) {
    case 'AUTHENTICATION': return 'badge-auth';
    case 'USERS': return 'badge-users';
    case 'STUDENTS': return 'badge-students';
    case 'HOSTELS': return 'badge-hostels';
    case 'ATTENDANCE': return 'badge-attendance';
    case 'NOTICES': return 'badge-notices';
    case 'COMPLAINTS': return 'badge-complaints';
    case 'VISITORS': return 'badge-visitors';
    case 'MESS': return 'badge-mess';
    case 'FEES': return 'badge-fees';
    default: return 'badge-default';
  }
};

export const ActivityTimeline = () => {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    module: '',
    hostelId: '',
    search: '',
    startDate: '',
    endDate: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [actData, statsData] = await Promise.all([
        getActivities(filters),
        getActivityStats().catch(() => null)
      ]);

      if (actData) {
        setActivities(actData.activities || actData.records || (Array.isArray(actData) ? actData : []));
        setPagination({
          page: actData.page || 1,
          totalPages: actData.totalPages || 1,
          total: actData.total || (actData.activities ? actData.activities.length : 0)
        });
      }

      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error fetching activity log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      module: '',
      hostelId: '',
      search: '',
      startDate: '',
      endDate: ''
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setFilters((prev) => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="activity-container">
      {/* Header */}
      <div className="activity-header">
        <h1 className="activity-title">System Activity & Audit Center</h1>
        <p className="activity-subtitle">
          Centralized operational audit trail tracking actions across all hostel management modules.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="activity-stats-grid">
        <div className="activity-stat-card">
          <span className="stat-label">Total Today</span>
          <span className="stat-value">{stats?.totalToday ?? stats?.total ?? pagination.total ?? 0}</span>
        </div>

        <div className="activity-stat-card">
          <span className="stat-label">Logins Today</span>
          <span className="stat-value indigo">{stats?.loginsToday ?? stats?.last24Hours ?? 0}</span>
        </div>

        <div className="activity-stat-card">
          <span className="stat-label">Student Updates</span>
          <span className="stat-value emerald">
            {stats?.studentChangesToday ?? stats?.uniqueActors ?? 0}
          </span>
        </div>

        <div className="activity-stat-card">
          <span className="stat-label">Operations Logged</span>
          <span className="stat-value amber">{stats?.operationalToday ?? 0}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <ActivityFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Activities Feed Timeline */}
      <div className="activity-feed-card">
        <div className="feed-header">
          <h2 className="feed-title">Activity Log Timeline</h2>
          <span className="feed-meta">
            Showing {activities.length} of {pagination.total} entries
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
            <p className="feed-meta">Loading activity logs...</p>
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
            <p style={{ fontWeight: 700, fontSize: '15px' }}>No activity logs found</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>System events will appear here as users perform operations.</p>
          </div>
        ) : (
          <div className="timeline-track">
            {activities.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedActivity(item)}
                className="timeline-item"
              >
                {/* Dot */}
                <div className="timeline-dot" />

                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <div className="timeline-badge-group">
                      <span className={`module-badge ${getModuleBadgeClass(item.module)}`}>
                        {item.module || 'SYSTEM'}
                      </span>
                      <span className="action-title">{item.action}</span>
                    </div>
                    <span className="timestamp-text">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="item-description">{item.description}</p>

                  <div className="item-footer">
                    <div>
                      <span>Actor: </span>
                      <span className="actor-highlight">{item.actor_name || item.actor_username || 'System'}</span>
                      {item.actor_role && (
                        <span className="timestamp-text"> ({item.actor_role})</span>
                      )}
                    </div>

                    {item.hostel_name && (
                      <div>
                        <span>Hostel: </span>
                        <span className="actor-highlight">{item.hostel_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="pagination-btn"
            >
              &larr; Previous
            </button>
            <span className="feed-meta">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="pagination-btn"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};
