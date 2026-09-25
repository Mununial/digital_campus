import React from 'react';
import './NoticeCard.css';

/**
 * Priority badge helper
 */
const PriorityBadge = ({ priority }) => {
  const normalized = (priority || 'GENERAL').toUpperCase();
  let label = 'GENERAL';
  let icon = 'fa-bell';
  let className = 'priority-general';

  if (normalized === 'URGENT') {
    label = 'URGENT';
    icon = 'fa-triangle-exclamation';
    className = 'priority-urgent';
  } else if (normalized === 'IMPORTANT') {
    label = 'IMPORTANT';
    icon = 'fa-circle-exclamation';
    className = 'priority-important';
  }

  return (
    <span className={`notice-priority-badge ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <i className={`fa-solid ${icon}`}></i>
      <span className="priority-text">{label}</span>
    </span>
  );
};

/**
 * Status badge helper (for admin/staff)
 */
const StatusBadge = ({ status }) => {
  const norm = (status || 'DRAFT').toUpperCase();
  const icon = norm === 'PUBLISHED' ? 'fa-circle-check' : norm === 'ARCHIVED' ? 'fa-box-archive' : 'fa-pen-ruler';
  return (
    <span className={`notice-status-badge status-${norm.toLowerCase()}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <i className={`fa-solid ${icon}`}></i>
      {norm}
    </span>
  );
};

const NoticeCard = ({
  notice,
  userRole,
  onView,
  onEdit,
  onStatusChange,
  onDelete
}) => {
  if (!notice) return null;

  const isStudent = userRole === 'STUDENT';
  const isUnread = isStudent && notice.is_read === false;

  // Format date cleanly (e.g. 23 Aug 2026)
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unpublished';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isAllHostels = notice.hostel_id === null;

  return (
    <div className={`notice-card ${isUnread ? 'unread-card' : ''}`}>
      <div className="notice-card-header">
        <div className="notice-meta-left">
          <PriorityBadge priority={notice.priority} />

          {isStudent && (
            <span className={`read-state-badge ${isUnread ? 'unread' : 'read'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="read-state-dot" />
              {isUnread ? 'UNREAD' : 'READ'}
            </span>
          )}

          {!isStudent && notice.status && (
            <StatusBadge status={notice.status} />
          )}
        </div>

        <span className="notice-target-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className={`fa-solid ${isAllHostels ? 'fa-users' : 'fa-building'}`}></i>
          {isAllHostels ? 'All Hostels' : (notice.hostel_name || `Hostel #${notice.hostel_id}`)}
        </span>
      </div>

      <div className="notice-card-body">
        <h3 className="notice-title" onClick={() => onView && onView(notice)}>
          {notice.title}
        </h3>
        
        <p className="notice-description-snippet">
          {notice.description}
        </p>
      </div>

      <div className="notice-card-footer">
        <div className="notice-timestamps">
          <span className="notice-date" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <i className="fa-regular fa-calendar text-slate-400"></i>
            {formatDate(notice.published_at || notice.created_at)}
          </span>
          {notice.expires_at && (
            <span className="notice-expiration" title="Expiration date" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-regular fa-clock text-amber-500"></i>
              Expires {formatDate(notice.expires_at)}
            </span>
          )}
        </div>

        <div className="notice-actions">
          <button
            type="button"
            className="notice-btn btn-view"
            onClick={() => onView && onView(notice)}
            aria-label={`View notice ${notice.title}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <i className="fa-solid fa-eye"></i> View Details
          </button>

          {!isStudent && (
            <>
              {onEdit && (
                <button
                  type="button"
                  className="notice-btn btn-edit"
                  onClick={() => onEdit(notice)}
                  title="Edit Notice"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="fa-solid fa-pen"></i> Edit
                </button>
              )}

              {onStatusChange && notice.status === 'DRAFT' && (
                <button
                  type="button"
                  className="notice-btn btn-publish"
                  onClick={() => onStatusChange(notice.id, 'PUBLISHED')}
                  title="Publish Notice"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="fa-solid fa-paper-plane"></i> Publish
                </button>
              )}

              {onStatusChange && notice.status === 'PUBLISHED' && (
                <button
                  type="button"
                  className="notice-btn btn-archive"
                  onClick={() => onStatusChange(notice.id, 'ARCHIVED')}
                  title="Archive Notice"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="fa-solid fa-box-archive"></i> Archive
                </button>
              )}

              {onDelete && userRole === 'SUPER_ADMIN' && (
                <button
                  type="button"
                  className="notice-btn btn-delete"
                  onClick={() => onDelete(notice.id)}
                  title="Delete Notice"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticeCard;
