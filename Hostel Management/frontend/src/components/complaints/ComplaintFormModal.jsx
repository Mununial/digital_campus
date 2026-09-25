import React, { useState } from 'react';
import api from '../../services/api';

const CATEGORIES = [
  { value: 'ROOM', label: 'Room Maintenance' },
  { value: 'ELECTRICITY', label: 'Electricity / Electrical' },
  { value: 'WATER', label: 'Water Supply' },
  { value: 'PLUMBING', label: 'Plumbing & Drainage' },
  { value: 'CLEANLINESS', label: 'Cleanliness & Hygiene' },
  { value: 'FAN_AC', label: 'Fan / AC / Cooling' },
  { value: 'FURNITURE', label: 'Furniture (Bed/Desk/Chair)' },
  { value: 'FOOD_MESS', label: 'Mess & Food Quality' },
  { value: 'INTERNET', label: 'WiFi / Internet' },
  { value: 'SECURITY', label: 'Hostel Security' },
  { value: 'MAINTENANCE', label: 'General Maintenance' },
  { value: 'OTHER', label: 'Other Issue' }
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low (Non-urgent request)' },
  { value: 'MEDIUM', label: 'Medium (Standard maintenance)' },
  { value: 'HIGH', label: 'High (Needs attention within 24h)' },
  { value: 'URGENT', label: 'URGENT (Safety / Infrastructure Emergency)' }
];

const ComplaintFormModal = ({ isOpen, onClose, onSuccess, onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'ROOM',
    priority: 'MEDIUM'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await api.createComplaint(formData);
      if (res.success) {
        setFormData({ title: '', description: '', category: 'ROOM', priority: 'MEDIUM' });
        if (typeof onSuccess === 'function') onSuccess(res.data);
        if (typeof onSubmitSuccess === 'function') onSubmitSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container modal-md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Submit New Complaint</h2>
            <p className="modal-sub">Report an issue in your hostel room or common premises</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger mb-4">{error}</div>}

            <div className="form-group mb-4">
              <label htmlFor="complaint-title" className="form-label required">Complaint Title</label>
              <input
                id="complaint-title"
                type="text"
                name="title"
                className="form-control"
                placeholder="e.g. Bathroom Sink Water Leakage"
                maxLength={150}
                value={formData.title}
                onChange={handleChange}
                required
              />
              <small className="form-hint">{formData.title.length}/150 characters</small>
            </div>

            <div className="form-row mb-4">
              <div className="form-group col-half">
                <label htmlFor="complaint-category" className="form-label required">Category</label>
                <select
                  id="complaint-category"
                  name="category"
                  className="form-select"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group col-half">
                <label htmlFor="complaint-priority" className="form-label required">Priority Level</label>
                <select
                  id="complaint-priority"
                  name="priority"
                  className="form-select"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  {PRIORITIES.map((prio) => (
                    <option key={prio.value} value={prio.value}>{prio.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group mb-4">
              <label htmlFor="complaint-description" className="form-label required">Detailed Description</label>
              <textarea
                id="complaint-description"
                name="description"
                rows={4}
                className="form-control"
                placeholder="Describe the problem, exact location in room, and any relevant details..."
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintFormModal;
