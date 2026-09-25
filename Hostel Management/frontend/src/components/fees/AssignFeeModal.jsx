import React, { useState } from 'react';

const AssignFeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  feeStructures = [],
  students = [],
  hostels = []
}) => {
  const [isBulk, setIsBulk] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    hostel_id: '',
    fee_structure_id: '',
    academic_year: '2026-27',
    amount: '',
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    course: '',
    branch: '',
    year: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleStructureChange = (e) => {
    const structId = e.target.value;
    const selected = feeStructures.find(fs => String(fs.id) === String(structId));
    if (selected) {
      setFormData(prev => ({
        ...prev,
        fee_structure_id: selected.id,
        academic_year: selected.academic_year || prev.academic_year,
        amount: selected.amount || prev.amount
      }));
    } else {
      setFormData(prev => ({ ...prev, fee_structure_id: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBulk && !formData.student_id) return setError('Please select a student.');
    if (isBulk && !formData.hostel_id) return setError('Please select a target hostel for bulk assignment.');
    if (!formData.amount || parseFloat(formData.amount) <= 0) return setError('Please enter a valid fee amount.');
    if (!formData.due_date) return setError('Please specify a valid due date.');

    try {
      setLoading(true);
      await onSubmit({ ...formData, bulk: isBulk });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign fee.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box glassmorphic">
        <div className="modal-header">
          <h3>Assign Fee to Student(s)</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="tab-toggle-bar">
          <button
            type="button"
            className={`tab-btn ${!isBulk ? 'active' : ''}`}
            onClick={() => { setIsBulk(false); setError(''); }}
          >
            Single Student
          </button>
          <button
            type="button"
            className={`tab-btn ${isBulk ? 'active' : ''}`}
            onClick={() => { setIsBulk(true); setError(''); }}
          >
            Bulk Hostel Assignment
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-alert">{error}</div>}

          <div className="form-group">
            <label>Select Fee Structure (Optional Template)</label>
            <select onChange={handleStructureChange} value={formData.fee_structure_id}>
              <option value="">-- Custom Snapshot Fee --</option>
              {feeStructures.map(fs => (
                <option key={fs.id} value={fs.id}>
                  {fs.name} (₹{fs.amount} - {fs.academic_year})
                </option>
              ))}
            </select>
          </div>

          {!isBulk ? (
            <div className="form-group">
              <label>Select Student *</label>
              <select
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                required
              >
                <option value="">-- Select Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.student_code || s.student_id || 'STD'}) - Room {s.room_number || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Target Hostel *</label>
                <select
                  name="hostel_id"
                  value={formData.hostel_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select Hostel --</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>Course (Optional)</label>
                  <input
                    type="text"
                    name="course"
                    placeholder="e.g. B.Tech"
                    value={formData.course}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Branch (Optional)</label>
                  <input
                    type="text"
                    name="branch"
                    placeholder="e.g. Computer Science"
                    value={formData.branch}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Year (Optional)</label>
                  <input
                    type="number"
                    name="year"
                    placeholder="e.g. 3"
                    min="1"
                    max="5"
                    value={formData.year}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-row-2">
            <div className="form-group">
              <label>Assigned Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                placeholder="e.g. 30000"
                min="1"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Academic Year *</label>
              <input
                type="text"
                name="academic_year"
                placeholder="e.g. 2026-27"
                value={formData.academic_year}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Payment Due Date *</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-modal cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-modal submit" disabled={loading}>
              {loading ? 'Assigning...' : (isBulk ? 'Assign Bulk Fees' : 'Assign Fee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignFeeModal;
