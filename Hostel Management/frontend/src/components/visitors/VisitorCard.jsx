import React from 'react';

const STATUS_CONFIG = {
  REQUESTED: { label: 'Requested', className: 'status-pill status-requested', icon: 'fa-clock' },
  APPROVED: { label: 'Approved', className: 'status-pill status-approved', icon: 'fa-circle-check' },
  CHECKED_IN: { label: 'Checked In', className: 'status-pill status-checked-in', icon: 'fa-right-to-bracket' },
  CHECKED_OUT: { label: 'Checked Out', className: 'status-pill status-checked-out', icon: 'fa-right-from-bracket' },
  CANCELLED: { label: 'Cancelled', className: 'status-pill status-cancelled', icon: 'fa-ban' },
  REJECTED: { label: 'Rejected', className: 'status-pill status-rejected', icon: 'fa-circle-xmark' }
};

const VISITOR_TYPE_BADGES = {
  PARENT: { label: 'Parent', icon: 'fa-user-group' },
  GUARDIAN: { label: 'Guardian', icon: 'fa-user-shield' },
  RELATIVE: { label: 'Relative', icon: 'fa-people-roof' },
  FRIEND: { label: 'Friend', icon: 'fa-user-tie' },
  OFFICIAL: { label: 'Official', icon: 'fa-id-card-clip' },
  OTHER: { label: 'Visitor', icon: 'fa-user' }
};

export default function VisitorCard({ visit, userRole, onViewDetails, onApprove, onReject, onCancel, onCheckIn, onCheckOut }) {
  const statusInfo = STATUS_CONFIG[visit.status] || { label: visit.status, className: 'status-pill', icon: 'fa-circle-info' };
  const typeInfo = VISITOR_TYPE_BADGES[visit.visitor_type] || { label: visit.visitor_type || 'Visitor', icon: 'fa-user' };
  const isOverdue = Boolean(visit.is_overdue || (visit.status === 'CHECKED_IN' && new Date(visit.expected_check_out) < new Date()));

  const formatDate = (dt) => {
    if (!dt) return 'N/A';
    try {
      const d = new Date(dt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    } catch (e) {
      return dt;
    }
  };

  return (
    <div className={`visitor-card ${isOverdue ? 'visitor-card-overdue' : ''}`}>
      <div className="visitor-card-header">
        <div className="visitor-primary-info">
          <span className="visitor-type-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className={`fa-solid ${typeInfo.icon}`}></i>
            {typeInfo.label}
          </span>
          <h3 className="visitor-name">{visit.visitor_name}</h3>
        </div>
        <div className="visitor-status-container">
          {isOverdue && (
            <span className="overdue-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> OVERDUE
            </span>
          )}
          <span className={statusInfo.className} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <i className={`fa-solid ${statusInfo.icon}`}></i> {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="visitor-card-body">
        <div className="visitor-meta-grid">
          <div className="visitor-meta-item">
            <span className="meta-label">
              <i className="fa-solid fa-phone text-slate-400 mr-1"></i> Contact
            </span>
            <span className="meta-value">{visit.visitor_phone}</span>
          </div>

          <div className="visitor-meta-item">
            <span className="meta-label">
              <i className="fa-solid fa-id-card text-slate-400 mr-1"></i> ID Verification
            </span>
            <span className="meta-value">{visit.identification_type} (••••{visit.identification_last4})</span>
          </div>

          {userRole !== 'STUDENT' && (
            <div className="visitor-meta-item">
              <span className="meta-label">
                <i className="fa-solid fa-user-graduate text-indigo-500 mr-1"></i> Visiting Student
              </span>
              <span className="meta-value highlight-student">
                {visit.student_name} ({visit.student_code})
              </span>
              <span className="sub-meta">Room {visit.room_number || 'N/A'} - Bed {visit.bed_number || 'N/A'}</span>
            </div>
          )}

          <div className="visitor-meta-item">
            <span className="meta-label">
              <i className="fa-solid fa-building text-slate-400 mr-1"></i> Hostel
            </span>
            <span className="meta-value">{visit.hostel_name || 'Main Hostel'}</span>
          </div>
        </div>

        <div className="visitor-purpose">
          <span className="purpose-label">
            <i className="fa-solid fa-message text-slate-400 mr-1"></i> Purpose:
          </span> {visit.purpose}
        </div>

        <div className="visitor-timing-bar">
          <div className="timing-col">
            <span className="timing-title">Expected In</span>
            <span className="timing-time">{formatDate(visit.expected_check_in)}</span>
          </div>
          <div className="timing-arrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-arrow-right text-slate-400"></i>
          </div>
          <div className="timing-col">
            <span className="timing-title">Expected Out</span>
            <span className="timing-time">{formatDate(visit.expected_check_out)}</span>
          </div>
          {visit.actual_check_in && (
            <div className="timing-col actual">
              <span className="timing-title">Actual In</span>
              <span className="timing-time">{formatDate(visit.actual_check_in)}</span>
            </div>
          )}
          {visit.actual_check_out && (
            <div className="timing-col actual">
              <span className="timing-title">Actual Out</span>
              <span className="timing-time">{formatDate(visit.actual_check_out)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="visitor-card-actions">
        <button
          type="button"
          className="btn-action btn-view"
          onClick={() => onViewDetails(visit.id)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <i className="fa-solid fa-eye"></i> View Details
        </button>

        {/* Staff Actions */}
        {userRole !== 'STUDENT' && visit.status === 'REQUESTED' && (
          <>
            <button
              type="button"
              className="btn-action btn-approve"
              onClick={() => onApprove(visit.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <i className="fa-solid fa-check"></i> Approve
            </button>
            <button
              type="button"
              className="btn-action btn-reject"
              onClick={() => onReject(visit.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <i className="fa-solid fa-xmark"></i> Reject
            </button>
          </>
        )}

        {userRole !== 'STUDENT' && visit.status === 'APPROVED' && (
          <button
            type="button"
            className="btn-action btn-checkin"
            onClick={() => onCheckIn(visit.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <i className="fa-solid fa-right-to-bracket"></i> Check In
          </button>
        )}

        {userRole !== 'STUDENT' && visit.status === 'CHECKED_IN' && (
          <button
            type="button"
            className="btn-action btn-checkout"
            onClick={() => onCheckOut(visit.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <i className="fa-solid fa-right-from-bracket"></i> Check Out
          </button>
        )}

        {/* Student or Staff Cancel */}
        {(visit.status === 'REQUESTED' || visit.status === 'APPROVED') && (
          <button
            type="button"
            className="btn-action btn-cancel"
            onClick={() => onCancel(visit.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <i className="fa-solid fa-ban"></i> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
