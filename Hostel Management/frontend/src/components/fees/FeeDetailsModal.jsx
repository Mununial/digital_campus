import React from 'react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const FeeDetailsModal = ({ isOpen, onClose, feeDetail, onViewReceipt }) => {
  if (!isOpen || !feeDetail) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-box glassmorphic large-modal-box">
        <div className="modal-header">
          <h3>Fee Record & Payment History</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="fee-detail-container">
          {/* Top Overview Bar */}
          <div className="detail-banner">
            <div className="banner-col">
              <span className="banner-label">Student</span>
              <span className="banner-val bold">{feeDetail.student_name} ({feeDetail.student_code})</span>
            </div>
            <div className="banner-col">
              <span className="banner-label">Hostel & Room</span>
              <span className="banner-val">{feeDetail.hostel_name} — Room {feeDetail.room_number || 'N/A'}</span>
            </div>
            <div className="banner-col">
              <span className="banner-label">Total Fee</span>
              <span className="banner-val bold">{formatCurrency(feeDetail.amount)}</span>
            </div>
            <div className="banner-col">
              <span className="banner-label">Paid Amount</span>
              <span className="banner-val text-success bold">{formatCurrency(feeDetail.paid_amount)}</span>
            </div>
            <div className="banner-col">
              <span className="banner-label">Remaining Balance</span>
              <span className={`banner-val bold ${feeDetail.remaining_amount > 0 ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(feeDetail.remaining_amount)}
              </span>
            </div>
          </div>

          {/* Payments Section */}
          <div className="detail-section">
            <h4>Recorded Payments ({feeDetail.payments ? feeDetail.payments.length : 0})</h4>
            {feeDetail.payments && feeDetail.payments.length > 0 ? (
              <div className="table-responsive">
                <table className="fee-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Txn Ref</th>
                      <th>Amount</th>
                      <th>Received By</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeDetail.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono bold">{p.receipt_number}</td>
                        <td>{new Date(p.payment_date || p.created_at).toLocaleDateString('en-IN')}</td>
                        <td><span className="method-badge">{p.payment_method}</span></td>
                        <td className="font-mono small-text">{p.transaction_reference || 'N/A'}</td>
                        <td className="bold text-success">{formatCurrency(p.amount)}</td>
                        <td>{p.received_by_name || 'Staff'}</td>
                        <td>
                          <button
                            className="btn-action secondary small"
                            onClick={() => onViewReceipt(p.id)}
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-subtext">No payments recorded yet for this fee record.</div>
            )}
          </div>

          {/* Audit History Section */}
          <div className="detail-section">
            <h4> Audit History Trail</h4>
            {feeDetail.history && feeDetail.history.length > 0 ? (
              <div className="timeline-container">
                {feeDetail.history.map((h) => (
                  <div className="timeline-item" key={h.id}>
                    <div className="timeline-badge">{h.action === 'ASSIGNED' ? '' : h.action === 'PAYMENT_RECORDED' ? '' : ''}</div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="action-tag">{h.action}</span>
                        <span className="timeline-time">{new Date(h.created_at).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="timeline-reason">{h.reason}</div>
                      <div className="timeline-by">By: {h.changed_by_name || 'System Admin'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-subtext">No audit history entries.</div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-modal cancel" onClick={onClose}>
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeDetailsModal;
