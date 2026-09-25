import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import VisitorCard from '../components/visitors/VisitorCard';
import VisitorFormModal from '../components/visitors/VisitorFormModal';
import VisitorDetailsModal from '../components/visitors/VisitorDetailsModal';
import './VisitorsPage.css';

export default function VisitorsPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'STUDENT';

  const [visits, setVisits] = useState([]);
  const [summary, setSummary] = useState({ current: 0, overdue: 0, todayVisits: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination State
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, REQUESTED, APPROVED, CHECKED_IN, CHECKED_OUT, OVERDUE
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchVisitsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 12,
        search: searchQuery
      };

      if (activeTab === 'OVERDUE') {
        params.is_overdue = true;
      } else if (activeTab !== 'ALL') {
        params.status = activeTab;
      }

      const [visitsRes, summaryRes] = await Promise.all([
        api.getVisits(params),
        api.getVisitorSummary()
      ]);

      setVisits(visitsRes.data || []);
      if (visitsRes.pagination) {
        setTotalPages(visitsRes.pagination.totalPages || 1);
      }
      setSummary(summaryRes.data || {});
    } catch (err) {
      console.error('Error fetching visitors:', err);
      setError(err.message || 'Failed to fetch visitor records.');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, searchQuery]);

  useEffect(() => {
    fetchVisitsData();
  }, [fetchVisitsData]);

  // Action Handlers
  const handleApprove = async (id) => {
    try {
      await api.approveVisit(id, 'Approved from Visitors page');
      fetchVisitsData();
    } catch (err) {
      alert(err.message || 'Failed to approve visit.');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.rejectVisit(id, 'Rejected from Visitors page');
      fetchVisitsData();
    } catch (err) {
      alert(err.message || 'Failed to reject visit.');
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.cancelVisit(id, 'Cancelled from Visitors page');
      fetchVisitsData();
    } catch (err) {
      alert(err.message || 'Failed to cancel visit.');
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await api.checkInVisit(id, 'Checked in at gate');
      fetchVisitsData();
    } catch (err) {
      alert(err.message || 'Failed to check in visitor.');
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await api.checkOutVisit(id, 'Checked out at gate');
      fetchVisitsData();
    } catch (err) {
      alert(err.message || 'Failed to check out visitor.');
    }
  };

  const handleViewDetails = (id) => {
    setSelectedVisitId(id);
    setIsDetailsOpen(true);
  };

  return (
    <div className="visitors-page-container">
      {/* Page Header */}
      <div className="page-header-flex">
        <div>
          <h1 className="page-title">Hostel Visitor Management</h1>
          <p className="page-subtitle">Track, register, and monitor visitor entry/exit records in real time</p>
        </div>
        <button
          type="button"
          className="btn-primary btn-lg"
          onClick={() => setIsFormOpen(true)}
        >
          {userRole === 'STUDENT' ? '+ Request Visitor Entry' : '+ Register Visitor'}
        </button>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="visitor-summary-cards">
        <div className="summary-card card-current">
          <div className="summary-icon"></div>
          <div className="summary-details">
            <span className="summary-value">{summary.current}</span>
            <span className="summary-label">Currently Inside</span>
          </div>
        </div>

        <div className={`summary-card card-overdue ${summary.overdue > 0 ? 'pulse-overdue' : ''}`}>
          <div className="summary-icon">️</div>
          <div className="summary-details">
            <span className="summary-value">{summary.overdue}</span>
            <span className="summary-label">Overdue Visitors</span>
          </div>
        </div>

        <div className="summary-card card-today">
          <div className="summary-icon"></div>
          <div className="summary-details">
            <span className="summary-value">{summary.todayVisits}</span>
            <span className="summary-label">Visits Today</span>
          </div>
        </div>

        <div className="summary-card card-pending">
          <div className="summary-icon"></div>
          <div className="summary-details">
            <span className="summary-value">{summary.pending}</span>
            <span className="summary-label">Pending Approval</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Status Filter Tabs */}
      <div className="visitors-controls-bar">
        <div className="search-box-wrapper">
          <span className="search-icon"></span>
          <input
            type="text"
            placeholder="Search visitor name, phone, student, room..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          {searchQuery && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}></button>
          )}
        </div>

        <div className="status-tabs-wrapper">
          {[
            { id: 'ALL', label: 'All Visits' },
            { id: 'REQUESTED', label: 'Requested' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'CHECKED_IN', label: 'Checked In' },
            { id: 'CHECKED_OUT', label: 'Checked Out' },
            { id: 'OVERDUE', label: 'Overdue' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visitor Cards Grid */}
      {loading ? (
        <div className="loading-state-card">
          <div className="spinner"></div>
          <p>Loading visitor records...</p>
        </div>
      ) : error ? (
        <div className="error-state-card">
          <span className="error-icon">️</span>
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={fetchVisitsData}>Retry</button>
        </div>
      ) : visits.length === 0 ? (
        <div className="empty-state-card">
          <span className="empty-icon"></span>
          <h3>No Visitor Records Found</h3>
          <p>No visitor logs match your search or selected filter tab.</p>
          <button type="button" className="btn-primary" onClick={() => setIsFormOpen(true)}>
            {userRole === 'STUDENT' ? 'Submit First Visitor Request' : 'Register New Visitor'}
          </button>
        </div>
      ) : (
        <>
          <div className="visitors-grid">
            {visits.map(visit => (
              <VisitorCard
                key={visit.id}
                visit={visit}
                userRole={userRole}
                onViewDetails={handleViewDetails}
                onApprove={handleApprove}
                onReject={handleReject}
                onCancel={handleCancel}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <button
                type="button"
                className="btn-pagination"
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-pagination"
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      <VisitorFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmitSuccess={() => {
          setIsFormOpen(false);
          fetchVisitsData();
        }}
        userRole={userRole}
      />

      {/* Details Modal */}
      {selectedVisitId && (
        <VisitorDetailsModal
          visitId={selectedVisitId}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedVisitId(null);
          }}
          userRole={userRole}
          onStatusChanged={fetchVisitsData}
        />
      )}
    </div>
  );
}
