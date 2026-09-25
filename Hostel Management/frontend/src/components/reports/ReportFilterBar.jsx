import React from 'react';

const ReportFilterBar = ({
  filters,
  onFilterChange,
  hostels = [],
  isSuperAdmin = false,
  onRefresh,
  loading = false
}) => {
  const handleQuickRange = (days) => {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - days);

    const formatDate = (d) => d.toISOString().split('T')[0];

    onFilterChange({
      ...filters,
      date_from: formatDate(pastDate),
      date_to: formatDate(today)
    });
  };

  return (
    <div className="report-filter-bar card">
      <div className="report-filter-grid">
        {/* Hostel Selector */}
        <div className="filter-group">
          <label htmlFor="hostel_select" className="filter-label">Hostel Scope</label>
          <select
            id="hostel_select"
            className="filter-select"
            value={filters.hostel_id || 'all'}
            onChange={(e) => onFilterChange({ ...filters, hostel_id: e.target.value })}
          >
            {isSuperAdmin && <option value="all"> All Hostels</option>}
            {hostels.map(h => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="filter-group">
          <label htmlFor="date_from" className="filter-label">Date From</label>
          <input
            type="date"
            id="date_from"
            className="filter-input"
            value={filters.date_from || ''}
            onChange={(e) => onFilterChange({ ...filters, date_from: e.target.value })}
          />
        </div>

        {/* Date To */}
        <div className="filter-group">
          <label htmlFor="date_to" className="filter-label">Date To</label>
          <input
            type="date"
            id="date_to"
            className="filter-input"
            value={filters.date_to || ''}
            onChange={(e) => onFilterChange({ ...filters, date_to: e.target.value })}
          />
        </div>

        {/* Action & Quick Range Controls */}
        <div className="filter-group filter-actions">
          <label className="filter-label">&nbsp;</label>
          <div className="filter-btn-group">
            <button
              type="button"
              className="quick-range-btn"
              onClick={() => handleQuickRange(7)}
              title="Last 7 Days"
            >
              7d
            </button>
            <button
              type="button"
              className="quick-range-btn"
              onClick={() => handleQuickRange(30)}
              title="Last 30 Days"
            >
              30d
            </button>
            <button
              type="button"
              className="quick-range-btn"
              onClick={() => handleQuickRange(90)}
              title="Last 90 Days"
            >
              90d
            </button>

            <button
              type="button"
              className="btn btn-primary refresh-report-btn"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? '...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportFilterBar;
