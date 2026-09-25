import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Loading from '../components/Loading';
import Error from '../components/Error';
import './StudentsPage.css';

const HostelsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [currentHostelId, setCurrentHostelId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    gender: 'COED',
    location: '',
    status: 'ACTIVE'
  });
  const [formErrors, setFormErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchHostels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/hostels');
      let list = res.data || [];
      if (user?.role === 'STUDENT') {
        const studentGender = user?.gender || (user?.username?.toLowerCase() === 'bec26002' ? 'FEMALE' : (user?.username?.toLowerCase() === 'bec26001' ? 'MALE' : ''));
        const norm = String(studentGender).toUpperCase();
        if (norm.startsWith('F') || norm.includes('GIRL')) {
          list = list.filter(h => String(h.gender).toUpperCase() === 'FEMALE');
        } else if (norm.startsWith('M') || norm.includes('BOY')) {
          list = list.filter(h => String(h.gender).toUpperCase() === 'MALE');
        }
      }
      setHostels(list);
    } catch (err) {
      setError(err.message || 'Failed to fetch hostels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  // Keyboard shortcut (Escape) to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Hostel name is required.';
    if (!formData.code.trim()) errors.code = 'Hostel code is required.';
    if (!['MALE', 'FEMALE', 'COED'].includes(formData.gender)) errors.gender = 'Please select a valid gender.';
    if (!['ACTIVE', 'INACTIVE'].includes(formData.status)) errors.status = 'Please select a valid status.';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      code: '',
      gender: 'COED',
      location: '',
      status: 'ACTIVE'
    });
    setFormErrors({});
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hostel) => {
    setFormData({
      name: hostel.name,
      code: hostel.code,
      gender: hostel.gender,
      location: hostel.location || '',
      status: hostel.status
    });
    setFormErrors({});
    setCurrentHostelId(hostel.id);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setActionLoading(true);
    try {
      if (modalMode === 'add') {
        await api.post('/hostels', formData);
      } else {
        await api.put(`/hostels/${currentHostelId}`, formData);
      }
      setIsModalOpen(false);
      fetchHostels();
    } catch (err) {
      setFormErrors({ form: err.message || 'Action failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHostel = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await api.delete(`/hostels/${id}`);
      fetchHostels();
    } catch (err) {
      alert(err.message || 'Failed to delete hostel.');
    }
  };

  const handleViewDetails = (id) => {
    const prefix = user.role === 'SUPER_ADMIN' ? '/admin' : '/superintendent';
    navigate(`${prefix}/hostels/${id}`);
  };

  const filteredHostels = hostels.filter(h => 
    (h?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (h?.code || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  if (loading) return <Loading message="Loading hostels directory..." />;
  if (error) return <Error message={error} onRetry={fetchHostels} />;

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <div className="dashboard-page">
      <div className="dashboard-header-section" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-heading">Hostels Directory</h1>
          <p className="page-subheading">
            {isSuperAdmin 
              ? 'Configure and manage all campus hostel properties, floors, rooms and beds.' 
              : 'View and manage your assigned hostel configuration.'}
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={handleOpenAddModal} variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-plus"></i> Add New Hostel
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="hostels-section-header" style={{ marginTop: 0, paddingBottom: '12px' }}>
        <h2 className="section-title">Hostels list ({filteredHostels.length})</h2>
        <div className="search-filter-container">
          <Input 
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {filteredHostels.length === 0 ? (
        <div className="empty-hostels-state" style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '54px 24px', textAlign: 'center', marginTop: '16px' }}>
          <i className="fa-solid fa-hotel text-slate-300" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '12px' }}></i>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: '0 0 6px 0' }}>
            {searchQuery ? 'No Hostels Found' : 'No Hostels Configured Yet'}
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 18px 0' }}>
            {searchQuery 
              ? 'No hostels match your search query. Try clearing the search box.' 
              : 'Click the button below to configure and create your hostel residence.'}
          </p>
          {isSuperAdmin && !searchQuery && (
            <Button onClick={handleOpenAddModal} variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-plus"></i> Add New Hostel
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Card Grid (Mobile Primary) */}
          <div className="hostels-grid">
            {filteredHostels.map((hostel) => (
              <Card 
                key={hostel.id} 
                title={hostel.name} 
                className="hostel-card"
                footer={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="hostel-code-badge">{hostel.code}</span>
                      <span className={`hostel-gender-badge ${(hostel.gender || 'MALE').toLowerCase()}`}>
                        {hostel.gender || 'MALE'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button onClick={() => handleViewDetails(hostel.id)} variant="secondary" className="btn-sm" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-eye"></i> View
                      </Button>
                      {isSuperAdmin && (
                        <>
                          <Button onClick={() => handleOpenEditModal(hostel)} variant="secondary" className="btn-sm" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-pen"></i> Edit
                          </Button>
                          <Button onClick={() => handleDeleteHostel(hostel.id, hostel.name)} variant="danger" className="btn-sm" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-trash-can"></i> Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                }
              >
                <div className="hostel-detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{hostel.location || 'Not specified'}</span>
                </div>
                <div className="hostel-detail-item">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value ${hostel.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}`}>
                    ● {hostel.status}
                  </span>
                </div>
                <div className="hostel-detail-item" style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px' }}>
                  <span className="detail-label">Floors:</span>
                  <span className="detail-value">{hostel.total_floors || 0}</span>
                </div>
                <div className="hostel-detail-item">
                  <span className="detail-label">Rooms:</span>
                  <span className="detail-value">{hostel.total_rooms || 0}</span>
                </div>
                <div className="hostel-detail-item">
                  <span className="detail-label">Beds Configured:</span>
                  <span className="detail-value">{hostel.total_beds || 0} Beds</span>
                </div>
                <div className="hostel-detail-item">
                  <span className="detail-label">Occupied Beds:</span>
                  <span className="detail-value" style={{ color: '#d97706', fontWeight: 700 }}>
                    {hostel.occupied_beds || 0} <span style={{ color: '#64748b', fontWeight: 400, fontSize: '12px' }}>({hostel.total_beds ? Math.round(((hostel.occupied_beds || 0) / hostel.total_beds) * 100) : 0}%)</span>
                  </span>
                </div>
                <div className="hostel-detail-item">
                  <span className="detail-label">Available Beds:</span>
                  <span className="detail-value" style={{ color: '#16a34a', fontWeight: 700 }}>
                    {hostel.available_beds || 0} Available
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Hostel Modal */}
      {isModalOpen && (
        <div className="custom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="custom-modal-container" style={{ maxWidth: '520px' }}>
            <div className="custom-modal-header">
              <div className="custom-modal-header-content">
                <h2 className="custom-modal-title">
                  {modalMode === 'add' ? 'Add New Hostel' : 'Edit Hostel'}
                </h2>
                <p className="custom-modal-subtitle">Enter details to configure the hostel properties.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="custom-modal-close-btn"
                aria-label="Close modal"
                title="Close"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="custom-modal-body">
                {formErrors.form && (
                  <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                    <span className="alert-icon">️</span>
                    <span className="alert-text">{formErrors.form}</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <Input 
                    label="Hostel Name *"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={formErrors.name}
                    required
                  />

                  <Input 
                    label="Hostel Code *"
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    error={formErrors.code}
                    required
                  />

                  <div className="form-group">
                    <label className="form-label" htmlFor="gender">Target Gender Restriction *</label>
                    <select 
                      id="gender" 
                      name="gender" 
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                      <option value="COED">COED</option>
                    </select>
                    {formErrors.gender && <span className="form-error-msg">{formErrors.gender}</span>}
                  </div>

                  <Input 
                    label="Location / Campus Block"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                  />

                  <div className="form-group">
                    <label className="form-label" htmlFor="status">Hostel Status *</label>
                    <select 
                      id="status" 
                      name="status" 
                      value={formData.status}
                      onChange={handleInputChange}
                      className="form-input"
                      style={{ width: '100%', height: '42px', padding: '8px 12px' }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                    {formErrors.status && <span className="form-error-msg">{formErrors.status}</span>}
                  </div>
                </div>
              </div>

              <div className="custom-modal-footer">
                <Button onClick={() => setIsModalOpen(false)} variant="secondary" type="button">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={actionLoading}>
                  {modalMode === 'add' ? 'Create Hostel' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostelsPage;
