import React from 'react';

/**
 * MessAnalyticsCard - Visual breakdown of participation stats per meal.
 */
const MessAnalyticsCard = ({ analyticsData }) => {
  if (!analyticsData || !analyticsData.analytics) {
    return (
      <div className="card analytics-card empty">
        <p>No mess analytics data available.</p>
      </div>
    );
  }

  const { analytics, startDate, endDate } = analyticsData;
  const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
  const labels = {
    BREAKFAST: 'Breakfast',
    LUNCH: 'Lunch',
    SNACKS: 'Snacks',
    DINNER: 'Dinner'
  };

  return (
    <div className="card mess-analytics-card">
      <div className="card-header flex-between">
        <h3>Mess Participation Analytics</h3>
        <span className="text-muted text-sm">
          {startDate && endDate ? `${startDate} to ${endDate}` : 'Last 7 Days'}
        </span>
      </div>

      <div className="card-body">
        <div className="analytics-grid">
          {mealTypes.map(type => {
            const data = analytics[type] || { participationPercentage: 100, taking: 0, notTaking: 0 };
            const pct = data.participationPercentage ?? 100;

            return (
              <div key={type} className="analytics-meal-item">
                <div className="analytics-meal-header">
                  <span className="meal-name">{labels[type]}</span>
                  <span className="meal-pct-value">{pct}% Taking</span>
                </div>

                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill taking-fill"
                    style={{ width: `${pct}%` }}
                    title={`${pct}% Opted In`}
                  />
                </div>

                <div className="analytics-stats-footer">
                  <span className="stat-pill taking">Opted In: {data.taking}</span>
                  <span className="stat-pill not-taking">Opted Out: {data.notTaking}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MessAnalyticsCard;
