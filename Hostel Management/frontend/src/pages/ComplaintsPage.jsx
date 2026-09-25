import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ComplaintCard from '../components/complaints/ComplaintCard';
import ComplaintFormModal from '../components/complaints/ComplaintFormModal';
import ComplaintDetailsModal from '../components/complaints/ComplaintDetailsModal';
import './ComplaintsPage.css';

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'ROOM', label: 'Room Maintenance' },
  { value: 'ELECTRICITY', label: 'Electricity / Electrical' },
  { value: 'WATER', label: 'Water Supply' },
  { value: 'PLUMBING', label: 'Plumbing & Drainage' },
  { value: 'CLEANLINESS', label: 'Cleanliness & Hygiene' },
  { value: 'FAN_AC', label: 'Fan / AC / Cooling' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'FOOD_MESS', label: 'Mess & Food' },
  { value: 'INTERNET', label: 'WiFi / Internet' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'MAINTENANCE', label: 'General Maintenance' },
  { value: 'OTHER', label: 'Other' }
];

const STATUS_TABS = [
  { id: 'ALL', label: 'All Complaints', icon: 'fa-list' },
  { id: 'OPEN', label: 'Open', icon: 'fa-envelope-open' },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: 'fa-spinner' },
  { id: 'RESOLVED', label: 'Resolved', icon: 'fa-circle-check' },
  { id: 'CLOSED', label: 'Closed', icon: 'fa-lock' }
];

const ComplaintsPage = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  const isStudent = user?.role === 'STUDENT';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {};
      if (activeTab !== 'ALL') params.status = activeTab;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [listRes, summaryRes] = await Promise.all([
        api.getComplaints(params),
        api.getComplaintSummary()
      ]);

      if (listRes.success) setComplaints(listRes.data || []);
      if (summaryRes.success) setSummary(summaryRes.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch complaints');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, categoryFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="page-container complaints-page">
      {/* Top Banner */}
      <div className="page-header flex-between align-center mb-4">
        <div>
          <div className="page-intro-badge">
            <i className="fa-solid fa-headset"></i> Support & Maintenance
          </div>
          <h1 className="page-title">Hostel Complaint & Grievance Portal</h1>
          <p className="page-sub">
            {isStudent 
              ? 'Submit and track maintenance complaints for your hostel room' 
              : 'Monitor, assign, and resolve student maintenance complaints'}
          </p>
        </div>

        {isStudent && (
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setIsSubmitModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fa-solid fa-plus"></i> Submit New Complaint
          </button>
        )}
      </div>

      {/* KPI Cards Banner */}
      {summary && (
        <div className="summary-cards-grid mb-4">
          <div className="summary-kpi-card kpi-open" onClick={() => setActiveTab('OPEN')} role="button" tabIndex={0}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="kpi-count">{summary.open}</span>
              <i className="fa-solid fa-envelope-open" style={{ fontSize: '1.4rem', opacity: 0.7 }}></i>
            </div>
            <span className="kpi-label">Open Complaints</span>
          </div>
          <div className="summary-kpi-card kpi-progress" onClick={() => setActiveTab('IN_PROGRESS')} role="button" tabIndex={0}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="kpi-count">{summary.inProgress}</span>
              <i className="fa-solid fa-spinner" style={{ fontSize: '1.4rem', opacity: 0.7 }}></i>
            </div>
            <span className="kpi-label">In Progress</span>
          </div>
          <div className="summary-kpi-card kpi-resolved" onClick={() => setActiveTab('RESOLVED')} role="button" tabIndex={0}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="kpi-count">{summary.resolved}</span>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '1.4rem', opacity: 0.7 }}></i>
            </div>
            <span className="kpi-label">Resolved</span>
          </div>
          <div className="summary-kpi-card kpi-urgent" onClick={() => setActiveTab('ALL')} role="button" tabIndex={0}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="kpi-count">{summary.urgent}</span>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.4rem', opacity: 0.7 }}></i>
            </div>
            <span className="kpi-label">Urgent Issues</span>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="tabs-container mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-bar mb-4">
        <form onSubmit={handleSearchSubmit} className="search-form flex-grow" style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
            <input
              type="text"
              className="form-control search-input"
              style={{ paddingLeft: '36px' }}
              placeholder={isStudent ? "Search by complaint title..." : "Search by title, student name, ID, room..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-filter"></i> Search
          </button>
        </form>

        <div className="filter-dropdowns">
          <select
            className="form-select filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            className="form-select filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="loading-state py-5 text-center">
          <div className="spinner mb-3"></div>
          <p className="text-muted">Loading complaints...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger my-4">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          {error}
        </div>
      ) : complaints.length === 0 ? (
        <div className="empty-state-card py-5 text-center">
          <div className="empty-state-icon" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }}>
            <i className="fa-solid fa-folder-open"></i>
          </div>
          <h3>No complaints found</h3>
          <p className="text-muted">
            {activeTab !== 'ALL' || categoryFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'Try resetting your filter parameters.'
              : 'There are no registered complaints matching this view.'}
          </p>
        </div>
      ) : (
        <div className="complaints-grid">
          {complaints.map((comp) => (
            <ComplaintCard
              key={comp.id}
              complaint={comp}
              onClick={(c) => setSelectedComplaintId(c.id)}
              userRole={user?.role}
            />
          ))}
        </div>
      )}

      {/* Submit Modal */}
      {isSubmitModalOpen && (
        <ComplaintFormModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSuccess={() => fetchData()}
        />
      )}

      {/* Details Modal */}
      {selectedComplaintId && (
        <ComplaintDetailsModal
          complaintId={selectedComplaintId}
          isOpen={Boolean(selectedComplaintId)}
          onClose={() => setSelectedComplaintId(null)}
          user={user}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default ComplaintsPage;
