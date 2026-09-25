import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import FeeSummaryCards from '../components/fees/FeeSummaryCards';
import FeeCard from '../components/fees/FeeCard';
import FeeStructureModal from '../components/fees/FeeStructureModal';
import AssignFeeModal from '../components/fees/AssignFeeModal';
import RecordPaymentModal from '../components/fees/RecordPaymentModal';
import FeeWaiverModal from '../components/fees/FeeWaiverModal';
import FeeReceiptModal from '../components/fees/FeeReceiptModal';
import FeeDetailsModal from '../components/fees/FeeDetailsModal';
import './FeeManagementPage.css';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const FeeManagementPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isStudent = user?.role === 'STUDENT';
  const isStaff = isSuperAdmin || user?.role === 'SUPERINTENDENT';

  const [activeTab, setActiveTab] = useState(isStudent ? 'my_fees' : 'student_fees');
  const [summary, setSummary] = useState(null);
  const [studentFees, setStudentFees] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [payments, setPayments] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [students, setStudents] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2026-27');

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals state
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
  const [isWaiverModalOpen, setIsWaiverModalOpen] = useState(false);
  const [selectedFeeForWaiver, setSelectedFeeForWaiver] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedFeeDetail, setSelectedFeeDetail] = useState(null);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.getFeeSummary(selectedHostel ? { hostel_id: selectedHostel } : {});
      if (res.success || res.data) setSummary(res.data || res);
    } catch (err) {
      console.error('Failed to fetch fee summary:', err);
    }
  }, [selectedHostel]);

  // Fetch Student Fees
  const fetchStudentFees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (isStudent) {
        const res = await api.getMyFees();
        if (res.success || res.data) {
          setStudentFees(res.fees || res.data?.fees || res.data || []);
          if (res.summary) setSummary(res.summary);
        }
      } else {
        const params = {
          search,
          hostel_id: selectedHostel || undefined,
          status: selectedStatus || undefined,
          fee_type: selectedFeeType || undefined,
          academic_year: selectedAcademicYear || undefined
        };
        const res = await api.getStudentFees(params);
        if (res.success || res.data) {
          setStudentFees(res.fees || res.data?.fees || res.data || []);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load fee records.');
    } finally {
      setLoading(false);
    }
  }, [isStudent, search, selectedHostel, selectedStatus, selectedFeeType, selectedAcademicYear]);

  // Fetch Fee Structures
  const fetchFeeStructures = useCallback(async () => {
    try {
      const res = await api.getFeeStructures({ hostel_id: selectedHostel || undefined });
      if (res.success || res.data) setFeeStructures(res.data || []);
    } catch (err) {
      console.error('Failed to fetch structures:', err);
    }
  }, [selectedHostel]);

  // Fetch Payments Ledger
  const fetchPayments = useCallback(async () => {
    try {
      const res = await api.getPayments({ hostel_id: selectedHostel || undefined, search });
      if (res.success || res.data) setPayments(res.payments || res.data?.payments || res.data || []);
    } catch (err) {
      console.error('Failed to fetch payments ledger:', err);
    }
  }, [selectedHostel, search]);

  // Initial Data Loading
  useEffect(() => {
    const loadInitial = async () => {
      try {
        if (isStaff) {
          const [hRes, sRes] = await Promise.all([
            api.get('/hostels').catch(() => []),
            api.get('/students').catch(() => [])
          ]);
          const hList = hRes.data || (Array.isArray(hRes) ? hRes : []);
          const sList = sRes.data?.students || sRes.students || (Array.isArray(sRes.data) ? sRes.data : (Array.isArray(sRes) ? sRes : []));
          setHostels(hList);
          setStudents(sList);
        }
      } catch (err) {
        console.error('Failed initial metadata load:', err);
      }
    };
    loadInitial();
  }, [isStaff]);

  useEffect(() => {
    fetchSummary();
    if (activeTab === 'student_fees' || activeTab === 'my_fees') {
      fetchStudentFees();
    } else if (activeTab === 'structures') {
      fetchFeeStructures();
    } else if (activeTab === 'payments') {
      fetchPayments();
    }
  }, [activeTab, fetchSummary, fetchStudentFees, fetchFeeStructures, fetchPayments]);

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Handlers for Modals
  const handleCreateStructure = async (formData) => {
    await api.createFeeStructure(formData);
    showToast('Fee structure created successfully!');
    fetchFeeStructures();
  };

  const handleAssignFee = async (formData) => {
    await api.assignStudentFee(formData);
    showToast('Fee assigned successfully!');
    fetchStudentFees();
    fetchSummary();
  };

  const handleRecordPayment = async (paymentData) => {
    const res = await api.recordPayment(paymentData);
    showToast(`Payment recorded successfully! Receipt: ${res.data?.receipt_number || ''}`);
    fetchStudentFees();
    fetchSummary();
    if (res.data?.data) {
      setReceiptData(res.data.data);
      setIsReceiptModalOpen(true);
    }
  };

  const handleWaiveFee = async (feeId, waiverReason) => {
    await api.waiveStudentFee(feeId, waiverReason);
    showToast('Student fee waived successfully!');
    fetchStudentFees();
    fetchSummary();
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await api.getPaymentReceipt(paymentId);
      if (res.data?.success) {
        setReceiptData(res.data.data);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load receipt.');
    }
  };

  const handleViewFeeDetails = async (feeId) => {
    try {
      const res = await api.getStudentFeeById(feeId);
      if (res.data?.success) {
        setSelectedFeeDetail(res.data.data);
        setIsDetailsModalOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load fee details.');
    }
  };

  const handleToggleStructureStatus = async (id, currentStatus) => {
    try {
      await api.toggleFeeStructureStatus(id, !currentStatus);
      showToast(`Fee structure ${!currentStatus ? 'activated' : 'deactivated'}!`);
      fetchFeeStructures();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  return (
    <div className="fee-management-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Hostel Fees & Payment Management</h1>
          <p className="page-subtitle">
            {isStudent
              ? 'View your assigned hostel dues, payment status, and download official receipts.'
              : 'Define fee structures, track student dues, record payments, and manage financial ledgers.'}
          </p>
        </div>

        {isStaff && (
          <div className="page-actions">
            <button className="btn-primary" onClick={() => setIsAssignModalOpen(true)}>
              Assign Fee
            </button>
            <button className="btn-secondary" onClick={() => setIsStructureModalOpen(true)}>
              + New Structure
            </button>
          </div>
        )}
      </div>

      {successMessage && <div className="toast-success-banner">{successMessage}</div>}
      {error && <div className="toast-error-banner">{error}</div>}

      {/* Financial Summary Cards */}
      <FeeSummaryCards summary={summary} isStudent={isStudent} />

      {/* Navigation Tabs */}
      <div className="fee-navigation-tabs">
        {isStudent ? (
          <button
            className={`tab-link ${activeTab === 'my_fees' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_fees')}
          >
            My Fee Dues & Payments
          </button>
        ) : (
          <>
            <button
              className={`tab-link ${activeTab === 'student_fees' ? 'active' : ''}`}
              onClick={() => setActiveTab('student_fees')}
            >
              Student Fee Dues ({studentFees.length})
            </button>
            <button
              className={`tab-link ${activeTab === 'structures' ? 'active' : ''}`}
              onClick={() => setActiveTab('structures')}
            >
              Fee Structures ({feeStructures.length})
            </button>
            <button
              className={`tab-link ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              Payment Ledger ({payments.length})
            </button>
          </>
        )}
      </div>

      {/* Filters Bar */}
      <div className="fee-filters-bar">
        {!isStudent && (
          <div className="filter-input-wrapper">
            <span className="search-icon"></span>
            <input
              type="text"
              placeholder="Search student name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {isStaff && (
          <select
            className="filter-select"
            value={selectedHostel}
            onChange={(e) => setSelectedHostel(e.target.value)}
          >
            <option value="">All Hostels</option>
            {hostels.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )}

        {activeTab === 'student_fees' && (
          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="WAIVED">WAIVED</option>
          </select>
        )}

        <select
          className="filter-select"
          value={selectedFeeType}
          onChange={(e) => setSelectedFeeType(e.target.value)}
        >
          <option value="">All Fee Types</option>
          <option value="HOSTEL_FEE">Hostel Fee</option>
          <option value="MESS_FEE">Mess Fee</option>
          <option value="MAINTENANCE_FEE">Maintenance Fee</option>
          <option value="SECURITY_DEPOSIT">Security Deposit</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading financial records...</p>
        </div>
      ) : (
        <>
          {/* TAB 1 & MY FEES: Student Fee Dues View */}
          {(activeTab === 'student_fees' || activeTab === 'my_fees') && (
            <div className="tab-content">
              {studentFees.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"></div>
                  <h3>No Fee Records Found</h3>
                  <p>No fee dues match your current filter selection.</p>
                </div>
              ) : (
                <>
                  {/* Mobile & Tablet Card Grid View */}
                  <div className="fee-card-grid">
                    {studentFees.map(fee => (
                      <FeeCard
                        key={fee.id}
                        fee={fee}
                        userRole={user?.role}
                        onRecordPayment={(f) => {
                          setSelectedFeeForPayment(f);
                          setIsPaymentModalOpen(true);
                        }}
                        onViewDetails={(id) => handleViewFeeDetails(id)}
                        onWaiveFee={(f) => {
                          setSelectedFeeForWaiver(f);
                          setIsWaiverModalOpen(true);
                        }}
                      />
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="desktop-table-container">
                    <table className="fee-table">
                      <thead>
                        <tr>
                          {isStaff && <th>Student</th>}
                          <th>Hostel & Room</th>
                          <th>Fee Particulars</th>
                          <th>Assigned Amount</th>
                          <th>Paid Amount</th>
                          <th>Remaining</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentFees.map(fee => (
                          <tr key={fee.id} className={fee.status === 'OVERDUE' ? 'row-overdue' : ''}>
                            {isStaff && (
                              <td>
                                <div className="student-info-cell">
                                  <span className="name">{fee.student_name}</span>
                                  <span className="code font-mono">{fee.student_code}</span>
                                </div>
                              </td>
                            )}
                            <td>{fee.hostel_name} - {fee.room_number || 'N/A'}</td>
                            <td>
                              <div className="fee-type-cell">
                                <strong>{fee.fee_name || fee.fee_type}</strong>
                                <span className="subtext">{fee.academic_year}</span>
                              </div>
                            </td>
                            <td className="bold">{formatCurrency(fee.amount)}</td>
                            <td className="text-success bold">{formatCurrency(fee.paid_amount)}</td>
                            <td className={`bold ${fee.remaining_amount > 0 ? 'text-danger' : 'text-success'}`}>
                              {formatCurrency(fee.remaining_amount)}
                            </td>
                            <td>{new Date(fee.due_date).toLocaleDateString('en-IN')}</td>
                            <td>
                              <span className={`status-pill status-${fee.status.toLowerCase()}`}>
                                {fee.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-group">
                                <button
                                  className="btn-sm secondary"
                                  onClick={() => handleViewFeeDetails(fee.id)}
                                >
                                  History
                                </button>
                                {isStaff && fee.remaining_amount > 0 && fee.status !== 'PAID' && fee.status !== 'WAIVED' && (
                                  <button
                                    className="btn-sm primary"
                                    onClick={() => {
                                      setSelectedFeeForPayment(fee);
                                      setIsPaymentModalOpen(true);
                                    }}
                                  >
                                    Pay
                                  </button>
                                )}
                                {isSuperAdmin && fee.status !== 'PAID' && fee.status !== 'WAIVED' && (
                                  <button
                                    className="btn-sm danger"
                                    onClick={() => {
                                      setSelectedFeeForWaiver(fee);
                                      setIsWaiverModalOpen(true);
                                    }}
                                  >
                                    Waive
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: Fee Structures */}
          {activeTab === 'structures' && isStaff && (
            <div className="tab-content">
              {feeStructures.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"></div>
                  <h3>No Fee Structures Configured</h3>
                  <p>Click "New Structure" to create reusable fee rules for hostels.</p>
                </div>
              ) : (
                <div className="structures-grid">
                  {feeStructures.map(fs => (
                    <div key={fs.id} className={`structure-card ${!fs.is_active ? 'inactive' : ''}`}>
                      <div className="struct-header">
                        <div>
                          <h4 className="struct-name">{fs.name}</h4>
                          <span className="struct-hostel">{fs.hostel_name || 'Global'}</span>
                        </div>
                        <span className={`status-pill ${fs.is_active ? 'status-active' : 'status-pending'}`}>
                          {fs.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>

                      <div className="struct-body">
                        <div className="struct-amount">{formatCurrency(fs.amount)}</div>
                        <div className="struct-details">
                          <span>{fs.fee_type}</span> • <span>{fs.frequency}</span> • <span>{fs.academic_year}</span>
                        </div>
                        {fs.description && <p className="struct-desc">{fs.description}</p>}
                      </div>

                      <div className="struct-footer">
                        <span className="struct-creator">Created by {fs.creator_name || 'Admin'}</span>
                        <button
                          className={`btn-toggle-status ${fs.is_active ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleStructureStatus(fs.id, fs.is_active)}
                        >
                          {fs.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Payment Ledger */}
          {activeTab === 'payments' && isStaff && (
            <div className="tab-content">
              {payments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"></div>
                  <h3>No Payment Records</h3>
                  <p>Recorded payment receipts will appear here.</p>
                </div>
              ) : (
                <div className="desktop-table-container">
                  <table className="fee-table">
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Student</th>
                        <th>Hostel</th>
                        <th>Fee Particulars</th>
                        <th>Amount Paid</th>
                        <th>Method</th>
                        <th>Txn Ref</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td className="font-mono bold text-primary">{p.receipt_number}</td>
                          <td>
                            <div className="student-info-cell">
                              <span className="name">{p.student_name}</span>
                              <span className="code font-mono">{p.student_code}</span>
                            </div>
                          </td>
                          <td>{p.hostel_name}</td>
                          <td>{p.fee_name || p.fee_type}</td>
                          <td className="bold text-success">{formatCurrency(p.amount)}</td>
                          <td><span className="method-badge">{p.payment_method}</span></td>
                          <td className="font-mono small-text">{p.transaction_reference || 'N/A'}</td>
                          <td>{new Date(p.payment_date || p.created_at).toLocaleDateString('en-IN')}</td>
                          <td>
                            <button
                              className="btn-sm secondary"
                              onClick={() => handleViewReceipt(p.id)}
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <FeeStructureModal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        onSubmit={handleCreateStructure}
        hostels={hostels}
        isSuperAdmin={isSuperAdmin}
      />

      <AssignFeeModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSubmit={handleAssignFee}
        feeStructures={feeStructures}
        students={students}
        hostels={hostels}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handleRecordPayment}
        fee={selectedFeeForPayment}
      />

      <FeeWaiverModal
        isOpen={isWaiverModalOpen}
        onClose={() => setIsWaiverModalOpen(false)}
        onSubmit={handleWaiveFee}
        fee={selectedFeeForWaiver}
      />

      <FeeReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receiptData}
      />

      <FeeDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        feeDetail={selectedFeeDetail}
        onViewReceipt={handleViewReceipt}
      />
    </div>
  );
};

export default FeeManagementPage;
