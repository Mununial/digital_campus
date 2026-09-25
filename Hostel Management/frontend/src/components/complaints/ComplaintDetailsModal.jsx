import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ComplaintDetailsModal = ({ complaintId, isOpen, onClose, user, onUpdate }) => {
  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status Action Form State
  const [actionStatus, setActionStatus] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [actionResolution, setActionResolution] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Comment Form State
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchDetails = async () => {
    if (!complaintId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getComplaintById(complaintId);
      if (res.success) {
        setComplaint(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load complaint details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && complaintId) {
      fetchDetails();
      setActionStatus('');
      setActionComment('');
      setActionResolution('');
      setNewComment('');
    }
  }, [isOpen, complaintId]);

  if (!isOpen) return null;

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!actionStatus) return;

    try {
      setIsUpdatingStatus(true);
      setError(null);
      const res = await api.updateComplaintStatus(
        complaintId,
        actionStatus,
        actionComment,
        actionResolution
      );
      if (res.success) {
        setComplaint(res.data);
        setActionStatus('');
        setActionComment('');
        setActionResolution('');
        if (onUpdate) onUpdate(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleQuickClose = async () => {
    const reason = window.prompt('Please enter a closing note / confirmation:', 'Issue resolved / closed by user.');
    if (reason === null) return;

    try {
      setIsUpdatingStatus(true);
      setError(null);
      const res = await api.updateComplaintStatus(complaintId, 'CLOSED', reason);
      if (res.success) {
        setComplaint(res.data);
        if (onUpdate) onUpdate(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to close complaint');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteComplaint = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete Complaint #${complaintId}?`)) return;

    try {
      setIsUpdatingStatus(true);
      setError(null);
      const res = await api.deleteComplaint(complaintId);
      if (res.success) {
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete complaint');
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsSubmittingComment(true);
      setError(null);
      const res = await api.addComplaintComment(complaintId, newComment, isInternalComment);
      if (res.success) {
        setComplaint(res.data);
        setNewComment('');
        setIsInternalComment(false);
        if (onUpdate) onUpdate(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSelfAssign = async () => {
    try {
      setError(null);
      const res = await api.assignComplaint(complaintId, user.id);
      if (res.success) {
        setComplaint(res.data);
        if (onUpdate) onUpdate(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to assign complaint');
    }
  };

  const isStudent = user?.role === 'STUDENT';
  const isStaff = user?.role === 'SUPERINTENDENT' || user?.role === 'SUPER_ADMIN';
  const canDelete = isStaff || (isStudent && (complaint?.status === 'OPEN' || complaint?.status === 'CLOSED'));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container modal-lg complaint-details-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <span className="complaint-id-tag">Complaint #{complaintId}</span>
            <h2 className="modal-title">{complaint?.title || 'Complaint Details'}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {isLoading ? (
          <div className="modal-body text-center py-5">
            <div className="spinner"></div>
            <p className="mt-3 text-muted">Loading complaint details...</p>
          </div>
        ) : error ? (
          <div className="modal-body py-4">
            <div className="alert alert-danger">{error}</div>
            <button className="btn btn-secondary mt-3" onClick={onClose}>Close</button>
          </div>
        ) : complaint && (
          <div className="modal-body">
            {/* Overview Banner */}
            <div className="complaint-overview-box mb-4">
              <div className="overview-row">
                <div className="overview-item">
                  <span className="overview-label">Category</span>
                  <span className="overview-val">{complaint.category?.replace('_', ' ')}</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Priority</span>
                  <span className={`priority-tag priority-${complaint.priority?.toLowerCase()}`}>
                    {complaint.priority}
                  </span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Status</span>
                  <span className={`status-pill status-${complaint.status?.toLowerCase()}`}>
                    {complaint.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Assigned Staff</span>
                  <span className="overview-val">
                    {complaint.assigned_to_name ? ` ${complaint.assigned_to_name}` : 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="overview-row mt-3">
                <div className="overview-item">
                  <span className="overview-label">Submitted By</span>
                  <span className="overview-val">
                    {complaint.student_name} ({complaint.student_code || 'ID'})
                  </span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Hostel & Room</span>
                  <span className="overview-val">
                    {complaint.hostel_name} — Rm {complaint.room_number || 'N/A'} (Bed {complaint.bed_number || 'N/A'})
                  </span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Date Submitted</span>
                  <span className="overview-val">
                    {new Date(complaint.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="complaint-section mb-4">
              <h4 className="section-title"> Description</h4>
              <p className="description-text">{complaint.description}</p>
            </div>

            {/* Resolution Box if resolved/closed */}
            {complaint.resolution && (
              <div className="resolution-callout mb-4">
                <h4>✓ Resolution Summary</h4>
                <p>{complaint.resolution}</p>
                {complaint.resolved_at && (
                  <small className="text-muted">
                    Resolved at: {new Date(complaint.resolved_at).toLocaleString()}
                  </small>
                )}
              </div>
            )}

            {/* Actions Panel */}
            <div className="complaint-actions-panel mb-4">
              <div className="flex-between align-center mb-3">
                <h4 className="section-title m-0">Manage Complaint</h4>
                <div className="flex-gap">
                  {complaint.status !== 'CLOSED' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleQuickClose}
                      disabled={isUpdatingStatus}
                    >
                      Close Complaint
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={handleDeleteComplaint}
                      disabled={isUpdatingStatus}
                    >
                      Delete Complaint
                    </button>
                  )}
                </div>
              </div>

              {isStaff && !complaint.assigned_to && (
                <button 
                  className="btn btn-outline-primary mb-3"
                  onClick={handleSelfAssign}
                >
                   Assign Complaint to Me
                </button>
              )}

              <form onSubmit={handleStatusSubmit} className="status-action-form">
                <div className="form-row">
                  <div className="form-group col-half">
                    <label className="form-label">Change Status To</label>
                    <select
                      className="form-select"
                      value={actionStatus}
                      onChange={(e) => setActionStatus(e.target.value)}
                    >
                      <option value="">-- Select Status Transition --</option>
                      {isStaff && complaint.status === 'OPEN' && <option value="IN_PROGRESS">IN PROGRESS</option>}
                      {isStaff && complaint.status === 'IN_PROGRESS' && <option value="RESOLVED">RESOLVED</option>}
                      {isStaff && complaint.status !== 'CLOSED' && <option value="CLOSED">CLOSED</option>}
                      {isStaff && (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') && <option value="REOPENED">REOPEN</option>}
                      
                      {/* Student Options */}
                      {isStudent && complaint.status !== 'CLOSED' && <option value="CLOSED">CLOSE COMPLAINT (Issue Resolved / Cancel)</option>}
                      {isStudent && (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') && <option value="REOPENED">REOPEN COMPLAINT</option>}
                    </select>
                  </div>
                </div>

                {actionStatus === 'RESOLVED' && (
                  <div className="form-group mb-3">
                    <label className="form-label required">Resolution Details</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Explain how the issue was fixed, components replaced, or staff actions taken..."
                      value={actionResolution}
                      onChange={(e) => setActionResolution(e.target.value)}
                      required
                    />
                  </div>
                )}

                {actionStatus === 'REOPENED' && (
                  <div className="form-group mb-3">
                    <label className="form-label required">Reason for Reopening</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Explain why the resolution was unsatisfactory or why issue persists..."
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      required
                    />
                  </div>
                )}

                {actionStatus && actionStatus !== 'RESOLVED' && actionStatus !== 'REOPENED' && (
                  <div className="form-group mb-3">
                    <label className="form-label">Note / Remark (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional remark for status change..."
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                    />
                  </div>
                )}

                {actionStatus && (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? 'Updating Status...' : 'Apply Status Change'}
                  </button>
                )}
              </form>
            </div>

            {/* Comments & Discussion */}
            <div className="complaint-section mb-4">
              <h4 className="section-title"> Activity & Comments</h4>
              
              {complaint.comments?.length === 0 ? (
                <p className="empty-text">No comments yet on this complaint.</p>
              ) : (
                <div className="comments-list">
                  {complaint.comments.map((c) => (
                    <div key={c.id} className={`comment-bubble ${c.is_internal ? 'internal-comment' : ''}`}>
                      <div className="comment-header">
                        <span className="comment-author">
                          {c.author_name} ({c.author_role?.replace('_', ' ')})
                        </span>
                        {Boolean(c.is_internal) && <span className="internal-badge">INTERNAL NOTE</span>}
                        <span className="comment-time">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="comment-text">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="add-comment-form mt-3">
                <div className="form-group mb-2">
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Add a comment or reply..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                </div>
                <div className="comment-form-actions">
                  {isStaff && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                      />
                      <span>Internal staff note (hidden from student)</span>
                    </label>
                  )}
                  <button
                    type="submit"
                    className="btn btn-sm btn-secondary ml-auto"
                    disabled={isSubmittingComment || !newComment.trim()}
                  >
                    Post Comment
                  </button>
                </div>
              </form>
            </div>

            {/* History Audit Log */}
            <div className="complaint-section">
              <h4 className="section-title"> Audit Trail & History</h4>
              <ul className="audit-list">
                {complaint.history?.map((h) => (
                  <li key={h.id} className="audit-item">
                    <span className="audit-dot"></span>
                    <div className="audit-content">
                      <div className="audit-header">
                        <span className="audit-user">{h.changed_by_name} ({h.changed_by_role})</span>
                        <span className="audit-time">{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      <div className="audit-desc">
                        {h.old_status ? `${h.old_status} ➔ ${h.new_status}` : `Created as ${h.new_status}`}
                      </div>
                      {h.comment && <p className="audit-comment">"{h.comment}"</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailsModal;
