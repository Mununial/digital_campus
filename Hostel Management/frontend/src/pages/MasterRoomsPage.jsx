import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import './MasterData.css';

const MasterRoomsPage = () => {
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [floors, setFloors] = useState([]);
  
  // Filter States
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [modalFloors, setModalFloors] = useState([]);
  const [formData, setFormData] = useState({
    hostel_id: '',
    floor_id: '',
    room_number: '',
    capacity: 2,
    status: 'ACTIVE'
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
    }
  }, [selectedHostelId]);

  useEffect(() => {
    fetchRooms();
  }, [page, selectedHostelId, selectedFloorId, searchTerm]);

  const loadHostels = async () => {
    try {
      const res = await api.getHostels({ limit: 100 });
      if (res.success) {
        setHostels(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load hostels:', err);
    }
  };

  const loadFloorsForFilter = async (hostelId) => {
    try {
      const res = await api.getFloors({ hostel_id: hostelId, limit: 100 });
      if (res.success) {
        setFloors(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load floors:', err);
    }
  };

  const loadFloorsForModal = async (hostelId) => {
    try {
      const res = await api.getFloors({ hostel_id: hostelId, limit: 100 });
      if (res.success) {
        setModalFloors(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load modal floors:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 10, search: searchTerm };
      if (selectedHostelId) params.hostel_id = selectedHostelId;
      if (selectedFloorId) params.floor_id = selectedFloorId;

      const res = await api.getRooms(params);
      if (res.success) {
        setRooms(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError(res.message || 'Failed to fetch rooms.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching rooms.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRoom(null);
    const initialHostelId = selectedHostelId || (hostels[0]?.id || '');
    setFormData({
      hostel_id: initialHostelId,
      floor_id: '',
      room_number: '',
      capacity: 2,
      status: 'ACTIVE'
    });
    if (initialHostelId) loadFloorsForModal(initialHostelId);
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      hostel_id: room.hostel_id || '',
      floor_id: room.floor_id || '',
      room_number: room.room_number || '',
      capacity: room.capacity || 2,
      status: room.status || 'ACTIVE'
    });
    if (room.hostel_id) loadFloorsForModal(room.hostel_id);
    setModalError(null);
    setShowModal(true);
  };

  const handleModalHostelChange = (hostelId) => {
    setFormData({ ...formData, hostel_id: hostelId, floor_id: '' });
    if (hostelId) {
      loadFloorsForModal(hostelId);
    } else {
      setModalFloors([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        floor_id: formData.floor_id ? parseInt(formData.floor_id, 10) : null
      };

      if (editingRoom) {
        const res = await api.updateRoom(editingRoom.id, payload);
        if (res.success) {
          setShowModal(false);
          fetchRooms();
        } else {
          setModalError(res.message || 'Failed to update room.');
        }
      } else {
        const res = await api.createRoom(payload);
        if (res.success) {
          setShowModal(false);
          fetchRooms();
        } else {
          setModalError(res.message || 'Failed to create room.');
        }
      }
    } catch (err) {
      setModalError(err.message || 'An error occurred while saving room.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (id, roomNum) => {
    if (!window.confirm(`Are you sure you want to delete room "${roomNum}"?`)) return;

    try {
      const res = await api.deleteRoom(id);
      if (res.success) {
        fetchRooms();
      } else {
        alert(res.message || 'Failed to delete room.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting room.');
    }
  };

  const getOccupancyPercent = (occupied, capacity) => {
    if (!capacity || capacity <= 0) return 0;
    return Math.min(100, Math.round(((occupied || 0) / capacity) * 100));
  };

  const getOccupancyColor = (percent) => {
    if (percent >= 100) return 'progress-red';
    if (percent >= 60) return 'progress-yellow';
    return 'progress-green';
  };

  return (
    <div className="master-page-container">
      {/* Page Header */}
      <div className="master-header">
        <div className="master-header-left">
          <div className="master-breadcrumbs">
            <Link to="/admin/master">Master Data</Link>
            <span className="master-breadcrumbs-separator">/</span>
            <span>Rooms</span>
          </div>
          <h1 className="master-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-door-open text-indigo-600"></i>
            <span>Room Management</span>
          </h1>
          <p className="master-subtitle">Manage room numbers, bed capacities, and operational status.</p>
        </div>
        <button onClick={handleOpenCreateModal} className="master-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-plus"></i> Add New Room
        </button>
      </div>

      {/* Unified Filter & Search Bar */}
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
              <option key={f.id} value={f.id}>{f.floor_name} (Level {f.floor_number})</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="master-search-box" style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
            <input
              type="text"
              className="master-search-input"
              placeholder="Search room number..."
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
          Total Rooms: <strong>{pagination.total || rooms.length}</strong>
        </div>
      </div>

      {error && (
        <div className="master-alert-error">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Rooms Table / Cards */}
      {loading ? (
        <Loading message="Loading rooms list..." />
      ) : rooms.length === 0 ? (
        <div className="master-empty-state">
          <i className="fa-solid fa-door-closed text-slate-300" style={{ fontSize: '3rem', marginBottom: '12px' }}></i>
          <h3 className="master-empty-title">No Rooms Found</h3>
          <p className="master-empty-desc">Adjust your filters or create a new room in this floor.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="master-table-card">
            <table className="master-table">
              <thead>
                <tr>
                  <th>Room Number</th>
                  <th>Floor</th>
                  <th>Hostel</th>
                  <th>Capacity</th>
                  <th>Occupancy</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => {
                  const occupied = Number(r.occupied_beds || 0);
                  const capacity = Number(r.capacity || 1);
                  const percent = getOccupancyPercent(occupied, capacity);
                  const progressClass = getOccupancyColor(percent);

                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="master-cell-room">
                          <span className="master-room-icon" style={{ background: '#cff4fc', color: '#055160', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-door-open"></i>
                          </span>
                          <span>Room {r.room_number}</span>
                        </div>
                      </td>
                      <td>{r.floor_name || 'Floor'}</td>
                      <td>{r.hostel_name || 'Hostel'}</td>
                      <td>
                        <strong>{r.capacity}</strong> beds
                      </td>
                      <td>
                        <div className="master-occupancy-container">
                          <div className="master-occupancy-info">
                            <span>{occupied} / {capacity} beds</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="master-progress-bar">
                            <div
                              className={`master-progress-fill ${progressClass}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge-status ${
                          r.status === 'ACTIVE'
                            ? 'badge-active'
                            : (r.status === 'MAINTENANCE' ? 'badge-maintenance' : 'badge-inactive')
                        }`}>
                          <span className="badge-status-dot" />
                          {r.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div className="master-actions-group">
                          <button
                            onClick={() => handleOpenEditModal(r)}
                            className="master-action-btn btn-action-edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(r.id, r.room_number)}
                            className="master-action-btn btn-action-delete"
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
            {rooms.map((r) => {
              const occupied = Number(r.occupied_beds || 0);
              const capacity = Number(r.capacity || 1);
              const percent = getOccupancyPercent(occupied, capacity);
              const progressClass = getOccupancyColor(percent);

              return (
                <div key={r.id} className="master-mobile-card">
                  <div className="master-mobile-card-header">
                    <div>
                      <div className="master-mobile-card-title">Room {r.room_number}</div>
                      <div className="master-mobile-card-subtitle">{r.floor_name} • {r.hostel_name}</div>
                    </div>
                    <span className={`badge-status ${
                      r.status === 'ACTIVE'
                        ? 'badge-active'
                        : (r.status === 'MAINTENANCE' ? 'badge-maintenance' : 'badge-inactive')
                    }`}>
                      <span className="badge-status-dot" />
                      {r.status || 'ACTIVE'}
                    </span>
                  </div>
                  
                  <div className="master-occupancy-container" style={{ margin: '4px 0' }}>
                    <div className="master-occupancy-info">
                      <span>Occupancy: {occupied} / {capacity} beds</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="master-progress-bar">
                      <div className={`master-progress-fill ${progressClass}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  <div className="master-mobile-card-actions">
                    <button onClick={() => handleOpenEditModal(r)} className="master-action-btn btn-action-edit">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteRoom(r.id, r.room_number)} className="master-action-btn btn-action-delete">
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
                {editingRoom ? 'Edit Room' : '+ Create New Room'}
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

              {/* Cascading Selection 2: Floor (Optional) */}
              <div className="master-form-group">
                <label className="master-form-label">Floor (Optional)</label>
                <select
                  disabled={!formData.hostel_id}
                  className="master-form-select"
                  value={formData.floor_id}
                  onChange={(e) => setFormData({ ...formData, floor_id: e.target.value })}
                >
                  <option value="">-- No Floor / Ground / Single Floor --</option>
                  {modalFloors.map(f => (
                    <option key={f.id} value={f.id}>{f.floor_name} (Level {f.floor_number})</option>
                  ))}
                </select>
              </div>

              <div className="master-form-group">
                <label className="master-form-label">Room Number *</label>
                <input
                  type="text"
                  className="master-form-input"
                  required
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  placeholder="e.g. 101 / A-202"
                />
              </div>

              <div className="master-form-row">
                <div className="master-form-group">
                  <label className="master-form-label">Bed Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    className="master-form-input"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 1 })}
                  />
                  <small style={{ color: '#059669', fontSize: '0.78rem', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                    {formData.capacity || 0} beds (Bed 1, Bed 2...) will be automatically created.
                  </small>
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
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>

              <div className="master-modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="master-btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="master-btn-primary">
                  {submitting ? 'Saving...' : (editingRoom ? 'Save Changes' : 'Create Room')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterRoomsPage;
