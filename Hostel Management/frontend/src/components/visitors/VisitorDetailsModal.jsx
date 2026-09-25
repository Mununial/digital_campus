import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function VisitorDetailsModal({ visitId, isOpen, onClose, userRole, onStatusChanged }) {
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionComment, setActionComment] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    if (isOpen && visitId) {
      fetchVisitDetails();
    }
  }, [isOpen, visitId]);

  const fetchVisitDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getVisitById(visitId);
      setVisit(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load visitor details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType) => {
    try {
      setSubmittingAction(true);
      setError(null);

      if (actionType === 'approve') {
        await api.approveVisit(visitId, actionComment);
      } else if (actionType === 'reject') {
        await api.rejectVisit(visitId, actionComment);
      } else if (actionType === 'cancel') {
        await api.cancelVisit(visitId, actionComment);
      } else if (actionType === 'checkIn') {
        await api.checkInVisit(visitId, actionComment);
      } else if (actionType === 'checkOut') {
        await api.checkOutVisit(visitId, actionComment);
      }

      setActionComment('');
      await fetchVisitDetails();
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      setError(err.message || `Failed to perform ${actionType} action.`);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-container visitor-details-modal">
        <div className="modal-header">
          <h2>Visitor Log Details #{visitId}</h2>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>

        {loading ? (
          <div className="modal-loading">Loading visitor details...</div>
        ) : error ? (
          <div className="form-error-alert">{error}</div>
        ) : visit ? (
          <div className="modal-content-scroll">
            <div className="details-header-card">
              <div className="details-title-group">
                <span className="visitor-type-tag">{visit.visitor_type}</span>
                <h3>{visit.visitor_name}</h3>
                <p className="visitor-phone-text"> {visit.visitor_phone} {visit.visitor_email && `| ️ ${visit.visitor_email}`}</p>
              </div>
              <div className="details-status-badge">
                <span className={`status-pill status-${visit.status.toLowerCase().replace('_', '-')}`}>
                  {visit.status}
                </span>
                {visit.is_overdue === 1 && <span className="overdue-badge">️ OVERDUE</span>}
              </div>
            </div>

            <div className="details-section">
              <h4> Student & Hostel Assignment</h4>
              <div className="details-grid-2col">
                <div><strong>Visiting Student:</strong> {visit.student_name} ({visit.student_code})</div>
                <div><strong>Student Contact:</strong> {visit.student_phone || 'N/A'}</div>
                <div><strong>Hostel:</strong> {visit.hostel_name}</div>
                <div><strong>Room & Bed:</strong> Room {visit.room_number || 'N/A'}, Bed {visit.bed_number || 'N/A'}</div>
                <div><strong>Branch / Year:</strong> {visit.student_branch || 'N/A'} (Year {visit.student_year || 'N/A'})</div>
              </div>
            </div>

            <div className="details-section">
              <h4> Verification & Schedule</h4>
              <div className="details-grid-2col">
                <div><strong>ID Document Type:</strong> {visit.identification_type}</div>
                <div><strong>ID Last 4 Digits:</strong> ••••{visit.identification_last4}</div>
                <div><strong>Visit Date:</strong> {visit.visit_date}</div>
                <div><strong>Purpose:</strong> {visit.purpose}</div>
                <div><strong>Expected Entry:</strong> {new Date(visit.expected_check_in).toLocaleString()}</div>
                <div><strong>Expected Exit:</strong> {new Date(visit.expected_check_out).toLocaleString()}</div>
                <div><strong>Actual Entry:</strong> {visit.actual_check_in ? new Date(visit.actual_check_in).toLocaleString() : 'Not Checked In'}</div>
                <div><strong>Actual Exit:</strong> {visit.actual_check_out ? new Date(visit.actual_check_out).toLocaleString() : 'Not Checked Out'}</div>
              </div>
            </div>

            {/* Quick Action Box */}
            <div className="details-action-box">
              <h4>Quick Actions</h4>
              <div className="action-comment-input">
                <input
                  type="text"
                  placeholder="Add optional note or remark..."
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  disabled={submittingAction}
                />
              </div>
              <div className="action-button-row">
                {userRole !== 'STUDENT' && visit.status === 'REQUESTED' && (
                  <>
                    <button type="button" className="btn-action btn-approve" onClick={() => handleAction('approve')} disabled={submittingAction}>
                      ✓ Approve Request
                    </button>
                    <button type="button" className="btn-action btn-reject" onClick={() => handleAction('reject')} disabled={submittingAction}>
                      ✕ Reject Request
                    </button>
                  </>
                )}

                {userRole !== 'STUDENT' && visit.status === 'APPROVED' && (
                  <button type="button" className="btn-action btn-checkin" onClick={() => handleAction('checkIn')} disabled={submittingAction}>
                     Confirm Check In
                  </button>
                )}

                {userRole !== 'STUDENT' && visit.status === 'CHECKED_IN' && (
                  <button type="button" className="btn-action btn-checkout" onClick={() => handleAction('checkOut')} disabled={submittingAction}>
                     Confirm Check Out
                  </button>
                )}

                {(visit.status === 'REQUESTED' || visit.status === 'APPROVED') && (
                  <button type="button" className="btn-action btn-cancel" onClick={() => handleAction('cancel')} disabled={submittingAction}>
                     Cancel Visit
                  </button>
                )}
              </div>
            </div>

            {/* Audit History Log */}
            <div className="details-section">
              <h4> Visitor Transition Audit Log</h4>
              {visit.history && visit.history.length > 0 ? (
                <div className="timeline-container">
                  {visit.history.map((h) => (
                    <div key={h.id} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-user"><strong>{h.changed_by_name}</strong> ({h.changed_by_role})</span>
                          <span className="timeline-time">{new Date(h.created_at).toLocaleString()}</span>
                        </div>
                        <div className="timeline-status-change">
                          {h.old_status ? `${h.old_status} ➔ ${h.new_status}` : `Status initialized as ${h.new_status}`}
                        </div>
                        {h.comment && <div className="timeline-comment">"{h.comment}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No status history recorded yet.</p>
              )}
            </div>
          </div>
        ) : null}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
