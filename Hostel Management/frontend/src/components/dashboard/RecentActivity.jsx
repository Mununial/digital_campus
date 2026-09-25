import React, { useEffect, useState } from 'react';
import { getActivities } from '../../api/activity';
import '../activity/ActivityTimeline.css';

export const RecentActivity = ({ limit = 5, onNavigateAll }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const data = await getActivities({ page: 1, limit });
        setActivities(data.activities || data.records || []);
      } catch (err) {
        console.error('Failed to load recent activity widget:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, [limit]);

  return (
    <div className="activity-feed-card" style={{ padding: '20px' }}>
      <div className="feed-header" style={{ marginBottom: '14px', paddingBottom: '10px' }}>
        <h3 className="feed-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'inline-block' }}></span>
          Recent System Activity
        </h3>
        {onNavigateAll && (
          <button
            onClick={onNavigateAll}
            className="btn-reset-filters"
            style={{ padding: '4px 10px', fontSize: '11px', color: '#6366f1', borderColor: '#818cf8' }}
          >
            View All &rarr;
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          Loading activities...
        </div>
      ) : activities.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          No recent activity recorded
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activities.map((item) => (
            <div
              key={item.id}
              className="timeline-card"
              style={{ padding: '10px 12px', fontSize: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                <span className="action-title" style={{ fontSize: '12px' }}>{item.description}</span>
                <span className="timestamp-text" style={{ fontSize: '10px' }}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                <span>By {item.actor_name || 'System'}</span>
                <span className="module-badge badge-default" style={{ fontSize: '9px', padding: '1px 6px' }}>
                  {item.module}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
