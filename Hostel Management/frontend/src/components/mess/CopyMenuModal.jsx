import React, { useState } from 'react';

const DAYS = [
  { name: 'Monday', offset: 0 },
  { name: 'Tuesday', offset: 1 },
  { name: 'Wednesday', offset: 2 },
  { name: 'Thursday', offset: 3 },
  { name: 'Friday', offset: 4 },
  { name: 'Saturday', offset: 5 },
  { name: 'Sunday', offset: 6 }
];

/**
 * CopyMenuModal - Staff modal to copy a day's menu to other days of the week.
 */
const CopyMenuModal = ({ isOpen, onClose, onCopy, weeklyData }) => {
  const [sourceDayIndex, setSourceDayIndex] = useState(0); // Default Monday
  const [selectedTargetOffsets, setSelectedTargetOffsets] = useState([1, 2, 3, 4, 5, 6]); // Default Tue-Sun
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Compute dates for days based on weeklyData.startDate
  const getDatesMap = () => {
    if (!weeklyData || !weeklyData.startDate) return [];
    try {
      const parts = String(weeklyData.startDate).substring(0, 10).split('-').map(Number);
      const monday = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);

      return DAYS.map((d, idx) => {
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + idx);
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        return {
          ...d,
          dateStr: `${yyyy}-${mm}-${dd}`
        };
      });
    } catch (e) {
      return DAYS.map(d => ({ ...d, dateStr: '' }));
    }
  };

  const daysWithDates = getDatesMap();
  const sourceDayObj = daysWithDates[sourceDayIndex] || daysWithDates[0];

  const handleToggleTarget = (offset) => {
    if (selectedTargetOffsets.includes(offset)) {
      setSelectedTargetOffsets(prev => prev.filter(o => o !== offset));
    } else {
      setSelectedTargetOffsets(prev => [...prev, offset]);
    }
  };

  const handleSelectAll = () => {
    const allOtherOffsets = DAYS.map((_, idx) => idx).filter(idx => idx !== sourceDayIndex);
    if (selectedTargetOffsets.length === allOtherOffsets.length) {
      setSelectedTargetOffsets([]);
    } else {
      setSelectedTargetOffsets(allOtherOffsets);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTargetOffsets.length === 0) {
      setError('Please select at least one target day to copy to.');
      return;
    }

    const targetDateStrs = selectedTargetOffsets.map(idx => daysWithDates[idx]?.dateStr).filter(Boolean);

    try {
      setSubmitting(true);
      setError('');
      await onCopy({
        sourceDate: sourceDayObj.dateStr,
        targetDates: targetDateStrs
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to copy menu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header flex-between align-center">
          <div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-copy text-indigo-600"></i>
              Copy Day Menu to Other Days
            </h3>
            <p className="modal-sub">Apply Monday or any day's food menu across multiple days in 1 click</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            {error && <div className="alert alert-danger mb-3">{error}</div>}

            <div className="form-group mb-4">
              <label className="form-label required" style={{ fontWeight: 600 }}>Source Day (Menu to copy from):</label>
              <select
                className="form-select"
                value={sourceDayIndex}
                onChange={(e) => {
                  const newSourceIdx = parseInt(e.target.value, 10);
                  setSourceDayIndex(newSourceIdx);
                  // Remove source day from target offsets
                  setSelectedTargetOffsets(prev => prev.filter(o => o !== newSourceIdx));
                }}
              >
                {daysWithDates.map((d, idx) => (
                  <option key={d.name} value={idx}>
                    {d.name} ({d.dateStr})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group mb-3">
              <div className="flex-between align-center mb-2">
                <label className="form-label required" style={{ fontWeight: 600, marginBottom: 0 }}>
                  Target Days (Copy to):
                </label>
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={handleSelectAll}
                  style={{ fontSize: '0.82rem', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  {selectedTargetOffsets.length === DAYS.length - 1 ? 'Deselect All' : 'Select All Days'}
                </button>
              </div>

              <div className="target-days-checkboxes" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {daysWithDates.map((d, idx) => {
                  const isSource = idx === sourceDayIndex;
                  const isChecked = selectedTargetOffsets.includes(idx);

                  return (
                    <label
                      key={d.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: isSource ? '#e2e8f0' : (isChecked ? '#e0e7ff' : '#ffffff'),
                        border: isChecked ? '1px solid #818cf8' : '1px solid #cbd5e1',
                        cursor: isSource ? 'not-allowed' : 'pointer',
                        opacity: isSource ? 0.6 : 1
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={isSource}
                        checked={isChecked && !isSource}
                        onChange={() => handleToggleTarget(idx)}
                      />
                      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                        {d.name} {isSource ? '(Source)' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Copying Menu...' : `✓ Copy to ${selectedTargetOffsets.length} Days`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CopyMenuModal;
