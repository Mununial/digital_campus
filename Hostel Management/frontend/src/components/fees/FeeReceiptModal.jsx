import React from 'react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const FeeReceiptModal = ({ isOpen, onClose, receipt }) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box glassmorphic receipt-modal-box">
        <div className="modal-header no-print">
          <h3>Official Payment Receipt</h3>
          <div className="header-actions">
            <button className="btn-print" onClick={handlePrint}>Print Receipt</button>
            <button className="btn-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="printable-receipt" id="printable-fee-receipt">
          <div className="receipt-header">
            <div className="institution-logo"></div>
            <div className="institution-details">
              <h2>COLLEGE HOSTEL MANAGEMENT SYSTEM</h2>
              <p>Official Student Fee Payment Receipt</p>
              <span className="receipt-tag font-mono">{receipt.receipt_number}</span>
            </div>
          </div>

          <hr className="receipt-divider" />

          <div className="receipt-grid">
            <div className="receipt-col">
              <span className="label">Student Name:</span>
              <span className="value bold">{receipt.student_name}</span>
            </div>
            <div className="receipt-col">
              <span className="label">Student ID:</span>
              <span className="value font-mono">{receipt.student_code}</span>
            </div>
            <div className="receipt-col">
              <span className="label">Hostel & Room:</span>
              <span className="value">{receipt.hostel_name} — Room {receipt.room_number || 'N/A'}</span>
            </div>
            <div className="receipt-col">
              <span className="label">Academic Year:</span>
              <span className="value">{receipt.academic_year || '2026-27'}</span>
            </div>
          </div>

          <div className="receipt-table-wrapper">
            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Description / Particulars</th>
                  <th>Payment Method</th>
                  <th>Transaction Reference</th>
                  <th className="text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>{receipt.fee_name || 'Hostel Fee'}</strong>
                    <div className="small-text">{receipt.fee_type} ({receipt.frequency || 'YEARLY'})</div>
                  </td>
                  <td><span className="method-badge">{receipt.payment_method}</span></td>
                  <td className="font-mono">{receipt.transaction_reference || 'N/A'}</td>
                  <td className="text-right bold text-success">{formatCurrency(receipt.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="receipt-summary-footer">
            <div className="summary-left">
              <div className="summary-row">
                <span className="label">Payment Date:</span>
                <span className="value">{new Date(receipt.payment_date || receipt.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="summary-row">
                <span className="label">Received By:</span>
                <span className="value">{receipt.received_by_name || 'Hostel Administration'}</span>
              </div>
              {receipt.notes && (
                <div className="summary-row">
                  <span className="label">Remarks:</span>
                  <span className="value italic">{receipt.notes}</span>
                </div>
              )}
            </div>

            <div className="summary-right">
              <div className="amount-box">
                <span className="total-label">Total Amount Paid</span>
                <span className="total-val">{formatCurrency(receipt.amount)}</span>
              </div>
            </div>
          </div>

          <div className="receipt-footer-stamp">
            <div className="stamp-col">
              <span className="stamp-title">System Verified</span>
              <span className="stamp-sub font-mono">HASH: {receipt.receipt_number}-VERIFIED</span>
            </div>
            <div className="stamp-col text-right">
              <div className="signature-line">Authorized Signatory</div>
              <span className="stamp-sub">Hostel Financial Authority</span>
            </div>
          </div>
        </div>

        <div className="modal-actions no-print">
          <button type="button" className="btn-modal cancel" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-modal submit primary" onClick={handlePrint}>
            ️ Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeReceiptModal;
