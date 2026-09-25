import React from 'react';

const CATEGORY_MAP = {
  ROOM: { label: 'Room Maintenance', icon: 'fa-door-open', color: '#6366f1' },
  ELECTRICITY: { label: 'Electricity / Electrical', icon: 'fa-bolt', color: '#f59e0b' },
  WATER: { label: 'Water Supply', icon: 'fa-faucet-drip', color: '#3b82f6' },
  PLUMBING: { label: 'Plumbing & Drainage', icon: 'fa-wrench', color: '#0ea5e9' },
  CLEANLINESS: { label: 'Cleanliness & Hygiene', icon: 'fa-broom', color: '#10b981' },
  FAN_AC: { label: 'Fan / AC / Cooling', icon: 'fa-fan', color: '#06b6d4' },
  FURNITURE: { label: 'Furniture', icon: 'fa-chair', color: '#b45309' },
  FOOD_MESS: { label: 'Mess & Food', icon: 'fa-utensils', color: '#f97316' },
  INTERNET: { label: 'WiFi / Internet', icon: 'fa-wifi', color: '#8b5cf6' },
  SECURITY: { label: 'Security', icon: 'fa-shield-halved', color: '#ef4444' },
  MAINTENANCE: { label: 'General Maintenance', icon: 'fa-screwdriver-wrench', color: '#64748b' },
  OTHER: { label: 'Other Issue', icon: 'fa-circle-exclamation', color: '#a855f7' }
};

const PRIORITY_BADGES = {
  LOW: { label: 'Low', className: 'priority-tag priority-low', icon: 'fa-arrow-down' },
  MEDIUM: { label: 'Medium', className: 'priority-tag priority-medium', icon: 'fa-minus' },
  HIGH: { label: 'High', className: 'priority-tag priority-high', icon: 'fa-arrow-up' },
  URGENT: { label: 'URGENT', className: 'priority-tag priority-urgent', icon: 'fa-triangle-exclamation' }
};

const STATUS_BADGES = {
  OPEN: { label: 'Open', className: 'status-pill status-open', icon: 'fa-envelope-open' },
  IN_PROGRESS: { label: 'In Progress', className: 'status-pill status-progress', icon: 'fa-spinner fa-spin' },
  RESOLVED: { label: 'Resolved', className: 'status-pill status-resolved', icon: 'fa-circle-check' },
  CLOSED: { label: 'Closed', className: 'status-pill status-closed', icon: 'fa-lock' },
  REOPENED: { label: 'Reopened', className: 'status-pill status-reopened', icon: 'fa-rotate-right' }
};

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const diffMs = new Date() - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ComplaintCard = ({ complaint, onClick, userRole }) => {
  const cat = CATEGORY_MAP[complaint.category] || { label: complaint.category || 'Issue', icon: 'fa-triangle-exclamation', color: '#6366f1' };
  const priorityInfo = PRIORITY_BADGES[complaint.priority] || PRIORITY_BADGES.MEDIUM;
  const statusInfo = STATUS_BADGES[complaint.status] || STATUS_BADGES.OPEN;

  return (
    <div 
      className={`complaint-card ${complaint.priority === 'URGENT' ? 'urgent-border' : ''}`}
      onClick={() => onClick(complaint)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(complaint)}
    >
      <div className="complaint-card-header">
        <div className="complaint-card-meta">
          <span 
            className="category-icon" 
            title={cat.label}
            style={{ color: cat.color, display: 'inline-flex', alignItems: 'center' }}
          >
            <i className={`fa-solid ${cat.icon}`}></i>
          </span>
          <span className="category-label">{cat.label}</span>
          <span className={priorityInfo.className}>
            <i className={`fa-solid ${priorityInfo.icon} mr-1`}></i>
            {priorityInfo.label}
          </span>
        </div>
        <span className={statusInfo.className}>
          <i className={`fa-solid ${statusInfo.icon} mr-1`}></i>
          {statusInfo.label}
        </span>
      </div>

      <h3 className="complaint-card-title">{complaint.title}</h3>
      <p className="complaint-card-desc">{complaint.description}</p>

      <div className="complaint-card-footer">
        <div className="complaint-card-info">
          {userRole !== 'STUDENT' && (
            <span className="complaint-student" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className="fa-solid fa-user-graduate text-indigo-500"></i>
              {complaint.student_name} ({complaint.hostel_name || 'Hostel'}, Rm {complaint.room_number || 'N/A'})
            </span>
          )}
          {userRole === 'STUDENT' && (
            <span className="complaint-location" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className="fa-solid fa-location-dot text-indigo-500"></i>
              {complaint.hostel_name} • Rm {complaint.room_number || 'N/A'}
            </span>
          )}
        </div>
        <span className="complaint-time" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-regular fa-clock text-slate-400"></i>
          {formatRelativeTime(complaint.created_at)}
        </span>
      </div>
    </div>
  );
};

export default ComplaintCard;
