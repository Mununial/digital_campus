import React from 'react';

const ReportChart = ({ title, data = [], xKey = 'date', yKey = 'count', label = 'Value', color = '#4F46E5', isCurrency = false }) => {
  if (!data || data.length === 0) {
    return (
      <div className="report-chart-card card">
        <h4 className="chart-title">{title}</h4>
        <div className="chart-empty">No trend data available for selected period.</div>
      </div>
    );
  }

  const values = data.map(d => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 1);

  const formatYVal = (val) => {
    if (isCurrency) {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return val;
  };

  return (
    <div className="report-chart-card card">
      <div className="chart-header">
        <h4 className="chart-title">{title}</h4>
        <span className="chart-badge">{data.length} Data Points</span>
      </div>

      <div className="chart-container">
        <div className="svg-chart-wrapper">
          <svg className="report-svg-chart" viewBox={`0 0 ${Math.max(data.length * 60, 300)} 180`} preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="30" x2="100%" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="100%" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="0" y1="130" x2="100%" y2="130" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

            {/* Bars */}
            {data.map((item, idx) => {
              const val = Number(item[yKey]) || 0;
              const barHeight = (val / maxVal) * 120;
              const xPos = idx * 60 + 20;
              const yPos = 150 - barHeight;

              return (
                <g key={idx} className="chart-bar-group">
                  <rect
                    x={xPos}
                    y={yPos}
                    width="28"
                    height={Math.max(barHeight, 4)}
                    rx="4"
                    fill={color}
                    opacity="0.85"
                    className="chart-bar-rect"
                  >
                    <title>{`${item[xKey]}: ${formatYVal(val)}`}</title>
                  </rect>
                  <text
                    x={xPos + 14}
                    y={yPos - 6}
                    textAnchor="middle"
                    fill="#E2E8F0"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {val > 0 ? (isCurrency ? `₹${Math.round(val/1000)}k` : val) : ''}
                  </text>
                  <text
                    x={xPos + 14}
                    y="170"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="9"
                  >
                    {String(item[xKey]).substring(5)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ReportChart;
