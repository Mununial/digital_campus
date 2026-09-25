import React, { useState, useEffect } from 'react';
import {
  updateMaintenanceStatus,
  assignMaintenanceStaff,
  updateMaintenancePriority,
  addMaintenanceUpdate,
  getTechnicians,
  assignTechnicianToMaintenance,
  upvoteMaintenanceRequest
} from '../../api/operations';
import '../../pages/MaintenancePage.css';

export default function MaintenanceDetailsModal({
  isOpen,
  onClose,
  request,
  onRefresh,
  isStaff = false,
  staffList = []
}) {
  const [newComment, setNewComment] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (isOpen && isStaff) {
      getTechnicians()
        .then(data => setTechnicians(data || []))
        .catch(() => {});
    }
  }, [isOpen, isStaff]);

  if (!isOpen || !request) return null;

  const handleStatusChange = async (targetStatus) => {
    setActionError(null);
    if (targetStatus === 'RESOLVED' && !resolutionNote.trim()) {
      setActionError('A resolution note is required when marking a request as resolved.');
      return;
    }
    setLoadingAction(true);
    try {
      await updateMaintenanceStatus(request.id, targetStatus, resolutionNote);
      setResolutionNote('');
      onRefresh();
    } catch (err) {
      setActionError(err.message || 'Failed to update status.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedAssignee) return;
    setActionError(null);
    setLoadingAction(true);
    try {
      await assignMaintenanceStaff(request.id, selectedAssignee);
      setSelectedAssignee('');
      onRefresh();
    } catch (err) {
      setActionError(err.message || 'Failed to assign staff.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAssignTechnician = async (e) => {
    e.preventDefault();
    if (!selectedTechnician) return;
    setActionError(null);
    setLoadingAction(true);
    try {
      await assignTechnicianToMaintenance(request.id, selectedTechnician);
      setSelectedTechnician('');
      onRefresh();
    } catch (err) {
      setActionError(err.message || 'Failed to assign technician.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpvote = async () => {
    setActionError(null);
    setLoadingAction(true);
    try {
      await upvoteMaintenanceRequest(request.id);
      onRefresh();
    } catch (err) {
      setActionError(err.message || 'Failed to upvote request.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePriorityChange = async (e) => {
    e.preventDefault();
    if (!selectedPriority) return;
    setActionError(null);
    setLoadingAction(true);
    try {
      await updateMaintenancePriority(request.id, selectedPriority, 'Staff priority adjustment');
      setSelectedPriority('');
      onRefresh();
    } catch (err) {
      setActionError(err.message || 'Failed to update priority.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setActionError(null);
    setLoadingAction(true);
    try {
      await addMaintenanceUpdate(request.id, newComment);
      setNewComment('');
      onRefresh();
    } catch (err) {
      setActionError(err.message || 'Failed to add update.');
    } finally {
      setLoadingAction(false);
    }
  };

  const getPriorityBadge = (p) => {
    const priorityKey = (p || 'LOW').toLowerCase();
    return <span className={`priority-pill priority-${priorityKey}`}>{p || 'LOW'}</span>;
  };

  const getStatusBadge = (s) => {
    const statusKey = (s || 'OPEN').toLowerCase();
    return <span className={`status-pill status-${statusKey}`}>{(s || 'OPEN').replace('_', ' ')}</span>;
  };


  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div 
        className="modal-dialog-custom"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="modal-header-custom">
          <h2 className="modal-title-custom">
            <span>Maintenance Request #{request.id}</span>
            <span className="badge-id" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
              {request.category}
            </span>
          </h2>
          <button 
            type="button" 
            className="modal-close-btn-custom" 
            onClick={onClose} 
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-custom">
          {actionError && (
            <div className="alert-error-custom">
              <span>️</span>
              <div>{actionError}</div>
            </div>
          )}

          <div className="modal-grid-2col">
            {/* Left Column: Details & Actions */}
            <div>
              {/* Request Status & Priority Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {getStatusBadge(request.status)}
                  {getPriorityBadge(request.priority)}
                </div>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                   Reported: {new Date(request.reported_at || request.created_at).toLocaleString()}
                </span>
              </div>

              {/* Title & Description Card */}
              <div className="info-card-box">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                  {request.title}
                </h3>
                <div className="info-label">Description</div>
                <p className="info-desc-text">{request.description}</p>
              </div>

              {/* Location & Metadata Grid */}
              <div className="info-meta-grid">
                <div>
                  <div className="meta-field-label">Assigned Hostel</div>
                  <div className="meta-field-value">{request.hostel_name || 'N/A'}</div>
                </div>
                <div>
                  <div className="meta-field-label">Room & Bed</div>
                  <div className="meta-field-value">
                    {request.room_number ? `Room ${request.room_number}` : 'N/A'} {request.bed_number ? `(Bed ${request.bed_number})` : ''}
                  </div>
                </div>
                <div>
                  <div className="meta-field-label">Reported By</div>
                  <div className="meta-field-value">{request.student_name || request.reporter_name || 'N/A'}</div>
                </div>
                <div>
                  <div className="meta-field-label">Assigned Staff</div>
                  <div className="meta-field-value">
                    {request.assignee_name ? ` ${request.assignee_name}` : <span style={{ color: '#94a3b8', fontWeight: 500 }}>Unassigned</span>}
                  </div>
                </div>
                <div>
                  <div className="meta-field-label">Assigned Technician</div>
                  <div className="meta-field-value">
                    {request.technician_name ? (
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>
                        👨‍🔧 {request.technician_name} {request.technician_phone ? `(${request.technician_phone})` : ''}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="meta-field-label">Community Upvotes</div>
                  <div className="meta-field-value" style={{ fontWeight: 700, color: '#d97706' }}>
                    👍 {request.upvote_count || 0} Upvotes
                  </div>
                </div>
                <div>
                  <div className="meta-field-label">Started At</div>
                  <div className="meta-field-value" style={{ fontWeight: 500 }}>
                    {request.started_at ? new Date(request.started_at).toLocaleString() : 'Not started'}
                  </div>
                </div>
                <div>
                  <div className="meta-field-label">Resolved At</div>
                  <div className="meta-field-value" style={{ fontWeight: 500 }}>
                    {request.resolved_at ? new Date(request.resolved_at).toLocaleString() : 'Unresolved'}
                  </div>
                </div>
              </div>

              {/* Existing Resolution Summary if already resolved */}
              {request.resolution_note && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                    ✓ Resolution Summary
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#14532d' }}>{request.resolution_note}</div>
                </div>
              )}

              {/* Actions & Workflow Panel */}
              <div className="workflow-actions-box">
                <h4 className="workflow-heading">Actions & Workflow Management</h4>

                {isStaff ? (
                  <>
                    {/* Technician Skill Assignment */}
                    <form onSubmit={handleAssignTechnician} className="workflow-inline-form">
                      <select
                        value={selectedTechnician}
                        onChange={(e) => setSelectedTechnician(e.target.value)}
                      >
                        <option value="">Select Technician to Assign...</option>
                        {technicians.map(t => (
                          <option key={t.id} value={t.id}>
                            👨‍🔧 {t.full_name} ({t.skill_category} • {t.rating}★ • {t.status})
                          </option>
                        ))}
                      </select>
                      <button 
                        type="submit" 
                        className="btn-action-outline"
                        style={{ borderColor: '#6366f1', color: '#4f46e5' }}
                        disabled={loadingAction || !selectedTechnician}
                      >
                        Assign Tech
                      </button>
                    </form>

                    {/* Staff Assignment */}
                    <form onSubmit={handleAssign} className="workflow-inline-form">
                      <select
                        value={selectedAssignee}
                        onChange={(e) => setSelectedAssignee(e.target.value)}
                      >
                        <option value="">Select Staff to Assign...</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.id}>{s.username} ({s.role})</option>
                        ))}
                      </select>
                      <button 
                        type="submit" 
                        className="btn-action-outline"
                        disabled={loadingAction || !selectedAssignee}
                      >
                        Assign Staff
                      </button>
                    </form>

                    {/* Priority Change */}
                    <form onSubmit={handlePriorityChange} className="workflow-inline-form">
                      <select
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value)}
                      >
                        <option value="">Elevate / Change Priority...</option>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                      <button 
                        type="submit" 
                        className="btn-action-outline"
                        style={{ borderColor: '#f59e0b', color: '#d97706' }}
                        disabled={loadingAction || !selectedPriority}
                      >
                        Set Priority
                      </button>
                    </form>

                    {/* Quick Status Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {request.status !== 'IN_PROGRESS' && request.status !== 'RESOLVED' && request.status !== 'CLOSED' && (
                        <button
                          type="button"
                          className="btn-action-outline"
                          style={{ borderColor: '#3b82f6', color: '#2563eb', background: '#eff6ff' }}
                          onClick={() => handleStatusChange('IN_PROGRESS')}
                          disabled={loadingAction}
                        >
                          Mark In Progress
                        </button>
                      )}

                      {request.status === 'RESOLVED' && (
                        <button
                          type="button"
                          className="btn-action-outline"
                          style={{ borderColor: '#475569', color: '#334155', background: '#f8fafc' }}
                          onClick={() => handleStatusChange('CLOSED')}
                          disabled={loadingAction}
                        >
                          Close Request
                        </button>
                      )}
                    </div>

                    {/* Resolution Form */}
                    {request.status !== 'RESOLVED' && request.status !== 'CLOSED' && (
                      <div className="resolution-panel">
                        <div className="resolution-panel-title">
                          ✓ Mark Resolved & Record Notes
                        </div>
                        <textarea
                          className="resolution-textarea"
                          rows="2"
                          placeholder="Describe work completed (e.g. Replaced faulty washer in tap / Fixed wiring)..."
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-resolve-success"
                          onClick={() => handleStatusChange('RESOLVED')}
                          disabled={loadingAction || !resolutionNote.trim()}
                        >
                          Confirm & Mark Resolved
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    {request.status !== 'RESOLVED' && request.status !== 'CLOSED' && (
                      <div style={{ marginBottom: '12px' }}>
                        <button
                          type="button"
                          className="btn-action-outline"
                          style={{ borderColor: '#d97706', color: '#b45309', background: '#fffbeb', width: '100%', justifyContent: 'center' }}
                          onClick={handleUpvote}
                          disabled={loadingAction}
                        >
                          <i className="fa-solid fa-thumbs-up mr-1"></i>
                          Upvote Request ({request.upvote_count || 0} Upvotes)
                        </button>
                      </div>
                    )}

                    {request.status === 'RESOLVED' && (
                      <div>
                        <button
                          type="button"
                          className="btn-action-outline"
                          style={{ borderColor: '#ef4444', color: '#dc2626', background: '#fef2f2' }}
                          onClick={() => handleStatusChange('REOPENED')}
                          disabled={loadingAction}
                        >
                          Reopen Request (Issue Not Fixed)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Updates & Timeline */}
            <div className="timeline-section">
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 Activity & Timeline History
              </h4>

              <div className="timeline-list">
                {request.updates && request.updates.length > 0 ? (
                  request.updates.map((u) => (
                    <div key={u.id} className="timeline-item-card">
                      <div className="timeline-item-header">
                        <div>
                          <span className="timeline-author">{u.user_name || 'Staff'}</span>
                          <span className="timeline-role-tag">{u.user_role || 'STAFF'}</span>
                        </div>
                        <span className="timeline-time">
                          {new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="timeline-message">{u.message}</p>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.86rem', fontStyle: 'italic', padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                    No timeline updates recorded yet.
                  </div>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="add-comment-box">
                <input
                  type="text"
                  className="add-comment-input"
                  placeholder="Add a progress update comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="btn-send-comment"
                  disabled={loadingAction || !newComment.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer-custom">
          <button 
            type="button" 
            className="filter-reset-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
