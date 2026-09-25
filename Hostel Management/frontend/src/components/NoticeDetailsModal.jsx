import React, { useEffect } from 'react';
import api from '../services/api';
import './NoticeDetailsModal.css';

const PriorityBadge = ({ priority }) => {
  const norm = (priority || 'GENERAL').toUpperCase();
  let label = 'GENERAL';
  let icon = 'fa-bell';
  let className = 'priority-general';

  if (norm === 'URGENT') {
    label = 'URGENT';
    icon = 'fa-triangle-exclamation';
    className = 'priority-urgent';
  } else if (norm === 'IMPORTANT') {
    label = 'IMPORTANT';
    icon = 'fa-circle-exclamation';
    className = 'priority-important';
  }

  return (
    <span className={`detail-priority-badge ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <i className={`fa-solid ${icon}`}></i>
      <span>{label}</span>
    </span>
  );
};

const NoticeDetailsModal = ({
  notice,
  userRole,
  onClose,
  onReadMarked
}) => {
  useEffect(() => {
    if (notice && userRole === 'STUDENT' && !notice.is_read) {
      // Mark as read automatically when student opens detail modal
      api.markNoticeRead(notice.id)
        .then(() => {
          onReadMarked && onReadMarked(notice.id);
        })
        .catch(err => console.error('Failed to mark read:', err));
    }
  }, [notice, userRole, onReadMarked]);

  if (!notice) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isAllHostels = notice.hostel_id === null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notice-details-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-modal-header">
          <div className="detail-header-tags">
            <PriorityBadge priority={notice.priority} />
            <span className="detail-target-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className={`fa-solid ${isAllHostels ? 'fa-users' : 'fa-building'}`}></i>
              {isAllHostels ? 'All Hostels (College Wide)' : (notice.hostel_name || `Hostel #${notice.hostel_id}`)}
            </span>
          </div>

          <button className="modal-close-btn" onClick={onClose} aria-label="Close" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="detail-modal-body">
          <h2 className="detail-title">{notice.title}</h2>

          <div className="detail-meta-grid">
            <div className="meta-item">
              <span className="meta-label">
                <i className="fa-regular fa-calendar text-slate-400 mr-1"></i> Published Date:
              </span>
              <span className="meta-value">{formatDate(notice.published_at || notice.created_at)}</span>
            </div>

            {notice.creator_name && (
              <div className="meta-item">
                <span className="meta-label">
                  <i className="fa-solid fa-user-tie text-indigo-500 mr-1"></i> Issued By:
                </span>
                <span className="meta-value">{notice.creator_name}</span>
              </div>
            )}

            {notice.expires_at && (
              <div className="meta-item">
                <span className="meta-label">
                  <i className="fa-regular fa-clock text-amber-500 mr-1"></i> Expires On:
                </span>
                <span className="meta-value expires-value">{formatDate(notice.expires_at)}</span>
              </div>
            )}
          </div>

          <div className="detail-divider" />

          {/* Plain Text Description Display to Prevent XSS */}
          <div className="detail-description-box">
            {notice.description.split('\n').map((paragraph, index) => (
              <p key={index} className="description-paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="detail-modal-footer">
          <button type="button" className="btn-close-detail" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeDetailsModal;
