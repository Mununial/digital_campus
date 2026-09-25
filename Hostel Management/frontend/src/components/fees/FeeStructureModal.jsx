import React, { useState } from 'react';

const FeeStructureModal = ({ isOpen, onClose, onSubmit, hostels = [], isSuperAdmin = false }) => {
  const [formData, setFormData] = useState({
    hostel_id: '',
    fee_type: 'HOSTEL_FEE',
    name: '',
    description: '',
    amount: '',
    frequency: 'YEARLY',
    academic_year: '2026-27',
    applicable_course: '',
    applicable_branch: '',
    applicable_year: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError('Structure name is required.');
    if (!formData.amount || parseFloat(formData.amount) <= 0) return setError('Please enter a valid amount greater than 0.');
    if (!formData.academic_year.trim()) return setError('Academic year is required.');

    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create fee structure.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box glassmorphic">
        <div className="modal-header">
          <h3>Create New Fee Structure</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-alert">{error}</div>}

          <div className="form-group">
            <label>Target Hostel</label>
            <select
              name="hostel_id"
              value={formData.hostel_id}
              onChange={handleChange}
            >
              {isSuperAdmin && <option value="">Global (Applicable to All Hostels)</option>}
              {hostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Fee Type *</label>
              <select
                name="fee_type"
                value={formData.fee_type}
                onChange={handleChange}
                required
              >
                <option value="HOSTEL_FEE">Hostel Fee</option>
                <option value="MESS_FEE">Mess Fee</option>
                <option value="MAINTENANCE_FEE">Maintenance Fee</option>
                <option value="SECURITY_DEPOSIT">Security Deposit</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Frequency *</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                required
              >
                <option value="YEARLY">Yearly</option>
                <option value="SEMESTER">Semester</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="ONE_TIME">One-Time</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Structure Name *</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Annual Hostel Accommodation Fee 2026-27"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                placeholder="e.g. 30000"
                min="1"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Academic Year *</label>
              <input
                type="text"
                name="academic_year"
                placeholder="e.g. 2026-27"
                value={formData.academic_year}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              placeholder="Provide breakdown details or optional terms..."
              rows={2}
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-modal cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-modal submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Structure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeeStructureModal;
