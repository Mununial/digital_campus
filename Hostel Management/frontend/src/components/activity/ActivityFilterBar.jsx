import React from 'react';
import './ActivityTimeline.css';

const MODULES = [
  { label: 'All Modules', value: '' },
  { label: 'Authentication', value: 'AUTHENTICATION' },
  { label: 'Users', value: 'USERS' },
  { label: 'Students', value: 'STUDENTS' },
  { label: 'Hostels & Rooms', value: 'HOSTELS' },
  { label: 'Attendance', value: 'ATTENDANCE' },
  { label: 'Notices', value: 'NOTICES' },
  { label: 'Complaints', value: 'COMPLAINTS' },
  { label: 'Visitors', value: 'VISITORS' },
  { label: 'Mess & Food', value: 'MESS' },
  { label: 'Fees & Payments', value: 'FEES' },
  { label: 'Room Allocation', value: 'ALLOCATION' }
];

export const ActivityFilterBar = ({ filters, onFilterChange, onReset, hostels = [] }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value, page: 1 });
  };

  return (
    <div className="activity-filter-bar">
      <div className="filter-grid">
        {/* Search */}
        <div className="filter-field">
          <label className="filter-label">Search Description</label>
          <input
            type="text"
            name="search"
            value={filters.search || ''}
            onChange={handleChange}
            placeholder="Search activities..."
            className="filter-input"
          />
        </div>

        {/* Module Filter */}
        <div className="filter-field">
          <label className="filter-label">Module</label>
          <select
            name="module"
            value={filters.module || ''}
            onChange={handleChange}
            className="filter-select"
          >
            {MODULES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hostel Filter */}
        <div className="filter-field">
          <label className="filter-label">Hostel</label>
          <select
            name="hostelId"
            value={filters.hostelId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">All Hostels</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="filter-field">
          <label className="filter-label">From Date</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate || ''}
            onChange={handleChange}
            className="filter-input"
          />
        </div>

        {/* End Date */}
        <div className="filter-field">
          <label className="filter-label">To Date</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate || ''}
            onChange={handleChange}
            className="filter-input"
          />
        </div>
      </div>

      <div className="filter-actions">
        <button
          onClick={onReset}
          className="btn-reset-filters"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
