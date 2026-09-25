import React, { useState, useEffect } from 'react';
import { createMaintenanceRequest, checkDuplicateRequests, upvoteMaintenanceRequest } from '../../api/operations';
import '../../pages/MaintenancePage.css';

const CATEGORIES = [
  'ELECTRICAL', 'PLUMBING', 'FURNITURE', 'BED', 'ROOM',
  'BATHROOM', 'CLEANING', 'INTERNET', 'SAFETY', 'OTHER'
];

export default function MaintenanceFormModal({
  isOpen,
  onClose,
  onSuccess,
  isStaff = false,
  hostels = [],
  prefill = null
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    priority: 'MEDIUM',
    hostel_id: '',
    floor_id: '',
    room_id: '',
    bed_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [upvoteSuccessMsg, setUpvoteSuccessMsg] = useState(null);

  useEffect(() => {
    if (prefill) {
      setFormData(prev => ({
        ...prev,
        category: prefill.category || 'OTHER',
        hostel_id: prefill.hostel_id || '',
        floor_id: prefill.floor_id || '',
        room_id: prefill.room_id || '',
        title: prefill.title || '',
        description: prefill.description || ''
      }));
    }
  }, [prefill]);

  // Real-Time Duplicate Check debounce
  useEffect(() => {
    if (!isOpen || (!formData.title && !formData.category)) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await checkDuplicateRequests({
          title: formData.title,
          category: formData.category,
          room_id: formData.room_id,
          hostel_id: formData.hostel_id
        });
        setDuplicates(res || []);
      } catch (err) {
        // Silently handle duplicate check error
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.title, formData.category, formData.room_id, formData.hostel_id, isOpen]);

  const handleUpvoteExisting = async (reqId) => {
    try {
      await upvoteMaintenanceRequest(reqId);
      setUpvoteSuccessMsg('Successfully upvoted existing ticket! Wardens have been notified.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to upvote ticket.');
    }
  };

  if (!isOpen) return null;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createMaintenanceRequest(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit maintenance request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div 
        className="modal-dialog-custom" 
        style={{ maxWidth: '680px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" 
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="modal-header-custom">
          <h2 className="modal-title-custom">
            <span> {prefill ? 'Create Maintenance from Inspection' : 'Submit Maintenance Request'}</span>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body-custom">
            {upvoteSuccessMsg && (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-circle-check text-green-600 text-lg"></i>
                <div style={{ fontWeight: 600 }}>{upvoteSuccessMsg}</div>
              </div>
            )}

            {error && (
              <div className="alert-error-custom">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <div>{error}</div>
              </div>
            )}

            {/* Real-time Duplicate Banner */}
            {duplicates.length > 0 && !upvoteSuccessMsg && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '0.88rem', marginBottom: '8px' }}>
                  <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                  Potential Duplicate Ticket(s) Detected in Your Room/Category
                </div>
                <p style={{ color: '#92400e', fontSize: '0.82rem', margin: '0 0 10px 0' }}>
                  Instead of creating a duplicate ticket, you can upvote an open issue below to prioritize its repair:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {duplicates.map(d => (
                    <div key={d.id} style={{ background: '#ffffff', border: '1px solid #fef3c7', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                          #{d.id} {d.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {d.hostel_name} {d.room_number ? `• Room ${d.room_number}` : ''} ({d.category}) • Upvotes: <strong>{d.upvote_count || 0}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-action-outline"
                        style={{ borderColor: '#d97706', color: '#b45309', background: '#fef3c7', fontSize: '0.78rem', padding: '4px 10px' }}
                        onClick={() => handleUpvoteExisting(d.id)}
                      >
                        <i className="fa-solid fa-thumbs-up mr-1"></i> Upvote Existing
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Title & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Issue Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="filter-search-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="e.g. Broken ceiling fan / Leaking tap"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Detailed Description <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className="resolution-textarea"
                rows="3"
                placeholder="Provide detailed description of the physical maintenance or repair required..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Priority & Hostel (if Staff) */}
            <div style={{ display: 'grid', gridTemplateColumns: isStaff ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Priority Level
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  {isStaff && <option value="URGENT">URGENT (Staff Elevation)</option>}
                </select>
                {!isStaff && (
                  <small style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                    Students can set Low/Medium/High. Staff will elevate to Urgent if needed.
                  </small>
                )}
              </div>

              {isStaff && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Assigned Hostel <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={formData.hostel_id}
                    onChange={(e) => setFormData({ ...formData, hostel_id: e.target.value })}
                    required={isStaff}
                  >
                    <option value="">Select Hostel</option>
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!isStaff && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem' }}>
                Location details (Hostel, Room, Bed) will be automatically assigned from your current active room allocation.
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer-custom">
            <button 
              type="button" 
              className="filter-reset-btn"
              onClick={onClose} 
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary-gradient"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Maintenance Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
