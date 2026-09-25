import React from 'react';
import './ActivityTimeline.css';

export const ActivityDetailsModal = ({ activity, onClose }) => {
  if (!activity) return null;

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <span className={`module-badge ${getModuleBadgeClass(activity.module)}`}>
              {activity.module || 'SYSTEM'}
            </span>
            <h3 className="action-title" style={{ fontSize: '18px', marginTop: '6px' }}>
              {activity.action}
            </h3>
          </div>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>

        {/* Details Grid */}
        <div className="modal-body">
          <div className="detail-box">
            <h4 className="detail-box-label">Description</h4>
            <p className="detail-box-value">{activity.description || 'No description available'}</p>
          </div>

          <div className="grid-2">
            <div className="detail-box">
              <span className="detail-box-label">Actor</span>
              <p className="detail-box-value">{activity.actor_name || 'System / Anonymous'}</p>
              {activity.actor_username && (
                <span className="timestamp-text">@{activity.actor_username} ({activity.actor_role})</span>
              )}
            </div>

            <div className="detail-box">
              <span className="detail-box-label">Timestamp</span>
              <p className="detail-box-value">{new Date(activity.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid-2">
            <div className="detail-box">
              <span className="detail-box-label">Hostel Context</span>
              <p className="detail-box-value">{activity.hostel_name || 'Global / N/A'}</p>
            </div>

            <div className="detail-box">
              <span className="detail-box-label">Target Entity</span>
              <p className="detail-box-value">
                {activity.entity_type ? `${activity.entity_type} #${activity.entity_id || ''}` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Metadata JSON display */}
          {activity.metadata && (
            <div className="detail-box">
              <span className="detail-box-label" style={{ marginBottom: '8px', display: 'block' }}>Event Metadata</span>
              <pre className="json-code-block">{JSON.stringify(activity.metadata, null, 2)}</pre>
            </div>
          )}

          {/* Technical Info */}
          <div className="item-footer">
            <span>IP: {activity.ip_address || 'Internal'}</span>
            <span className="timestamp-text" title={activity.user_agent}>
              UA: {activity.user_agent || 'Server Process'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-reset-filters">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
