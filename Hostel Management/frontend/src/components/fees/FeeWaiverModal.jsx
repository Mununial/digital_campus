import React, { useState } from 'react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const FeeWaiverModal = ({ isOpen, onClose, onSubmit, fee }) => {
  const [waiverReason, setWaiverReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !fee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!waiverReason.trim()) return setError('Waiver reason is required.');

    try {
      setLoading(true);
      await onSubmit(fee.id, waiverReason);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to waive fee.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box glassmorphic">
        <div className="modal-header">
          <h3>Waive Student Fee Dues</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="waiver-warning-alert">
          <strong>Warning:</strong> You are waiving remaining dues of {formatCurrency(fee.remaining_amount)} for <strong>{fee.student_name}</strong> ({fee.student_code}). This action will mark the fee status as <strong>WAIVED</strong> and log an immutable record in the financial audit trail.
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-alert">{error}</div>}

          <div className="form-group">
            <label>Formal Waiver Reason / Authorization Ref *</label>
            <textarea
              name="waiverReason"
              placeholder="e.g. Approved Merit-cum-Means Scholarship Waiver by Governing Body / Circular #2026/FEE-11"
              rows={4}
              value={waiverReason}
              onChange={(e) => { setWaiverReason(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-modal cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-modal submit danger" disabled={loading}>
              {loading ? 'Waiving...' : 'Confirm Fee Waiver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeeWaiverModal;
