import React from 'react';
import './AttendanceChart.css';

/**
 * AttendanceChart — visual summary of today's attendance.
 * Shows a segmented bar + counts for Present, Absent, Not Marked.
 */
function AttendanceChart({ present = 0, absent = 0, notMarked = 0 }) {
  const total = present + absent + notMarked;
  const isEmpty = total === 0;

  const pct = (val) => (total > 0 ? ((val / total) * 100).toFixed(1) : 0);

  return (
    <section className="attendance-chart" aria-labelledby="att-chart-title">
      <h3 id="att-chart-title">Today's Attendance</h3>

      {isEmpty ? (
        <p className="chart-empty">No attendance data recorded for today.</p>
      ) : (
        <>
          {/* Segmented progress bar */}
          <div className="att-bar" role="img" aria-label={`Attendance: ${present} present, ${absent} absent, ${notMarked} not marked`}>
            {present > 0 && (
              <div
                className="att-bar__segment att-bar__segment--present"
                style={{ width: `${pct(present)}%` }}
                title={`Present: ${present}`}
              />
            )}
            {absent > 0 && (
              <div
                className="att-bar__segment att-bar__segment--absent"
                style={{ width: `${pct(absent)}%` }}
                title={`Absent: ${absent}`}
              />
            )}
            {notMarked > 0 && (
              <div
                className="att-bar__segment att-bar__segment--unmarked"
                style={{ width: `${pct(notMarked)}%` }}
                title={`Not Marked: ${notMarked}`}
              />
            )}
          </div>

          {/* Legend */}
          <ul className="att-legend">
            <li className="att-legend__item">
              <span className="att-legend__dot att-legend__dot--present" aria-hidden="true" />
              <span className="att-legend__label">Present</span>
              <strong className="att-legend__value">{present}</strong>
              <span className="att-legend__pct">({pct(present)}%)</span>
            </li>
            <li className="att-legend__item">
              <span className="att-legend__dot att-legend__dot--absent" aria-hidden="true" />
              <span className="att-legend__label">Absent</span>
              <strong className="att-legend__value">{absent}</strong>
              <span className="att-legend__pct">({pct(absent)}%)</span>
            </li>
            <li className="att-legend__item">
              <span className="att-legend__dot att-legend__dot--unmarked" aria-hidden="true" />
              <span className="att-legend__label">Not Marked</span>
              <strong className="att-legend__value">{notMarked}</strong>
              <span className="att-legend__pct">({pct(notMarked)}%)</span>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

export default AttendanceChart;
