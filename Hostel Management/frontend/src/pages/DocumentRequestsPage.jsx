import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import becLogo from '../assets/BEC LOGO FINAL.png';
import './DocumentRequestsPage.css';

const DOC_TYPES = [
  { value: 'HOSTEL_BONAFIDE', label: 'Hostel Bonafide & Residence Certificate' },
  { value: 'FEE_STRUCTURE', label: 'Hostel Fee Structure Certificate' },
  { value: 'NO_DUES', label: 'No Dues Clearance Certificate' },
  { value: 'HOSTEL_RESIDENCE', label: 'Hostel Residence Proof' },
  { value: 'CHARACTER_CERTIFICATE', label: 'Hostel Conduct & Character Certificate' }
];

export default function DocumentRequestsPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'STUDENT';
  const isStaff = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'SUPERINTENDENT';

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ pending: 0, issued: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Form states
  const [applyForm, setApplyForm] = useState({
    document_type: 'HOSTEL_BONAFIDE',
    purpose: '',
    academic_session: '2026-2027',
    copies_requested: 1,
    remarks: ''
  });

  const [issueRemarks, setIssueRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.document_type = typeFilter;
      if (searchTerm) filters.search = searchTerm;

      const [reqRes, statsRes] = await Promise.all([
        api.getDocumentRequests(filters),
        api.getDocumentStats()
      ]);

      setRequests(reqRes.data || []);
      setStats(statsRes.data || { pending: 0, issued: 0, rejected: 0, total: 0 });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load document requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.requestDocument(applyForm);
      setSuccessMsg('Document / Certificate request submitted successfully!');
      setShowApplyModal(false);
      setApplyForm({
        document_type: 'HOSTEL_BONAFIDE',
        purpose: '',
        academic_session: '2026-2027',
        copies_requested: 1,
        remarks: ''
      });
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit document request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.approveAndIssueDocument(selectedDoc.id, issueRemarks);
      setSuccessMsg(`Certificate ${selectedDoc.request_number} approved and issued successfully!`);
      setShowIssueModal(false);
      setSelectedDoc(null);
      setIssueRemarks('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to issue certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.rejectDocumentRequest(selectedDoc.id, rejectionReason);
      setSuccessMsg(`Document Request ${selectedDoc.request_number} rejected.`);
      setShowRejectModal(false);
      setSelectedDoc(null);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reject request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this document request?')) return;
    try {
      await api.cancelDocumentRequest(id);
      setSuccessMsg('Document request cancelled.');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to cancel request.');
    }
  };

  const openIssueModal = (doc) => {
    setSelectedDoc(doc);
    setIssueRemarks('Verified active hostel resident, academic roll records, and fee clearance. Digital certificate issued.');
    setShowIssueModal(true);
  };

  const openRejectModal = (doc) => {
    setSelectedDoc(doc);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const openDetailModal = (doc) => {
    setSelectedDoc(doc);
    setShowDetailModal(true);
  };

  // Helper to render customized body text for all certificate types
  const renderCertificateBody = (doc) => {
    const issueDateFormatted = new Date(doc.issued_at || doc.updated_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    switch (doc.document_type) {
      case 'FEE_STRUCTURE':
        return (
          <>
            <div className="cert-body-content">
              This is to certify that Mr./Ms. <strong>{doc.student_name}</strong> (Roll No: <strong>{doc.roll_number}</strong>), Son/Daughter of <strong>{doc.father_name || 'N/A'}</strong>, is a regular resident student of <strong>{doc.hostel_name || 'BEC Hostel'}</strong> (Room No: <strong>{doc.room_number || '101'}</strong>, Bed: <strong>{doc.bed_number || 'A-1'}</strong>), pursuing <strong>{doc.course || 'B.Tech'} ({doc.branch || 'Engineering'})</strong> for the Academic Session <strong>{doc.academic_session || '2026-2027'}</strong>.
              <br /><br />
              The official hostel accommodation & catering fee structure applicable for the current academic session is detailed below:
            </div>

            <table className="fee-table-preview">
              <thead>
                <tr>
                  <th>Sl. No.</th>
                  <th>Fee Head / Particulars</th>
                  <th>Frequency</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>Hostel Accommodation & Utility Charges</td>
                  <td>Annual</td>
                  <td>₹30,000.00</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Hostel Mess & Dining Charges (4 Meals/Day)</td>
                  <td>Annual</td>
                  <td>₹30,000.00</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>Caution Deposit (Refundable)</td>
                  <td>One-Time</td>
                  <td>₹5,000.00</td>
                </tr>
                <tr style={{ fontWeight: 'bold', background: '#f8fafc' }}>
                  <td colSpan="3" style={{ textAlign: 'right' }}>Total Estimated Annual Expenditure:</td>
                  <td>₹65,000.00</td>
                </tr>
              </tbody>
            </table>

            <div className="cert-body-content" style={{ marginTop: '1rem' }}>
              This certificate is issued upon student's request for the official purpose of: <em>"{doc.purpose}"</em> (Bank Education Loan / Scholarship Application).
            </div>
          </>
        );

      case 'NO_DUES':
        return (
          <div className="cert-body-content">
            This is to certify that Mr./Ms. <strong>{doc.student_name}</strong> (Roll No: <strong>{doc.roll_number}</strong>), residing in <strong>{doc.hostel_name || 'BEC Hostel'}</strong>, Room No: <strong>{doc.room_number || '101'}</strong> (Bed No: <strong>{doc.bed_number || 'A-1'}</strong>), pursuing <strong>{doc.course || 'B.Tech'} ({doc.branch || 'Engineering'})</strong>, has cleared all hostel accommodation rent, electricity consumption, water charges, mess catering bills, and maintenance penalties for the Academic Session <strong>{doc.academic_session || '2026-2027'}</strong>.
            <br /><br />
            There are <strong>NIL OUTSTANDING DUES</strong> pending against the student in the hostel records as of <strong>{issueDateFormatted}</strong>.
            <br /><br />
            This No Dues Clearance Certificate is issued upon student's request for the official purpose of: <em>"{doc.purpose}"</em>.
          </div>
        );

      case 'HOSTEL_RESIDENCE':
        return (
          <div className="cert-body-content">
            This is to certify that Mr./Ms. <strong>{doc.student_name}</strong> (Roll No: <strong>{doc.roll_number}</strong>), Son/Daughter of <strong>{doc.father_name || 'N/A'}</strong>, is currently residing as a full-time inmate in <strong>{doc.hostel_name || 'BEC Hostel'}</strong>, Room No: <strong>{doc.room_number || '101'}</strong> (Bed: <strong>{doc.bed_number || 'A-1'}</strong>), located at Bhubaneswar Engineering College (BEC) Campus, Pitapalli, Bhubaneswar, Odisha.
            <br /><br />
            He/She has been a resident inmate of this hostel since <strong>August 2026</strong> for the Academic Session <strong>{doc.academic_session || '2026-2027'}</strong>.
            <br /><br />
            This document serves as official Proof of Residence for: <em>"{doc.purpose}"</em> (Passport Verification / Bank Account Opening / Government Documentation).
          </div>
        );

      case 'CHARACTER_CERTIFICATE':
        return (
          <div className="cert-body-content">
            This is to certify that Mr./Ms. <strong>{doc.student_name}</strong> (Roll No: <strong>{doc.roll_number}</strong>), a resident inmate of <strong>{doc.hostel_name || 'BEC Hostel'}</strong> (Room No: <strong>{doc.room_number || '101'}</strong>) during the Academic Session <strong>{doc.academic_session || '2026-2027'}</strong>, has maintained high standards of discipline, punctual night attendance, and exemplary moral conduct.
            <br /><br />
            No disciplinary warning, fine, or report of misconduct is registered against him/her in the hostel administration office.
            <br /><br />
            This Conduct & Character Certificate is issued upon student's request for the purpose of: <em>"{doc.purpose}"</em>. We wish him/her all success in future endeavors.
          </div>
        );

      case 'HOSTEL_BONAFIDE':
      default:
        return (
          <div className="cert-body-content">
            This is to certify that Mr./Ms. <strong>{doc.student_name}</strong> (Roll No: <strong>{doc.roll_number}</strong>), Son/Daughter of <strong>{doc.father_name || 'N/A'}</strong>, is a regular bonafide resident student of <strong>{doc.hostel_name || 'BEC Hostel'}</strong>, residing in Room No: <strong>{doc.room_number || '101'}</strong> (Bed No: <strong>{doc.bed_number || 'A-1'}</strong>) pursuing <strong>{doc.course || 'B.Tech'} ({doc.branch || 'Engineering'})</strong> for the Academic Session <strong>{doc.academic_session || '2026-2027'}</strong>.
            <br /><br />
            This certificate is issued upon student's request for the official purpose of: <em>"{doc.purpose}"</em>.
            <br /><br />
            During his/her stay in the hostel, his/her conduct and moral character have been found to be <strong>GOOD</strong>. He/She has cleared all mandatory hostel mess and accommodation dues up to the current academic term.
          </div>
        );
    }
  };

  return (
    <div className="doc-requests-container">
      {/* Banner Header */}
      <div className="doc-header-card">
        <div className="doc-header-content">
          <h1>📄 Certificate & Document Management Portal</h1>
          <p>Request, verify, approve, and download official digital hostel certificates with institution verification seals.</p>
        </div>
        {!isStaff && (
          <button className="btn-request-primary" onClick={() => setShowApplyModal(true)}>
            ➕ Request New Certificate
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', marginBottom: '1rem', fontWeight: 600 }}>⚠️ {errorMsg}</div>}
      {successMsg && <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '10px', marginBottom: '1rem', fontWeight: 600 }}>✅ {successMsg}</div>}

      {/* Statistics Cards */}
      <div className="doc-stats-grid">
        <div className="doc-stat-card pending">
          <div className="stat-info">
            <h3>Pending Verification</h3>
            <div className="stat-number">{stats.pending || 0}</div>
          </div>
          <div className="stat-icon-wrapper">⏳</div>
        </div>
        <div className="doc-stat-card issued">
          <div className="stat-info">
            <h3>Issued Certificates</h3>
            <div className="stat-number">{stats.issued || 0}</div>
          </div>
          <div className="stat-icon-wrapper">📜</div>
        </div>
        <div className="doc-stat-card rejected">
          <div className="stat-info">
            <h3>Rejected Requests</h3>
            <div className="stat-number">{stats.rejected || 0}</div>
          </div>
          <div className="stat-icon-wrapper">❌</div>
        </div>
        <div className="doc-stat-card total">
          <div className="stat-info">
            <h3>Total Applications</h3>
            <div className="stat-number">{stats.total || 0}</div>
          </div>
          <div className="stat-icon-wrapper">📁</div>
        </div>
      </div>

      {/* Filter and Controls */}
      <div className="doc-controls-card">
        <form onSubmit={handleSearchSubmit} className="doc-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by Request #, Cert #, Student Name, Roll No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <div className="doc-filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ISSUED">Issued</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Document Types</option>
            {DOC_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="doc-table-card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading document requests...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No document requests found.</div>
        ) : (
          <table className="doc-table">
            <thead>
              <tr>
                <th>Request Details</th>
                <th>Student Information</th>
                <th>Document Type</th>
                <th>Status</th>
                <th>Certificate Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{doc.request_number}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Requested: {new Date(doc.created_at).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{doc.student_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{doc.roll_number} ({doc.hostel_code || doc.hostel_name || 'Hostel'})</div>
                  </td>
                  <td>
                    <span className="doc-type-tag">
                      {DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-status ${doc.status}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td>
                    {doc.certificate_number ? (
                      <span className="cert-num-chip">📜 {doc.certificate_number}</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Not Issued</span>
                    )}
                  </td>
                  <td>
                    <div className="doc-actions">
                      <button className="btn-view" onClick={() => openDetailModal(doc)}>
                        👁️ View
                      </button>

                      {isStaff && doc.status === 'PENDING' && (
                        <>
                          <button className="btn-issue" onClick={() => openIssueModal(doc)}>
                            ✅ Issue & Approve
                          </button>
                          <button className="btn-reject" onClick={() => openRejectModal(doc)}>
                            ❌ Reject
                          </button>
                        </>
                      )}

                      {doc.status === 'ISSUED' && (
                        <button className="btn-print" onClick={() => openDetailModal(doc)}>
                          📜 Print / Download
                        </button>
                      )}

                      {!isStaff && doc.status === 'PENDING' && (
                        <button className="btn-cancel" onClick={() => handleCancelRequest(doc.id)}>
                          🚫 Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Apply Modal (Student Only) */}
      {showApplyModal && !isStaff && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📄 Request Official Certificate</h2>
              <button className="btn-close" onClick={() => setShowApplyModal(false)}>✕</button>
            </div>
            <form onSubmit={handleApplySubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Document / Certificate Type *</label>
                  <select
                    value={applyForm.document_type}
                    onChange={(e) => setApplyForm({ ...applyForm, document_type: e.target.value })}
                    required
                  >
                    {DOC_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Academic Session</label>
                  <input
                    type="text"
                    value={applyForm.academic_session}
                    onChange={(e) => setApplyForm({ ...applyForm, academic_session: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Purpose of Document Request *</label>
                  <textarea
                    rows="3"
                    placeholder="E.g., Bank Education Loan, Scholarship Application, Passport Verification..."
                    value={applyForm.purpose}
                    onChange={(e) => setApplyForm({ ...applyForm, purpose: e.target.value })}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowApplyModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue / Approval Modal (Staff Only) */}
      {showIssueModal && selectedDoc && isStaff && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📜 Approve & Issue Official Certificate</h2>
              <button className="btn-close" onClick={() => setShowIssueModal(false)}>✕</button>
            </div>
            <form onSubmit={handleIssueSubmit}>
              <div className="modal-body">
                <p style={{ margin: '0 0 1rem 0', color: '#334155' }}>
                  You are issuing official certificate for student <strong>{selectedDoc.student_name}</strong> (Roll No: <strong>{selectedDoc.roll_number}</strong>).
                </p>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '0.35rem' }}><strong>Request No:</strong> {selectedDoc.request_number}</div>
                  <div style={{ marginBottom: '0.35rem' }}><strong>Document Type:</strong> {DOC_TYPES.find(t => t.value === selectedDoc.document_type)?.label}</div>
                  <div><strong>Purpose:</strong> {selectedDoc.purpose}</div>
                </div>

                <div className="form-group">
                  <label>Approval & Issuance Remarks</label>
                  <textarea
                    rows="3"
                    value={issueRemarks}
                    onChange={(e) => setIssueRemarks(e.target.value)}
                    placeholder="Enter approval verification details..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn-issue" disabled={submitting}>
                  {submitting ? 'Issuing...' : '✅ Confirm & Issue Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal (Staff Only) */}
      {showRejectModal && selectedDoc && isStaff && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>❌ Reject Document Request</h2>
              <button className="btn-close" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Rejection Reason *</label>
                  <textarea
                    rows="3"
                    placeholder="Specify why this document request cannot be approved..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button type="submit" className="btn-reject" disabled={submitting}>
                  {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Official Printable Certificate Slip Modal */}
      {showDetailModal && selectedDoc && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h2>📜 {selectedDoc.status === 'ISSUED' ? 'Official A4 Certificate' : 'Request Details'}</h2>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {selectedDoc.status === 'ISSUED' ? (
                <div className="cert-document-wrapper">
                  <div className="cert-college-header">
                    <div className="cert-logo-box">
                      <img src={becLogo} alt="BEC Emblem Logo" />
                    </div>
                    <div className="cert-college-title">
                      <h2>BHUBANESHWAR ENGINEERING COLLEGE (BEC)</h2>
                      <div className="cert-sub-text">Approved by AICTE, New Delhi & Affiliated to BPUT, Odisha</div>
                      <div className="cert-dept">OFFICE OF THE HOSTEL SUPERINTENDENT</div>
                    </div>
                    <div style={{ width: '85px' }}></div>
                  </div>

                  <div className="cert-meta-bar">
                    <div>Ref No: <strong>{selectedDoc.certificate_number}</strong></div>
                    <div>Date: <strong>{new Date(selectedDoc.issued_at || selectedDoc.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                    <div>Session: <strong>{selectedDoc.academic_session || '2026-2027'}</strong></div>
                  </div>

                  <div className="cert-main-heading">
                    <h3>{DOC_TYPES.find(t => t.value === selectedDoc.document_type)?.label || selectedDoc.document_type}</h3>
                  </div>

                  {/* Render tailored body content for all 5 certificate types */}
                  {renderCertificateBody(selectedDoc)}

                  <div className="cert-signatures-section">
                    <div className="cert-stamp-badge">
                      ✓ OFFICIALLY VERIFIED & DIGITALLY ISSUED BY BEC HOSTEL AUTHORITY
                    </div>
                    <div className="cert-sign-box">
                      <div className="cert-sign-line">Hostel Superintendent</div>
                      <div className="sign-sub">BEC Bhubaneswar</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', color: '#0f172a' }}>Application Details</h3>
                    <div style={{ marginBottom: '0.4rem' }}><strong>Request Number:</strong> {selectedDoc.request_number}</div>
                    <div style={{ marginBottom: '0.4rem' }}><strong>Student Name:</strong> {selectedDoc.student_name} ({selectedDoc.roll_number})</div>
                    <div style={{ marginBottom: '0.4rem' }}><strong>Document Type:</strong> {DOC_TYPES.find(t => t.value === selectedDoc.document_type)?.label}</div>
                    <div style={{ marginBottom: '0.4rem' }}><strong>Purpose:</strong> {selectedDoc.purpose}</div>
                    <div style={{ marginBottom: '0.4rem' }}><strong>Status:</strong> <span className={`badge-status ${selectedDoc.status}`}>{selectedDoc.status}</span></div>
                    {selectedDoc.rejection_reason && (
                      <div style={{ color: '#dc2626', marginTop: '0.5rem' }}><strong>Rejection Reason:</strong> {selectedDoc.rejection_reason}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selectedDoc.status === 'ISSUED' && (
                <button type="button" className="btn-print" onClick={() => window.print()}>
                  🖨️ Print / Download A4 Certificate
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
