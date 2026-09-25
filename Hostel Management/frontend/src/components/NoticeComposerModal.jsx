import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './NoticeComposerModal.css';

const NoticeComposerModal = ({
  isOpen,
  onClose,
  noticeToEdit,
  userRole,
  onSuccess
}) => {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'GENERAL',
    target: 'ALL_HOSTELS',
    hostel_id: '',
    status: 'PUBLISHED',
    expires_at: ''
  });

  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch hostels list when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchHostels();
      if (noticeToEdit) {
        setFormData({
          title: noticeToEdit.title || '',
          description: noticeToEdit.description || '',
          priority: noticeToEdit.priority || 'GENERAL',
          target: noticeToEdit.hostel_id === null ? 'ALL_HOSTELS' : 'SPECIFIC_HOSTEL',
          hostel_id: noticeToEdit.hostel_id || '',
          status: noticeToEdit.status || 'PUBLISHED',
          expires_at: noticeToEdit.expires_at ? noticeToEdit.expires_at.split('T')[0] : ''
        });
      } else {
        setFormData({
          title: '',
          description: '',
          priority: 'GENERAL',
          target: isSuperAdmin ? 'ALL_HOSTELS' : 'SPECIFIC_HOSTEL',
          hostel_id: '',
          status: 'PUBLISHED',
          expires_at: ''
        });
      }
      setError(null);
    }
  }, [isOpen, noticeToEdit, userRole]);

  const fetchHostels = async () => {
    try {
      const res = await api.get('/hostels');
      const list = res.data || res.hostels || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setHostels(list);
        if (!isSuperAdmin && list.length > 0 && !formData.hostel_id) {
          setFormData(prev => ({ ...prev, hostel_id: list[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch hostels:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Notice title is required.');
      return;
    }
    if (formData.title.trim().length > 150) {
      setError('Title cannot exceed 150 characters.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Notice description is required.');
      return;
    }
    if (formData.target === 'SPECIFIC_HOSTEL' && !formData.hostel_id) {
      setError('Please select a specific hostel.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        target: formData.target,
        hostel_id: formData.target === 'SPECIFIC_HOSTEL' ? Number(formData.hostel_id) : null,
        status: formData.status,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
      };

      if (noticeToEdit) {
        await api.updateNotice(noticeToEdit.id, payload);
      } else {
        await api.createNotice(payload);
      }

      setLoading(false);
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to save notice. Please check your permissions.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notice-composer-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{noticeToEdit ? 'Edit Notice' : 'Publish New Notice'}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close"></button>
        </div>

        <form onSubmit={handleSubmit} className="composer-form">
          {error && <div className="form-error-banner">{error}</div>}

          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">Notice Title <span className="required-star">*</span></label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Water Tank Maintenance Schedule"
              maxLength={150}
              required
            />
            <span className="char-count">{formData.title.length} / 150</span>
          </div>

          {/* Priority & Status Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority Level</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="GENERAL">GENERAL</option>
                <option value="IMPORTANT">IMPORTANT</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Publishing Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="PUBLISHED"> Publish Immediately</option>
                <option value="DRAFT"> Save as Draft</option>
                {noticeToEdit && <option value="ARCHIVED"> Archive</option>}
              </select>
            </div>
          </div>

          {/* Target Scope */}
          <div className="form-group">
            <label>Target Audience</label>
            <div className="target-radio-group">
              {isSuperAdmin && (
                <label className="radio-option">
                  <input
                    type="radio"
                    name="target"
                    value="ALL_HOSTELS"
                    checked={formData.target === 'ALL_HOSTELS'}
                    onChange={handleChange}
                  />
                  <span> All Hostels (College-wide)</span>
                </label>
              )}

              <label className="radio-option">
                <input
                  type="radio"
                  name="target"
                  value="SPECIFIC_HOSTEL"
                  checked={formData.target === 'SPECIFIC_HOSTEL' || !isSuperAdmin}
                  onChange={handleChange}
                />
                <span> Specific Hostel</span>
              </label>
            </div>
            {!isSuperAdmin && (
              <p className="field-hint">Superintendents publish notices for their assigned hostel(s).</p>
            )}
          </div>

          {/* Hostel Dropdown (shown when SPECIFIC_HOSTEL is selected) */}
          {(formData.target === 'SPECIFIC_HOSTEL' || !isSuperAdmin) && (
            <div className="form-group">
              <label htmlFor="hostel_id">Select Target Hostel <span className="required-star">*</span></label>
              <select
                id="hostel_id"
                name="hostel_id"
                value={formData.hostel_id}
                onChange={handleChange}
                required
              >
                <option value="">-- Choose Hostel --</option>
                {hostels.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Expiration Date */}
          <div className="form-group">
            <label htmlFor="expires_at">Expiration Date (Optional)</label>
            <input
              type="date"
              id="expires_at"
              name="expires_at"
              value={formData.expires_at}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="field-hint">Expired notices automatically hide from active student lists while preserving history.</p>
          </div>

          {/* Description Textarea */}
          <div className="form-group">
            <label htmlFor="description">Notice Description <span className="required-star">*</span></label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder="Write clear, plain text announcement details here..."
              required
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : (noticeToEdit ? 'Save Changes' : 'Publish Notice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoticeComposerModal;
