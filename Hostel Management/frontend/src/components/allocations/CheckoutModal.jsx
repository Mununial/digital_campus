import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CheckoutModal = ({ isOpen, onClose, onSuccess, allocation }) => {
  const [formData, setFormData] = useState({
    checkout_date: new Date().toISOString().slice(0, 10),
    checkout_reason: 'COURSE_COMPLETED',
    custom_reason: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        checkout_date: new Date().toISOString().slice(0, 10),
        checkout_reason: 'COURSE_COMPLETED',
        custom_reason: ''
      });
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !allocation) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.checkout_reason === 'OTHER' && !formData.custom_reason.trim()) {
      return setError('Please specify a custom reason when "OTHER" is selected.');
    }

    setSubmitting(true);
    try {
      await api.checkoutStudent(allocation.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to checkout student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 style={{ color: '#DC2626' }}>Student Hostel Checkout</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="alert alert-danger" style={{ margin: '15px 20px 0' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ fontWeight: '700', color: '#991B1B', marginBottom: '4px' }}>
              Confirm Release of Bed for {allocation.student_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#7F1D1D' }}>
              Releasing: <strong>{allocation.hostel_name}</strong> &bull; Room <strong>{allocation.room_number}</strong> &bull; Bed <strong>{allocation.bed_number}</strong>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Checkout Date *</label>
            <input
              type="date"
              value={formData.checkout_date}
              onChange={e => setFormData({ ...formData, checkout_date: e.target.value })}
              required
              className="form-control"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Checkout Reason *</label>
            <select
              value={formData.checkout_reason}
              onChange={e => setFormData({ ...formData, checkout_reason: e.target.value })}
              required
              className="form-control"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="COURSE_COMPLETED">Course Completed / Graduated</option>
              <option value="TRANSFERRED">Transferred to another Institution</option>
              <option value="LEFT_COLLEGE">Left College / Withdrawal</option>
              <option value="HOSTEL_CHANGE">Hostel Change (Manual Exit)</option>
              <option value="DISCIPLINARY">Disciplinary Action</option>
              <option value="PERSONAL">Personal Reasons</option>
              <option value="OTHER">Other Reason (Specify below)</option>
            </select>
          </div>

          {formData.checkout_reason === 'OTHER' && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Custom Checkout Reason *</label>
              <input
                type="text"
                value={formData.custom_reason}
                onChange={e => setFormData({ ...formData, custom_reason: e.target.value })}
                placeholder="Enter specific details"
                required
                className="form-control"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#DC2626', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
            >
              {submitting ? 'Checking out...' : 'Confirm Checkout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutModal;
