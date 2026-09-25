import React, { useState, useEffect } from 'react';
import { createTechnician, updateTechnician } from '../../api/operations';

export default function TechnicianFormModal({
  isOpen,
  onClose,
  onSuccess,
  technician = null,
  hostels = []
}) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    skill_category: 'ELECTRICAL',
    assigned_hostel_id: '',
    status: 'AVAILABLE',
    rating: '5.00'
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (technician) {
      setFormData({
        full_name: technician.full_name || '',
        phone: technician.phone || '',
        email: technician.email || '',
        skill_category: technician.skill_category || 'GENERAL',
        assigned_hostel_id: technician.assigned_hostel_id || '',
        status: technician.status || 'AVAILABLE',
        rating: technician.rating ? String(technician.rating) : '5.00'
      });
    } else {
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        skill_category: 'ELECTRICAL',
        assigned_hostel_id: '',
        status: 'AVAILABLE',
        rating: '5.00'
      });
    }
  }, [technician]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (technician) {
        await updateTechnician(technician.id, formData);
      } else {
        await createTechnician(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save technician.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div 
        className="modal-dialog-custom" 
        style={{ maxWidth: '600px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header-custom">
          <h2 className="modal-title-custom">
            <span>{technician ? 'Edit Technician' : 'Register Campus Technician'}</span>
          </h2>
          <button type="button" className="modal-close-btn-custom" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-custom">
            {error && (
              <div className="alert-error-custom" style={{ marginBottom: '16px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                <div>{error}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="filter-search-input"
                  style={{ paddingLeft: '12px' }}
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Phone Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="filter-search-input"
                  style={{ paddingLeft: '12px' }}
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="filter-search-input"
                  style={{ paddingLeft: '12px' }}
                  placeholder="e.g. ramesh@bec.ac.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Skill Category / Trade <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={formData.skill_category}
                  onChange={(e) => setFormData({ ...formData, skill_category: e.target.value })}
                  required
                >
                  <option value="ELECTRICAL">ELECTRICAL</option>
                  <option value="PLUMBING">PLUMBING</option>
                  <option value="CARPENTRY">CARPENTRY</option>
                  <option value="FAN_AC">FAN & AC</option>
                  <option value="NETWORK">WI-FI & NETWORK</option>
                  <option value="GENERAL">GENERAL</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Assigned Hostel
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={formData.assigned_hostel_id}
                  onChange={(e) => setFormData({ ...formData, assigned_hostel_id: e.target.value })}
                >
                  <option value="">All Hostels (Campus-wide)</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ON_JOB">ON JOB</option>
                  <option value="ON_LEAVE">ON LEAVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Performance Rating
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="5.0"
                  className="filter-search-input"
                  style={{ paddingLeft: '12px' }}
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer-custom">
            <button type="button" className="filter-reset-btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-gradient" disabled={submitting}>
              {submitting ? 'Saving...' : technician ? 'Update Technician' : 'Register Technician'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
