import React from 'react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const FeeSummaryCards = ({ summary, isStudent = false }) => {
  if (!summary) return null;

  if (isStudent) {
    const { totalFees, totalPaid, totalPending, totalOverdue, overallStatus } = summary;
    return (
      <div className="fee-summary-grid">
        <div className="fee-stat-card primary">
          <div className="fee-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <div className="fee-stat-content">
            <span className="fee-stat-label">Total Assigned Fees</span>
            <span className="fee-stat-value">{formatCurrency(totalFees)}</span>
          </div>
        </div>

        <div className="fee-stat-card success">
          <div className="fee-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div className="fee-stat-content">
            <span className="fee-stat-label">Total Amount Paid</span>
            <span className="fee-stat-value">{formatCurrency(totalPaid)}</span>
          </div>
        </div>

        <div className="fee-stat-card warning">
          <div className="fee-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <div className="fee-stat-content">
            <span className="fee-stat-label">Remaining Balance</span>
            <span className="fee-stat-value">{formatCurrency(totalPending)}</span>
          </div>
        </div>

        <div className={`fee-stat-card ${totalOverdue > 0 ? 'danger' : 'info'}`}>
          <div className="fee-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`fa-solid ${totalOverdue > 0 ? 'fa-triangle-exclamation' : 'fa-shield-halved'}`}></i>
          </div>
          <div className="fee-stat-content">
            <span className="fee-stat-label">Overdue Dues</span>
            <span className="fee-stat-value">{formatCurrency(totalOverdue)}</span>
            <span className={`fee-status-badge status-${overallStatus?.toLowerCase()}`}>
              {overallStatus}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { totalAssigned, totalCollected, totalPending, totalOverdue, collectionPercentage } = summary;

  return (
    <div className="fee-summary-grid">
      <div className="fee-stat-card primary">
        <div className="fee-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-file-invoice-dollar"></i>
        </div>
        <div className="fee-stat-content">
          <span className="fee-stat-label">Total Expected Fees</span>
          <span className="fee-stat-value">{formatCurrency(totalAssigned)}</span>
        </div>
      </div>

      <div className="fee-stat-card success">
        <div className="fee-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-circle-check"></i>
        </div>
        <div className="fee-stat-content">
          <span className="fee-stat-label">Total Collected</span>
          <span className="fee-stat-value">{formatCurrency(totalCollected)}</span>
          <span className="fee-stat-subtext">
            <i className="fa-solid fa-arrow-trend-up text-emerald-600 mr-1"></i>
            {collectionPercentage}% collection rate
          </span>
        </div>
      </div>

      <div className="fee-stat-card warning">
        <div className="fee-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-hourglass-half"></i>
        </div>
        <div className="fee-stat-content">
          <span className="fee-stat-label">Pending Dues</span>
          <span className="fee-stat-value">{formatCurrency(totalPending)}</span>
        </div>
      </div>

      <div className="fee-stat-card danger">
        <div className="fee-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div className="fee-stat-content">
          <span className="fee-stat-label">Overdue Amount</span>
          <span className="fee-stat-value">{formatCurrency(totalOverdue)}</span>
        </div>
      </div>
    </div>
  );
};

export default FeeSummaryCards;
