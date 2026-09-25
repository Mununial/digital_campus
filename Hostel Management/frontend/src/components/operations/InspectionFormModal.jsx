import React, { useState, useEffect } from 'react';
import { createInspection } from '../../api/operations';
import '../../pages/MaintenancePage.css';

const CONDITION_OPTIONS = [
  { value: 'GOOD', label: 'Good (Normal)', color: '#16a34a', bg: '#dcfce7' },
  { value: 'ATTENTION_REQUIRED', label: 'Attention Required', color: '#d97706', bg: '#fef3c7' },
  { value: 'CRITICAL', label: 'Critical Issue', color: '#dc2626', bg: '#fee2e2' }
];

export default function InspectionFormModal({
  isOpen,
  onClose,
  onSuccess,
  hostels = [],
  onOpenMaintenanceWithPrefill
}) {
  const [formData, setFormData] = useState({
    hostel_id: '',
    floor_id: '',
    room_id: '',
    inspection_date: new Date().toISOString().split('T')[0],
    cleanliness_status: 'GOOD',
    electrical_status: 'GOOD',
    plumbing_status: 'GOOD',
    furniture_status: 'GOOD',
    bed_status: 'GOOD',
    safety_status: 'GOOD',
    remarks: ''
  });
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (formData.hostel_id) {
      const selectedHostel = hostels.find(h => String(h.id) === String(formData.hostel_id));
      if (selectedHostel && selectedHostel.floors) {
        setFloors(selectedHostel.floors);
      } else {
        setFloors(prev => (prev.length > 0 ? [] : prev));
      }
    } else {
      setFloors(prev => (prev.length > 0 ? [] : prev));
      setRooms(prev => (prev.length > 0 ? [] : prev));
    }
  }, [formData.hostel_id, hostels, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (formData.floor_id) {
      const selectedFloor = floors.find(f => String(f.id) === String(formData.floor_id));
      if (selectedFloor && selectedFloor.rooms) {
        setRooms(selectedFloor.rooms);
      } else {
        setRooms(prev => (prev.length > 0 ? [] : prev));
      }
    } else {
      setRooms(prev => (prev.length > 0 ? [] : prev));
    }
  }, [formData.floor_id, floors, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createInspection(formData);
      onSuccess();
      
      const hasCriticalOrAttention = [
        formData.cleanliness_status,
        formData.electrical_status,
        formData.plumbing_status,
        formData.furniture_status,
        formData.bed_status,
        formData.safety_status
      ].some(s => s !== 'GOOD');

      if (hasCriticalOrAttention && onOpenMaintenanceWithPrefill) {
        const categoryMap = {
          ELECTRICAL: formData.electrical_status !== 'GOOD',
          PLUMBING: formData.plumbing_status !== 'GOOD',
          FURNITURE: formData.furniture_status !== 'GOOD',
          BED: formData.bed_status !== 'GOOD',
          CLEANING: formData.cleanliness_status !== 'GOOD',
          SAFETY: formData.safety_status !== 'GOOD'
        };
        const activeCategory = Object.keys(categoryMap).find(k => categoryMap[k]) || 'ROOM';

        if (window.confirm('Inspection saved! Would you like to create a Maintenance Request for the identified issue(s)?')) {
          onOpenMaintenanceWithPrefill({
            category: activeCategory,
            hostel_id: formData.hostel_id,
            floor_id: formData.floor_id,
            room_id: formData.room_id,
            title: `Inspection Issue: ${activeCategory} in Room ${formData.room_id}`,
            description: `Reported during room inspection on ${formData.inspection_date}. Remarks: ${formData.remarks || 'None'}`
          });
        }
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit room inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRadioGroup = (key, label) => (
    <div key={key} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {CONDITION_OPTIONS.map(opt => {
          const isSelected = formData[key] === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => setFormData({ ...formData, [key]: opt.value })}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: isSelected ? `2px solid ${opt.color}` : '1.5px solid #cbd5e1',
                background: isSelected ? opt.bg : '#ffffff',
                color: isSelected ? opt.color : '#475569',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {isSelected ? '● ' : ''}{opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div 
        className="modal-dialog-custom" 
        style={{ maxWidth: '750px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" 
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="modal-header-custom">
          <h2 className="modal-title-custom">
            <span>New Room Inspection Checklist</span>
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
            {error && (
              <div className="alert-error-custom">
                <span>️</span>
                <div>{error}</div>
              </div>
            )}

            {/* Location Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Hostel <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={formData.hostel_id}
                  onChange={(e) => setFormData({ ...formData, hostel_id: e.target.value, floor_id: '', room_id: '' })}
                  required
                >
                  <option value="">Select Hostel</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Floor
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={formData.floor_id}
                  onChange={(e) => setFormData({ ...formData, floor_id: e.target.value, room_id: '' })}
                >
                  <option value="">Select Floor (Optional)</option>
                  {floors.map(f => (
                    <option key={f.id} value={f.id}>{f.floor_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Room
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                >
                  <option value="">Select Room (Optional)</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>Room {r.room_number}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Inspection Date
                </label>
                <input
                  type="date"
                  className="filter-search-input"
                  style={{ paddingLeft: '12px' }}
                  value={formData.inspection_date}
                  onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Inspection Items */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                 Physical Condition Checklist
              </div>
              {renderRadioGroup('cleanliness_status', '1. Cleanliness & Hygiene')}
              {renderRadioGroup('electrical_status', '2. Electrical Fixtures & Wiring')}
              {renderRadioGroup('plumbing_status', '3. Plumbing, Taps & Washroom')}
              {renderRadioGroup('furniture_status', '4. Study Tables, Chairs & Cupboards')}
              {renderRadioGroup('bed_status', '5. Beds & Mattresses')}
              {renderRadioGroup('safety_status', '6. Doors, Windows & Safety Latches')}
            </div>

            {/* Remarks */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Inspection Remarks & Action Items
              </label>
              <textarea
                className="resolution-textarea"
                rows="2"
                placeholder="Enter observations, damages found, or recommendations..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
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
              {submitting ? 'Submitting...' : 'Record Room Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
