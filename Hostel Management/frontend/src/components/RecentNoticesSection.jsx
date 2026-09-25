import React from 'react';
import { useNavigate } from 'react-router-dom';
import NoticeCard from './NoticeCard';
import './RecentNoticesSection.css';

const RecentNoticesSection = ({
  notices = [],
  userRole,
  onViewNotice,
  loading = false
}) => {
  const navigate = useNavigate();

  const getNoticesPath = () => {
    switch (userRole) {
      case 'SUPER_ADMIN': return '/admin/notices';
      case 'SUPERINTENDENT': return '/superintendent/notices';
      case 'STUDENT': return '/student/notices';
      default: return '/';
    }
  };

  return (
    <section className="recent-notices-section">
      <div className="section-header">
        <div className="header-left">
          <h2 className="section-title">Recent Announcements & Notices</h2>
          <span className="section-subtitle">Stay updated with official hostel communications</span>
        </div>

        <button
          className="btn-view-all"
          onClick={() => navigate(getNoticesPath())}
        >
          View All Notices →
        </button>
      </div>

      {loading ? (
        <div className="notices-skeleton-grid">
          {[1, 2, 3].map(n => (
            <div key={n} className="notice-skeleton-card" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="empty-notices-banner">
          <span className="empty-icon"></span>
          <div className="empty-text">
            <h3>No recent notices</h3>
            <p>There are no active published notices at this time.</p>
          </div>
        </div>
      ) : (
        <div className="recent-notices-grid">
          {notices.slice(0, 4).map(notice => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              userRole={userRole}
              onView={onViewNotice}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default RecentNoticesSection;
