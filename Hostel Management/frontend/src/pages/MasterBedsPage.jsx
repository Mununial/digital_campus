import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import './MasterData.css';

const MasterBedsPage = () => {
  const [beds, setBeds] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  // Filter States
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBed, setEditingBed] = useState(null);
  const [modalFloors, setModalFloors] = useState([]);
  const [modalRooms, setModalRooms] = useState([]);
  const [formData, setFormData] = useState({
    hostel_id: '',
    floor_id: '',
    room_id: '',
    bed_number: '',
    status: 'AVAILABLE'
  });
  const [modalError, setModalError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadHostels();
  }, []);

  useEffect(() => {
    if (selectedHostelId) {
      loadFloorsForFilter(selectedHostelId);
    } else {
      setFloors([]);
      setSelectedFloorId('');
      setRooms([]);
      setSelectedRoomId('');
    }
  }, [selectedHostelId]);

  useEffect(() => {
    if (selectedFloorId) {
      loadRoomsForFilter(selectedFloorId);
    } else {
      setRooms([]);
      setSelectedRoomId('');
    }
  }, [selectedFloorId]);

  useEffect(() => {
    fetchBeds();
  }, [page, selectedHostelId, selectedFloorId, selectedRoomId, searchTerm]);

  const loadHostels = async () => {
    try {
      const res = await api.getHostels({ limit: 100 });
      if (res.success) setHostels(res.data || []);
    } catch (err) {
      console.error('Failed to load hostels:', err);
    }
  };

  const loadFloorsForFilter = async (hostelId) => {
    try {
      const res = await api.getFloors({ hostel_id: hostelId, limit: 100 });
      if (res.success) setFloors(res.data || []);
    } catch (err) {
      console.error('Failed to load floors:', err);
    }
  };

  const loadRoomsForFilter = async (floorId) => {
    try {
      const res = await api.getRooms({ floor_id: floorId, limit: 100 });
      if (res.success) setRooms(res.data || []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const loadFloorsForModal = async (hostelId) => {
    try {
      const res = await api.getFloors({ hostel_id: hostelId, limit: 100 });
      if (res.success) setModalFloors(res.data || []);
    } catch (err) {
      console.error('Failed to load modal floors:', err);
    }
  };

  const loadRoomsForModal = async (floorId) => {
    try {
      const res = await api.getRooms({ floor_id: floorId, limit: 100 });
      if (res.success) setModalRooms(res.data || []);
    } catch (err) {
      console.error('Failed to load modal rooms:', err);
    }
  };

  const fetchBeds = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 10, search: searchTerm };
      if (selectedRoomId) params.room_id = selectedRoomId;
      else if (selectedFloorId) params.floor_id = selectedFloorId;
      else if (selectedHostelId) params.hostel_id = selectedHostelId;

      const res = await api.getBeds(params);
      if (res.success) {
        setBeds(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError(res.message || 'Failed to fetch beds.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching beds.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingBed(null);
    const initialHostelId = selectedHostelId || (hostels[0]?.id || '');
    setFormData({
      hostel_id: initialHostelId,
      floor_id: selectedFloorId || '',
      room_id: selectedRoomId || '',
      bed_number: '',
      status: 'AVAILABLE'
    });
    if (initialHostelId) loadFloorsForModal(initialHostelId);
    if (selectedFloorId) loadRoomsForModal(selectedFloorId);
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (bed) => {
    setEditingBed(bed);
    setFormData({
      hostel_id: bed.hostel_id || '',
      floor_id: bed.floor_id || '',
      room_id: bed.room_id || '',
      bed_number: bed.bed_number || '',
      status: bed.status || 'AVAILABLE'
    });
    if (bed.hostel_id) loadFloorsForModal(bed.hostel_id);
    if (bed.floor_id) loadRoomsForModal(bed.floor_id);
    setModalError(null);
    setShowModal(true);
  };

  const handleModalHostelChange = (hostelId) => {
    setFormData({ ...formData, hostel_id: hostelId, floor_id: '', room_id: '' });
    if (hostelId) {
      loadFloorsForModal(hostelId);
    } else {
      setModalFloors([]);
      setModalRooms([]);
    }
  };

  const handleModalFloorChange = (floorId) => {
    setFormData({ ...formData, floor_id: floorId, room_id: '' });
    if (floorId) {
      loadRoomsForModal(floorId);
    } else {
      setModalRooms([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      if (editingBed) {
        const res = await api.updateBed(editingBed.id, formData);
        if (res.success) {
          setShowModal(false);
          fetchBeds();
        } else {
          setModalError(res.message || 'Failed to update bed.');
        }
      } else {
        const res = await api.createBed(formData);
        if (res.success) {
          setShowModal(false);
          fetchBeds();
        } else {
          setModalError(res.message || 'Failed to create bed.');
        }
      }
    } catch (err) {
      setModalError(err.message || 'An error occurred while saving bed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBed = async (id, bedNum, status) => {
    if (status === 'OCCUPIED') {
      alert(`Occupied bed "${bedNum}" cannot be deleted while assigned to a student.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete bed "${bedNum}"?`)) return;

    try {
      const res = await api.deleteBed(id);
      if (res.success) {
        fetchBeds();
      } else {
        alert(res.message || 'Failed to delete bed.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting bed.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="badge-status badge-active"><span className="badge-status-dot" />AVAILABLE</span>;
      case 'OCCUPIED':
        return <span className="badge-status badge-occupied"><span className="badge-status-dot" />OCCUPIED</span>;
      case 'MAINTENANCE':
        return <span className="badge-status badge-maintenance"><span className="badge-status-dot" />MAINTENANCE</span>;
      default:
        return <span className="badge-status badge-inactive"><span className="badge-status-dot" />{status}</span>;
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
            <span>Beds</span>
          </div>
          <h1 className="master-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-bed text-indigo-600"></i>
            <span>Bed Management</span>
          </h1>
          <p className="master-subtitle">Manage bed identifiers, availability, and occupancy state guards.</p>
        </div>
        <button onClick={handleOpenCreateModal} className="master-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-plus"></i> Add New Bed
        </button>
      </div>

      {/* Cascading Filter Bar */}
      <div className="master-filter-card">
        <div className="master-filter-group">
          {/* Hostel Dropdown */}
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

          {/* Floor Dropdown */}
          <select
            disabled={!selectedHostelId}
            className="master-select"
            value={selectedFloorId}
            onChange={(e) => {
              setSelectedFloorId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Floors</option>
            {floors.map(f => (
              <option key={f.id} value={f.id}>{f.floor_name}</option>
            ))}
          </select>

          {/* Room Dropdown */}
          <select
            disabled={!selectedFloorId}
            className="master-select"
            value={selectedRoomId}
            onChange={(e) => {
              setSelectedRoomId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Rooms</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>Room {r.room_number}</option>
            ))}
          </select>

          {/* Search Bar */}
          <div className="master-search-box" style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
            <input
              type="text"
              className="master-search-input"
              placeholder="Search bed number..."
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
          Total Beds: <strong>{pagination.total || beds.length}</strong>
        </div>
      </div>

      {error && (
        <div className="master-alert-error">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Beds Table / Cards */}
      {loading ? (
        <Loading message="Loading beds list..." />
      ) : beds.length === 0 ? (
        <div className="master-empty-state">
          <i className="fa-solid fa-bed text-slate-300" style={{ fontSize: '3rem', marginBottom: '12px' }}></i>
          <h3 className="master-empty-title">No Beds Found</h3>
          <p className="master-empty-desc">Adjust your filters or create a new bed in this room.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="master-table-card">
            <table className="master-table">
              <thead>
                <tr>
                  <th>Bed Number</th>
                  <th>Room</th>
                  <th>Hostel</th>
                  <th>Assigned Student</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {beds.map((b) => {
                  const bedLabel = String(b.bed_number || '').trim();
                  const displayTitle = bedLabel.toLowerCase().startsWith('bed') ? bedLabel : `Bed ${bedLabel}`;
                  return (
                  <tr key={b.id}>
                    <td>
                      <div className="master-cell-room">
                        <span className="master-room-icon" style={{ background: '#f3e8ff', color: '#6b21a8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fa-solid fa-bed"></i>
                        </span>
                        <span>{displayTitle}</span>
                      </div>
                    </td>
                    <td>Room {b.room_number || 'N/A'}</td>
                    <td>{b.hostel_name || 'Hostel'}</td>
                    <td>
                      {b.student_name ? (
                        <span style={{ fontWeight: '600', color: '#4f46e5' }}>
                          {b.student_name}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      {getStatusBadge(b.status)}
                    </td>
                    <td>
                      <div className="master-actions-group">
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="master-action-btn btn-action-edit"
                        >
                          Edit
                        </button>
                        <button
                          disabled={b.status === 'OCCUPIED'}
                          onClick={() => handleDeleteBed(b.id, b.bed_number, b.status)}
                          className="master-action-btn btn-action-delete"
                          title={b.status === 'OCCUPIED' ? 'Cannot delete occupied bed' : 'Delete bed'}
                          style={{ opacity: b.status === 'OCCUPIED' ? 0.45 : 1, cursor: b.status === 'OCCUPIED' ? 'not-allowed' : 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="master-mobile-cards">
            {beds.map((b) => {
              const bedLabel = String(b.bed_number || '').trim();
              const displayTitle = bedLabel.toLowerCase().startsWith('bed') ? bedLabel : `Bed ${bedLabel}`;
              return (
              <div key={b.id} className="master-mobile-card">
                <div className="master-mobile-card-header">
                  <div>
                    <div className="master-mobile-card-title">{displayTitle}</div>
                    <div className="master-mobile-card-subtitle">Room {b.room_number} • {b.hostel_name}</div>
                  </div>
                  {getStatusBadge(b.status)}
                </div>
                <div className="master-mobile-card-details">
                  <span>Student: <strong>{b.student_name || 'Unassigned'}</strong></span>
                </div>
                <div className="master-mobile-card-actions">
                  <button onClick={() => handleOpenEditModal(b)} className="master-action-btn btn-action-edit">
                    Edit
                  </button>
                  <button
                    disabled={b.status === 'OCCUPIED'}
                    onClick={() => handleDeleteBed(b.id, b.bed_number, b.status)}
                    className="master-action-btn btn-action-delete"
                    style={{ opacity: b.status === 'OCCUPIED' ? 0.45 : 1 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
            })}
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
                {editingBed ? 'Edit Bed' : '+ Create New Bed'}
              </h2>
              <button className="master-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            {modalError && (
              <div className="master-alert-error">
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Cascading Selection 1: Hostel */}
              <div className="master-form-group">
                <label className="master-form-label">Hostel *</label>
                <select
                  className="master-form-select"
                  required
                  value={formData.hostel_id}
                  onChange={(e) => handleModalHostelChange(e.target.value)}
                >
                  <option value="">-- Select Hostel --</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                  ))}
                </select>
              </div>

              {/* Cascading Selection 2: Floor */}
              <div className="master-form-group">
                <label className="master-form-label">Floor *</label>
                <select
                  disabled={!formData.hostel_id}
                  className="master-form-select"
                  required
                  value={formData.floor_id}
                  onChange={(e) => handleModalFloorChange(e.target.value)}
                >
                  <option value="">-- Select Floor --</option>
                  {modalFloors.map(f => (
                    <option key={f.id} value={f.id}>{f.floor_name}</option>
                  ))}
                </select>
              </div>

              {/* Cascading Selection 3: Room */}
              <div className="master-form-group">
                <label className="master-form-label">Room *</label>
                <select
                  disabled={!formData.floor_id}
                  className="master-form-select"
                  required
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                >
                  <option value="">-- Select Room --</option>
                  {modalRooms.map(r => (
                    <option key={r.id} value={r.id}>Room {r.room_number}</option>
                  ))}
                </select>
              </div>

              <div className="master-form-group">
                <label className="master-form-label">Bed Identifier *</label>
                <input
                  type="text"
                  className="master-form-input"
                  required
                  value={formData.bed_number}
                  onChange={(e) => setFormData({ ...formData, bed_number: e.target.value })}
                  placeholder="e.g. Bed A / 101-1"
                />
              </div>

              <div className="master-form-group">
                <label className="master-form-label">Status *</label>
                <select
                  className="master-form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="master-modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="master-btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="master-btn-primary">
                  {submitting ? 'Saving...' : (editingBed ? 'Save Changes' : 'Create Bed')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterBedsPage;
