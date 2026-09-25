import React, { useState } from 'react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const RecordPaymentModal = ({ isOpen, onClose, onSubmit, fee }) => {
  const [formData, setFormData] = useState({
    amount: fee ? fee.remaining_amount : '',
    payment_method: 'UPI',
    transaction_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !fee) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payAmount = parseFloat(formData.amount);
    if (!payAmount || payAmount <= 0) {
      return setError('Payment amount must be greater than 0.');
    }
    if (payAmount > parseFloat(fee.remaining_amount)) {
      return setError(`Payment amount cannot exceed remaining dues of ${formatCurrency(fee.remaining_amount)}.`);
    }

    try {
      setLoading(true);
      await onSubmit({
        student_fee_id: fee.id,
        ...formData
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box glassmorphic">
        <div className="modal-header">
          <h3>Record Fee Payment</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="payment-target-banner">
          <div className="target-info">
            <span className="student-title">{fee.student_name} ({fee.student_code})</span>
            <span className="fee-title">{fee.fee_name || 'Hostel Fee'} • {fee.academic_year}</span>
          </div>
          <div className="target-dues">
            <span className="due-label">Remaining Dues</span>
            <span className="due-amount">{formatCurrency(fee.remaining_amount)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-alert">{error}</div>}

          <div className="form-row-2">
            <div className="form-group">
              <label>Payment Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                max={fee.remaining_amount}
                min="1"
                step="0.01"
                placeholder="e.g. 10000"
                value={formData.amount}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Payment Method *</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                required
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="CASH">Cash Deposit</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Transaction Reference / UTR #</label>
              <input
                type="text"
                name="transaction_reference"
                placeholder="e.g. UPI/1234567890 or Cheque #10293"
                value={formData.transaction_reference}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Payment Date *</label>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes / Internal Remarks</label>
            <textarea
              name="notes"
              placeholder="e.g. Handed over at warden desk, receipt issued"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-modal cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-modal submit success" disabled={loading}>
              {loading ? 'Processing...' : 'Confirm & Issue Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
