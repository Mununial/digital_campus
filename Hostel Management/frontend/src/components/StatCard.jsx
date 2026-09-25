import React from 'react';
import './StatCard.css';

/**
 * Reusable stat card for the dashboard.
 * Props:
 *   title    - string label
 *   value    - number/string to display
 *   subtitle - optional secondary text
 *   icon     - optional emoji/SVG
 *   loading  - show skeleton when true
 *   color    - optional accent class: 'green' | 'red' | 'amber' | 'blue'
 */
function StatCard({ title, value, subtitle, icon, loading = false, color }) {
  if (loading) {
    return (
      <div className="stat-card stat-card--loading" aria-busy="true" aria-label={`Loading ${title}`}>
        <div className="stat-skeleton stat-skeleton--icon" />
        <div className="stat-skeleton stat-skeleton--title" />
        <div className="stat-skeleton stat-skeleton--value" />
      </div>
    );
  }

  return (
    <div className={`stat-card${color ? ` stat-card--${color}` : ''}`}>
      {icon && <div className="stat-icon" aria-hidden="true">{icon}</div>}
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value ?? '—'}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}

export default StatCard;
