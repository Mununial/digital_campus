import React, { useState } from 'react';
import api from '../../services/api';

const VISITOR_TYPES = [
  { value: 'PARENT', label: 'Parent' },
  { value: 'GUARDIAN', label: 'Local Guardian' },
  { value: 'RELATIVE', label: 'Relative' },
  { value: 'FRIEND', label: ' Friend' },
  { value: 'OFFICIAL', label: ' Official / Delivery' },
  { value: 'OTHER', label: 'Other' }
];

const ID_TYPES = ['Aadhaar', 'Voter ID', 'Passport', 'Driving License', 'College ID', 'Other Govt ID'];

export default function VisitorFormModal({ isOpen, onClose, onSubmitSuccess, userRole }) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const getDefaultCheckIn = () => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  };
  const getDefaultCheckOut = () => {
    const d = new Date(Date.now() + 4 * 3600000);
    return d.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    student_id: userRole === 'STUDENT' ? '' : '1',
    visitor_name: '',
    visitor_phone: '',
    visitor_email: '',
    visitor_type: 'PARENT',
    purpose: '',
    identification_type: 'Aadhaar',
    identification_last4: '',
    visit_date: getTodayDate(),
    expected_check_in: getDefaultCheckIn(),
    expected_check_out: getDefaultCheckOut()
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.visitor_name.trim()) {
      setError('Visitor name is required.');
      return;
    }
    if (!formData.visitor_phone.trim() || formData.visitor_phone.length < 10) {
      setError('Valid 10-digit visitor phone number is required.');
      return;
    }
    if (!formData.purpose.trim()) {
      setError('Purpose of visit is required.');
      return;
    }
    if (!formData.identification_last4 || formData.identification_last4.trim().length < 4) {
      setError('Please provide at least 4 digits/chars for identification verification.');
      return;
    }
    if (userRole !== 'STUDENT' && !formData.student_id) {
      setError('Please specify the student ID being visited.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        expected_check_in: formData.expected_check_in.replace('T', ' ') + ':00',
        expected_check_out: formData.expected_check_out.replace('T', ' ') + ':00'
      };

      await api.createVisit(payload);
      onSubmitSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit visitor registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container visitor-form-modal">
        <div className="modal-header">
          <h2> Register New Visitor</h2>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>

        <form onSubmit={handleSubmit} className="visitor-form">
          {error && <div className="form-error-alert">{error}</div>}

          <div className="privacy-notice-box">
            <span> <strong>Data Privacy:</strong> Store ONLY the last 4 digits of government IDs (e.g. Aadhaar). Never enter full ID numbers.</span>
          </div>

          <div className="form-grid">
            {userRole !== 'STUDENT' && (
              <div className="form-group full-width">
                <label htmlFor="student_id">Target Student ID *</label>
                <input
                  type="number"
                  id="student_id"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  placeholder="Enter Student ID (e.g. 1)"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="visitor_name">Visitor Full Name *</label>
              <input
                type="text"
                id="visitor_name"
                name="visitor_name"
                value={formData.visitor_name}
                onChange={handleChange}
                placeholder="e.g. Robert Doe"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="visitor_phone">Visitor Phone Number *</label>
              <input
                type="tel"
                id="visitor_phone"
                name="visitor_phone"
                value={formData.visitor_phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="visitor_type">Visitor Category *</label>
              <select
                id="visitor_type"
                name="visitor_type"
                value={formData.visitor_type}
                onChange={handleChange}
              >
                {VISITOR_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="visitor_email">Visitor Email (Optional)</label>
              <input
                type="email"
                id="visitor_email"
                name="visitor_email"
                value={formData.visitor_email}
                onChange={handleChange}
                placeholder="e.g. robert@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="identification_type">ID Document Type *</label>
              <select
                id="identification_type"
                name="identification_type"
                value={formData.identification_type}
                onChange={handleChange}
              >
                {ID_TYPES.map(idType => (
                  <option key={idType} value={idType}>{idType}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="identification_last4">ID Last 4 Digits / Code *</label>
              <input
                type="text"
                id="identification_last4"
                name="identification_last4"
                value={formData.identification_last4}
                onChange={handleChange}
                placeholder="e.g. 4321"
                maxLength="10"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="visit_date">Visit Date *</label>
              <input
                type="date"
                id="visit_date"
                name="visit_date"
                value={formData.visit_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="expected_check_in">Expected Entry Time *</label>
              <input
                type="datetime-local"
                id="expected_check_in"
                name="expected_check_in"
                value={formData.expected_check_in}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="expected_check_out">Expected Exit Time *</label>
              <input
                type="datetime-local"
                id="expected_check_out"
                name="expected_check_out"
                value={formData.expected_check_out}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="purpose">Purpose of Visit *</label>
              <textarea
                id="purpose"
                name="purpose"
                rows="3"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="Describe the reason for the visit..."
                required
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : userRole === 'STUDENT' ? 'Submit Visit Request' : 'Register & Approve Visitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
