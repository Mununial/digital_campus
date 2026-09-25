import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NoticeCard from '../components/NoticeCard';
import NoticeComposerModal from '../components/NoticeComposerModal';
import NoticeDetailsModal from '../components/NoticeDetailsModal';
import Loading from '../components/Loading';
import './NoticesPage.css';

const NoticesPage = () => {
  const { user } = useAuth();
  const userRole = user?.role || 'STUDENT';
  const isStaff = userRole === 'SUPER_ADMIN' || userRole === 'SUPERINTENDENT';

  // State
  const [notices, setNotices] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 12,
    totalPages: 1,
    totalNotices: 0
  });

  const [filters, setFilters] = useState({
    search: '',
    priority: '',
    status: isStaff ? '' : 'PUBLISHED',
    hostelId: '',
    readState: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [composerOpen, setComposerOpen] = useState(false);
  const [noticeToEdit, setNoticeToEdit] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);

  // Fetch Hostels for Filter dropdown
  useEffect(() => {
    api.get('/hostels')
      .then(res => {
        const list = res.data || res.hostels || (Array.isArray(res) ? res : []);
        if (Array.isArray(list)) {
          setHostels(list);
        }
      })
      .catch(err => console.error('Failed to load hostels:', err));
  }, []);

  // Fetch Notices
  const fetchNotices = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
        search: filters.search || undefined,
        priority: filters.priority || undefined,
        status: isStaff ? (filters.status || undefined) : 'PUBLISHED',
        hostelId: filters.hostelId || undefined,
        readState: !isStaff ? (filters.readState || undefined) : undefined
      };

      const res = await api.getNotices(params);

      if (res.success) {
        setNotices(res.notices || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
      setError(err.message || 'Failed to load notices.');
    } finally {
      setLoading(false);
    }
  }, [filters, isStaff, pagination.limit]);

  useEffect(() => {
    fetchNotices(1);
  }, [fetchNotices]);

  // Handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchNotices(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchNotices(newPage);
    }
  };

  const handleOpenComposerForCreate = () => {
    setNoticeToEdit(null);
    setComposerOpen(true);
  };

  const handleOpenComposerForEdit = (notice) => {
    setNoticeToEdit(notice);
    setComposerOpen(true);
  };

  const handleStatusChange = async (noticeId, newStatus) => {
    try {
      await api.updateNoticeStatus(noticeId, newStatus);
      fetchNotices(pagination.currentPage);
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!window.confirm('Are you sure you want to permanently delete this notice?')) {
      return;
    }
    try {
      await api.deleteNotice(noticeId);
      fetchNotices(pagination.currentPage);
    } catch (err) {
      alert(err.message || 'Failed to delete notice.');
    }
  };

  const handleReadMarked = (noticeId) => {
    setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, is_read: true } : n));
  };

  return (
    <div className="notices-page">
      {/* Header */}
      <div className="notices-page-header">
        <div className="header-text">
          <h1 className="page-heading">Hostel Notice Board</h1>
          <p className="page-subheading">Official announcements, maintenance schedules, and urgent alerts</p>
        </div>

        {isStaff && (
          <button
            type="button"
            className="btn-create-notice"
            onClick={handleOpenComposerForCreate}
          >
            + Publish Notice
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="notices-filter-card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <span className="search-icon"></span>
            <input
              type="text"
              name="search"
              placeholder={isStaff ? "Search by title or description..." : "Search notices..."}
              value={filters.search}
              onChange={handleFilterChange}
            />
            {filters.search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              ></button>
            )}
          </div>
        </form>

        <div className="filters-group">
          {/* Priority Filter */}
          <div className="filter-item">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
            >
              <option value="">All Priorities</option>
              <option value="URGENT">URGENT</option>
              <option value="IMPORTANT">IMPORTANT</option>
              <option value="GENERAL">GENERAL</option>
            </select>
          </div>

          {/* Target Hostel Filter */}
          <div className="filter-item">
            <label htmlFor="hostelId">Target Scope</label>
            <select
              id="hostelId"
              name="hostelId"
              value={filters.hostelId}
              onChange={handleFilterChange}
            >
              <option value="">All Scopes</option>
              <option value="general">All Hostels Only</option>
              {hostels.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter (Staff only) */}
          {isStaff && (
            <div className="filter-item">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All Statuses</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          )}

          {/* Read/Unread Filter (Student only) */}
          {!isStaff && (
            <div className="filter-item">
              <label htmlFor="readState">Read Status</label>
              <select
                id="readState"
                name="readState"
                value={filters.readState}
                onChange={handleFilterChange}
              >
                <option value="">All Notices</option>
                <option value="unread">Unread Only</option>
                <option value="read">Read Only</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <Loading message="Loading notice board..." />
      ) : error ? (
        <div className="error-card">
          <p>{error}</p>
          <button onClick={() => fetchNotices(1)} className="btn-retry">Retry</button>
        </div>
      ) : notices.length === 0 ? (
        <div className="empty-state-card">
          <span className="empty-emoji"></span>
          <h2>No Notices Found</h2>
          <p>There are no notices matching your current search and filter criteria.</p>
        </div>
      ) : (
        <>
          <div className="notices-grid">
            {notices.map(notice => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                userRole={userRole}
                onView={(n) => setSelectedNotice(n)}
                onEdit={isStaff ? handleOpenComposerForEdit : null}
                onStatusChange={isStaff ? handleStatusChange : null}
                onDelete={userRole === 'SUPER_ADMIN' ? handleDeleteNotice : null}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                className="btn-page"
                disabled={pagination.currentPage <= 1}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
              >
                ← Previous
              </button>

              <span className="page-info">
                Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalNotices} notices)
              </span>

              <button
                className="btn-page"
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Composer Modal */}
      {composerOpen && (
        <NoticeComposerModal
          isOpen={composerOpen}
          onClose={() => setComposerOpen(false)}
          noticeToEdit={noticeToEdit}
          userRole={userRole}
          onSuccess={() => fetchNotices(pagination.currentPage)}
        />
      )}

      {/* Detail Modal */}
      {selectedNotice && (
        <NoticeDetailsModal
          notice={selectedNotice}
          userRole={userRole}
          onClose={() => setSelectedNotice(null)}
          onReadMarked={handleReadMarked}
        />
      )}
    </div>
  );
};

export default NoticesPage;
