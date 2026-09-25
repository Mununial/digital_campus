import React from 'react';
import './OccupancySummary.css';

/**
 * OccupancySummary — displays bed occupancy breakdown.
 * Never recalculates — uses values from backend directly.
 */
function OccupancySummary({ occupied = 0, available = 0, maintenance = 0, occupancyPercentage }) {
  const usable = occupied + available;
  const isEmpty = usable === 0 && maintenance === 0;

  return (
    <section className="occupancy-summary" aria-labelledby="occ-title">
      <h3 id="occ-title">Bed Occupancy</h3>

      {isEmpty ? (
        <p className="occ-empty">No beds configured.</p>
      ) : (
        <>
          <div className="occ-grid">
            <div className="occ-item occ-item--occupied">
              <span className="occ-dot" aria-hidden="true" />
              <span className="occ-label">Occupied</span>
              <strong className="occ-value">{occupied}</strong>
            </div>
            <div className="occ-item occ-item--available">
              <span className="occ-dot" aria-hidden="true" />
              <span className="occ-label">Available</span>
              <strong className="occ-value">{available}</strong>
            </div>
            <div className="occ-item occ-item--maintenance">
              <span className="occ-dot" aria-hidden="true" />
              <span className="occ-label">Maintenance</span>
              <strong className="occ-value">{maintenance}</strong>
            </div>
            {occupancyPercentage !== undefined && (
              <div className="occ-item occ-item--pct">
                <span className="occ-dot" aria-hidden="true" />
                <span className="occ-label">Occupancy</span>
                <strong className="occ-value">{occupancyPercentage}%</strong>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default OccupancySummary;
