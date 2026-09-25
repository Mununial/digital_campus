import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import './MasterData.css';

const MasterFloorsPage = () => {
  const [floors, setFloors] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingFloor, setEditingFloor] = useState(null);
  const [formData, setFormData] = useState({
    hostel_id: '',
    floor_name: '',
    floor_number: 1,
    status: 'ACTIVE'
  });
  const [modalError, setModalError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadHostels();
  }, []);

  useEffect(() => {
    fetchFloors();
  }, [page, selectedHostelId, searchTerm]);

  const loadHostels = async () => {
    try {
      const res = await api.getHostels({ limit: 100 });
      if (res.success) {
        setHostels(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load hostels list:', err);
    }
  };

  const fetchFloors = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 10, search: searchTerm };
      if (selectedHostelId) params.hostel_id = selectedHostelId;

      const res = await api.getFloors(params);
      if (res.success) {
        setFloors(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError(res.message || 'Failed to fetch floors.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching floors.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingFloor(null);
    setFormData({
      hostel_id: selectedHostelId || (hostels[0]?.id || ''),
      floor_name: '',
      floor_number: 1,
      status: 'ACTIVE'
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (floor) => {
    setEditingFloor(floor);
    setFormData({
      hostel_id: floor.hostel_id || '',
      floor_name: floor.floor_name || '',
      floor_number: floor.floor_number ?? 1,
      status: floor.status || 'ACTIVE'
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      if (editingFloor) {
        const res = await api.updateFloor(editingFloor.id, formData);
        if (res.success) {
          setShowModal(false);
          fetchFloors();
        } else {
          setModalError(res.message || 'Failed to update floor.');
        }
      } else {
        const res = await api.createFloor(formData);
        if (res.success) {
          setShowModal(false);
          fetchFloors();
        } else {
          setModalError(res.message || 'Failed to create floor.');
        }
      }
    } catch (err) {
      setModalError(err.message || 'An error occurred while saving floor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFloor = async (id, floorName) => {
    if (!window.confirm(`Are you sure you want to delete "${floorName}"?`)) return;

    try {
      const res = await api.deleteFloor(id);
      if (res.success) {
        fetchFloors();
      } else {
        alert(res.message || 'Failed to delete floor.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting floor.');
    }
  };

  const handleGenerateDefaultFloors = async () => {
    if (!selectedHostelId) {
      alert('Please select a specific hostel from the filter dropdown first.');
      return;
    }

    if (!window.confirm('Auto-generate Ground Floor to 10th Floor for the selected hostel?')) return;

    try {
      const defaultFloors = [
        { name: 'Ground Floor', number: 0 },
        { name: '1st Floor', number: 1 },
        { name: '2nd Floor', number: 2 },
        { name: '3rd Floor', number: 3 },
        { name: '4th Floor', number: 4 },
        { name: '5th Floor', number: 5 },
        { name: '6th Floor', number: 6 },
        { name: '7th Floor', number: 7 },
        { name: '8th Floor', number: 8 },
        { name: '9th Floor', number: 9 },
        { name: '10th Floor', number: 10 }
      ];

      for (const floor of defaultFloors) {
        await api.createFloor({
          hostel_id: selectedHostelId,
          floor_name: floor.name,
          floor_number: floor.number,
          status: 'ACTIVE'
        });
      }
      fetchFloors();
    } catch (err) {
      console.error('Error auto-generating floors:', err);
      fetchFloors();
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
            <span>Floors</span>
          </div>
          <h1 className="master-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-layer-group text-indigo-600"></i>
            <span>Floor Management</span>
          </h1>
          <p className="master-subtitle">Manage hostel floor levels, floor numbers, and floor names.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleGenerateDefaultFloors} className="master-action-btn btn-action-edit" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-wand-magic-sparkles"></i> Generate Ground to 10th
          </button>
          <button onClick={handleOpenCreateModal} className="master-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-plus"></i> Add New Floor
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="master-filter-card">
        <div className="master-filter-group">
          {/* Hostel Filter Dropdown */}
          <select
            className="master-select"
            value={selectedHostelId}
            onChange={(e) => {
              setSelectedHostelId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Hostels</option>
            {hostels.map(h => (
              <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="master-search-box" style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
            <input
              type="text"
              className="master-search-input"
              placeholder="Search floor name..."
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
          Total Floors: <strong>{pagination.total || floors.length}</strong>
        </div>
      </div>

      {error && (
        <div className="master-alert-error">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Floors Table / Cards */}
      {loading ? (
        <Loading message="Loading floors list..." />
      ) : floors.length === 0 ? (
        <div className="master-empty-state">
          <i className="fa-solid fa-layer-group text-slate-300" style={{ fontSize: '3rem', marginBottom: '12px' }}></i>
          <h3 className="master-empty-title">No Floors Found</h3>
          <p className="master-empty-desc">Select another hostel filter or generate default floors.</p>
          <button
            onClick={handleGenerateDefaultFloors}
            className="master-btn-primary"
            style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i> Generate Ground to 10th Floor
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="master-table-card">
            <table className="master-table">
              <thead>
                <tr>
                  <th>Floor Name</th>
                  <th>Floor Level</th>
                  <th>Hostel</th>
                  <th>Rooms & Beds</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {floors.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div className="master-cell-room">
                        <span className="master-room-icon" style={{ background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fa-solid fa-layer-group"></i>
                        </span>
                        <span>{f.floor_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-status badge-available">
                        Level {f.floor_number}
                      </span>
                    </td>
                    <td>{f.hostel_name || 'Hostel'}</td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#475569' }}><strong>{f.total_rooms ?? 0}</strong> rooms • <strong>{f.total_beds ?? 0}</strong> beds
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${f.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        <span className="badge-status-dot" />
                        {f.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div className="master-actions-group">
                        <button
                          onClick={() => handleOpenEditModal(f)}
                          className="master-action-btn btn-action-edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFloor(f.id, f.floor_name)}
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
            {floors.map((f) => (
              <div key={f.id} className="master-mobile-card">
                <div className="master-mobile-card-header">
                  <div>
                    <div className="master-mobile-card-title">{f.floor_name}</div>
                    <div className="master-mobile-card-subtitle">{f.hostel_name} • Level {f.floor_number}</div>
                  </div>
                  <span className={`badge-status ${f.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                    <span className="badge-status-dot" />
                    {f.status || 'ACTIVE'}
                  </span>
                </div>
                <div className="master-mobile-card-details">
                  <span>Rooms: <strong>{f.total_rooms ?? 0}</strong></span>
                  <span>Beds: <strong>{f.total_beds ?? 0}</strong></span>
                </div>
                <div className="master-mobile-card-actions">
                  <button onClick={() => handleOpenEditModal(f)} className="master-action-btn btn-action-edit">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteFloor(f.id, f.floor_name)} className="master-action-btn btn-action-delete">
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
                {editingFloor ? 'Edit Floor' : '+ Create New Floor'}
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
                <label className="master-form-label">Select Hostel *</label>
                <select
                  className="master-form-select"
                  required
                  value={formData.hostel_id}
                  onChange={(e) => setFormData({ ...formData, hostel_id: e.target.value })}
                >
                  <option value="">-- Choose Hostel --</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                  ))}
                </select>
              </div>

              <div className="master-form-group">
                <label className="master-form-label">Floor Name *</label>
                <input
                  type="text"
                  className="master-form-input"
                  required
                  value={formData.floor_name}
                  onChange={(e) => setFormData({ ...formData, floor_name: e.target.value })}
                  placeholder="e.g. Ground Floor / 1st Floor / 2nd Floor"
                />
              </div>

              <div className="master-form-row">
                <div className="master-form-group">
                  <label className="master-form-label">Floor Level Number *</label>
                  <input
                    type="number"
                    className="master-form-input"
                    required
                    value={formData.floor_number}
                    onChange={(e) => setFormData({ ...formData, floor_number: parseInt(e.target.value, 10) })}
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

              <div className="master-modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="master-btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="master-btn-primary">
                  {submitting ? 'Saving...' : (editingFloor ? 'Save Changes' : 'Create Floor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterFloorsPage;
