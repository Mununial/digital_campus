import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import './MasterData.css';

const MasterHostelsPage = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'BOYS',
    capacity: 100,
    address: '',
    status: 'ACTIVE'
  });
  const [modalError, setModalError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHostels();
  }, [page, searchTerm]);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getHostels({ search: searchTerm, page, limit: 10 });
      if (res.success) {
        setHostels(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError(res.message || 'Failed to fetch hostels.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching hostels.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingHostel(null);
    setFormData({
      name: '',
      code: '',
      type: 'BOYS',
      capacity: 100,
      address: '',
      status: 'ACTIVE'
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (hostel) => {
    setEditingHostel(hostel);
    setFormData({
      name: hostel.name || '',
      code: hostel.code || '',
      type: hostel.gender === 'FEMALE' ? 'GIRLS' : (hostel.gender === 'COED' ? 'COED' : 'BOYS'),
      capacity: hostel.capacity || 100,
      address: hostel.address || '',
      status: hostel.status || 'ACTIVE'
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      if (editingHostel) {
        const res = await api.updateHostel(editingHostel.id, formData);
        if (res.success) {
          setShowModal(false);
          fetchHostels();
        } else {
          setModalError(res.message || 'Failed to update hostel.');
        }
      } else {
        const res = await api.createHostel(formData);
        if (res.success) {
          setShowModal(false);
          fetchHostels();
        } else {
          setModalError(res.message || 'Failed to create hostel.');
        }
      }
    } catch (err) {
      setModalError(err.message || 'An error occurred while saving hostel.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHostel = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete hostel "${name}"?`)) return;

    try {
      const res = await api.deleteHostel(id);
      if (res.success) {
        fetchHostels();
      } else {
        alert(res.message || 'Failed to delete hostel.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting hostel.');
    }
  };

  return (
    <div className="master-page-container">
      {/* Page Header */}
      <div className="master-header">
        <div className="master-header-left">
          <div className="master-breadcrumbs">
            <Link to="/admin/master">Master Data</Link>
            <span className="master-breadcrumbs-separator">/</span>
            <span>Hostels</span>
          </div>
          <h1 className="master-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-building text-indigo-600"></i>
            <span>Hostels Administration</span>
          </h1>
          <p className="master-subtitle">Manage core hostel entities, codes, types, and capacity limits.</p>
        </div>
        <button onClick={handleOpenCreateModal} className="master-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-plus"></i> Add New Hostel
        </button>
      </div>

      {/* Search Bar */}
      <div className="master-filter-card">
        <div className="master-filter-group">
          <div className="master-search-box" style={{ maxWidth: '400px', minWidth: '280px', position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
            <input
              type="text"
              className="master-search-input"
              placeholder="Search hostel name or code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
        <div className="master-count-badge">
          Total Hostels: <strong>{pagination.total || hostels.length}</strong>
        </div>
      </div>

      {error && (
        <div className="master-alert-error">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Hostels Table / Cards */}
      {loading ? (
        <Loading message="Loading hostels list..." />
      ) : hostels.length === 0 ? (
        <div className="master-empty-state">
          <i className="fa-solid fa-building-circle-xmark text-slate-300" style={{ fontSize: '3rem', marginBottom: '12px' }}></i>
          <h3 className="master-empty-title">No Hostels Found</h3>
          <p className="master-empty-desc">Try adjusting your search filter or add a new hostel.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="master-table-card">
            <table className="master-table">
              <thead>
                <tr>
                  <th>Hostel Name</th>
                  <th>Code</th>
                  <th>Gender / Type</th>
                  <th>Capacity Stats</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hostels.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <div className="master-cell-room">
                        <span className="master-room-icon" style={{ background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fa-solid fa-building"></i>
                        </span>
                        <span>{h.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-status badge-available">{h.code}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '500', color: '#475569' }}>
                        {h.gender || h.type || 'BOYS'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#334155' }}><strong>{h.total_floors ?? 0}</strong> floors • <strong>{h.total_rooms ?? 0}</strong> rooms • <strong>{h.total_beds ?? 0}</strong> beds
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${h.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        <span className="badge-status-dot" />
                        {h.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div className="master-actions-group">
                        <button
                          onClick={() => handleOpenEditModal(h)}
                          className="master-action-btn btn-action-edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteHostel(h.id, h.name)}
                          className="master-action-btn btn-action-delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="master-mobile-cards">
            {hostels.map((h) => (
              <div key={h.id} className="master-mobile-card">
                <div className="master-mobile-card-header">
                  <div>
                    <div className="master-mobile-card-title">{h.name}</div>
                    <div className="master-mobile-card-subtitle">{h.code} • {h.gender || h.type || 'BOYS'}</div>
                  </div>
                  <span className={`badge-status ${h.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                    <span className="badge-status-dot" />
                    {h.status || 'ACTIVE'}
                  </span>
                </div>
                <div className="master-mobile-card-details">
                  <span>Floors: <strong>{h.total_floors ?? 0}</strong></span>
                  <span>Rooms: <strong>{h.total_rooms ?? 0}</strong></span>
                  <span>Beds: <strong>{h.total_beds ?? 0}</strong></span>
                </div>
                <div className="master-mobile-card-actions">
                  <button onClick={() => handleOpenEditModal(h)} className="master-action-btn btn-action-edit">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteHostel(h.id, h.name)} className="master-action-btn btn-action-delete">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="master-pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="master-page-btn"
              >
                ← Previous
              </button>
              <span className="master-page-info">
                Page <strong>{page}</strong> of <strong>{pagination.totalPages}</strong>
              </span>
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="master-page-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="master-modal-overlay">
          <div className="master-modal-content">
            <div className="master-modal-header">
              <h2 className="master-modal-title">
                {editingHostel ? 'Edit Hostel' : '+ Create New Hostel'}
              </h2>
              <button className="master-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            {modalError && (
              <div className="master-alert-error">
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="master-form-group">
                <label className="master-form-label">Hostel Name *</label>
                <input
                  type="text"
                  className="master-form-input"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. BEC Boys Hostel 1"
                />
              </div>

              <div className="master-form-row">
                <div className="master-form-group">
                  <label className="master-form-label">Hostel Code *</label>
                  <input
                    type="text"
                    className="master-form-input"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. BH-01"
                  />
                </div>

                <div className="master-form-group">
                  <label className="master-form-label">Hostel Type *</label>
                  <select
                    className="master-form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="BOYS">BOYS</option>
                    <option value="GIRLS">GIRLS</option>
                    <option value="COED">COED</option>
                  </select>
                </div>
              </div>

              <div className="master-form-row">
                <div className="master-form-group">
                  <label className="master-form-label">Default Capacity</label>
                  <input
                    type="number"
                    min="1"
                    className="master-form-input"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) })}
                  />
                </div>

                <div className="master-form-group">
                  <label className="master-form-label">Status *</label>
                  <select
                    className="master-form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="master-form-group">
                <label className="master-form-label">Location / Address</label>
                <input
                  type="text"
                  className="master-form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. North Campus, Block B"
                />
              </div>

              <div className="master-modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="master-btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="master-btn-primary">
                  {submitting ? 'Saving...' : (editingHostel ? 'Save Changes' : 'Create Hostel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterHostelsPage;
