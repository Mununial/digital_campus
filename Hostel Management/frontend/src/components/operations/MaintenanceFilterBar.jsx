import React from 'react';
import '../../pages/MaintenancePage.css';

const CATEGORIES = [
  'ELECTRICAL', 'PLUMBING', 'FURNITURE', 'BED', 'ROOM',
  'BATHROOM', 'CLEANING', 'INTERNET', 'SAFETY', 'OTHER'
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'];

export default function MaintenanceFilterBar({
  filters,
  onFilterChange,
  hostels = [],
  isStaff = false
}) {
  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value, page: 1 });
  };

  const handleReset = () => {
    onFilterChange({
      search: '',
      hostel_id: '',
      category: '',
      status: '',
      priority: '',
      date_from: '',
      date_to: '',
      page: 1
    });
  };

  return (
    <div className="maintenance-filter-card">
      <div className="filter-grid">
        {/* Search */}
        <div className="filter-search-wrapper">
          <span className="filter-search-icon"></span>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search by title, student, room..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>

        {/* Hostel Filter (Staff only) */}
        {isStaff && (
          <div>
            <select
              className="filter-select"
              value={filters.hostel_id || ''}
              onChange={(e) => handleChange('hostel_id', e.target.value)}
            >
              <option value="">All Hostels</option>
              {hostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Category */}
        <div>
          <select
            className="filter-select"
            value={filters.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <select
            className="filter-select"
            value={filters.priority || ''}
            onChange={(e) => handleChange('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <select
            className="filter-select"
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        <div>
          <button
            type="button"
            className="filter-reset-btn"
            onClick={handleReset}
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}
