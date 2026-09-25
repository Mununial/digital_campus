import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AllocationModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  hostels = [], 
  unallocatedStudents = [],
  initialHostelId = null,
  initialRoomId = null,
  initialBedId = null
}) => {
  const [formData, setFormData] = useState({
    student_id: '',
    hostel_id: '',
    room_id: '',
    bed_id: '',
    allocated_from: new Date().toISOString().slice(0, 10)
  });

  const [rooms, setRooms] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Selected student & gender calculation
  const selectedStudent = unallocatedStudents.find(
    s => String(s.id) === String(formData.student_id) || String(s.roll_number) === String(formData.student_id)
  );

  const rawGender = selectedStudent?.gender || selectedStudent?.normalized_gender || '';
  const normGender = String(rawGender).toUpperCase();
  const isMale = normGender.startsWith('M') || normGender.includes('BOY');
  const isFemale = normGender.startsWith('F') || normGender.includes('GIRL');

  // Filter hostels based on student's gender
  const eligibleHostels = hostels.filter(h => {
    if (!selectedStudent) return true;
    const hGender = String(h.gender || '').toUpperCase();
    if (hGender === 'COED') return true;
    if (isMale) return hGender === 'MALE' || hGender.includes('BOY');
    if (isFemale) return hGender === 'FEMALE' || hGender.includes('GIRL');
    return true;
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        student_id: '',
        hostel_id: initialHostelId || '',
        room_id: initialRoomId || '',
        bed_id: initialBedId || '',
        allocated_from: new Date().toISOString().slice(0, 10)
      });
      setRooms([]);
      setAvailableBeds([]);
      setError('');
    }
  }, [isOpen, initialHostelId, initialRoomId, initialBedId]);

  // When student changes, ensure selected hostel is eligible; if not, switch to first eligible
  useEffect(() => {
    if (formData.student_id && eligibleHostels.length > 0) {
      const isCurrentHostelValid = eligibleHostels.some(h => String(h.id) === String(formData.hostel_id));
      if (!isCurrentHostelValid) {
        setFormData(prev => ({
          ...prev,
          hostel_id: eligibleHostels[0].id,
          room_id: '',
          bed_id: ''
        }));
      }
    }
  }, [formData.student_id, eligibleHostels]);

  // Load rooms when hostel changes
  useEffect(() => {
    if (formData.hostel_id) {
      setLoadingRooms(true);
      api.getRooms({ hostel_id: formData.hostel_id, limit: 1000 })
        .then(res => {
          const roomList = res.data?.rooms || res.data || [];
          roomList.sort((a, b) => {
            return String(a.room_number || '').localeCompare(String(b.room_number || ''), undefined, { numeric: true, sensitivity: 'base' });
          });
          setRooms(roomList);
          if (initialRoomId && String(formData.hostel_id) === String(initialHostelId)) {
            setFormData(prev => ({ ...prev, room_id: initialRoomId }));
          } else if (!formData.room_id) {
            setFormData(prev => ({ ...prev, room_id: '', bed_id: '' }));
          }
        })
        .catch(err => {
          console.error('Failed to load rooms:', err);
          setRooms([]);
        })
        .finally(() => setLoadingRooms(false));
    } else {
      setRooms([]);
    }
  }, [formData.hostel_id, initialHostelId, initialRoomId]);

  // Load available beds when room changes
  useEffect(() => {
    if (formData.hostel_id && formData.room_id) {
      setLoadingBeds(true);
      api.getAvailableBeds(formData.hostel_id, formData.room_id)
        .then(res => {
          const bedList = res.data?.data || res.data || [];
          bedList.sort((a, b) => {
            return String(a.bed_number || '').localeCompare(String(b.bed_number || ''), undefined, { numeric: true, sensitivity: 'base' });
          });
          setAvailableBeds(bedList);
          if (initialBedId && String(formData.room_id) === String(initialRoomId)) {
            setFormData(prev => ({ ...prev, bed_id: initialBedId }));
          } else if (!formData.bed_id) {
            setFormData(prev => ({ ...prev, bed_id: '' }));
          }
        })
        .catch(err => {
          console.error('Failed to load available beds:', err);
          setAvailableBeds([]);
        })
        .finally(() => setLoadingBeds(false));
    } else {
      setAvailableBeds([]);
    }
  }, [formData.hostel_id, formData.room_id, initialBedId, initialRoomId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.student_id) {
      return setError('Please select a student.');
    }
    if (!formData.hostel_id || !formData.room_id || !formData.bed_id) {
      return setError('Please complete Hostel, Room, and Bed selection.');
    }

    // Front-end safety validation for gender
    const chosenHostel = hostels.find(h => String(h.id) === String(formData.hostel_id));
    if (chosenHostel && chosenHostel.gender !== 'COED') {
      const hGender = String(chosenHostel.gender).toUpperCase();
      if (isMale && hGender !== 'MALE') {
        return setError(`Cannot allot Male student to ${chosenHostel.name} (Boys can only be allotted to Boys' hostels).`);
      }
      if (isFemale && hGender !== 'FEMALE') {
        return setError(`Cannot allot Female student to ${chosenHostel.name} (Girls can only be allotted to Girls' hostels).`);
      }
    }

    setSubmitting(true);
    try {
      await api.allocateStudent(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to allocate student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h2>New Room & Bed Allocation</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="alert alert-danger" style={{ margin: '15px 20px 0' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
              Select Student from Reporting Master *
            </label>
            <select
              value={formData.student_id}
              onChange={e => setFormData({ ...formData, student_id: e.target.value })}
              required
              className="form-control"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="">-- Choose Student --</option>
              {unallocatedStudents.map(s => {
                const sGender = String(s.gender || '').toUpperCase();
                const icon = sGender.startsWith('F') ? '👧' : (sGender.startsWith('M') ? '👦' : '👤');
                return (
                  <option key={s.id} value={s.id}>
                    {icon} {s.full_name} ({s.roll_number || s.student_id}) — {s.gender || 'N/A'}{s.branch ? ` • ${s.branch}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedStudent && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: isFemale ? '#fdf2f8' : '#eff6ff',
              border: `1px solid ${isFemale ? '#fbcfe8' : '#bfdbfe'}`,
              color: isFemale ? '#be185d' : '#1d4ed8',
              fontSize: '0.85rem',
              fontWeight: '500',
              marginBottom: '15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{isFemale ? '👧' : '👦'}</span>
                <span>{selectedStudent.full_name}</span>
                <span style={{
                  background: isFemale ? '#db2777' : '#2563eb',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  marginLeft: 'auto'
                }}>
                  {isFemale ? "GIRLS' HOSTEL ONLY" : "BOYS' HOSTEL ONLY"}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Roll: <strong>{selectedStudent.roll_number || selectedStudent.student_id}</strong>
                {selectedStudent.branch ? ` • Branch: ${selectedStudent.branch}` : ''}
                {selectedStudent.year ? ` • Year: ${selectedStudent.year}` : ''}
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
              Hostel * {selectedStudent ? (isFemale ? '(Filtered to Girls\' Hostels)' : '(Filtered to Boys\' Hostels)') : ''}
            </label>
            <select
              value={formData.hostel_id}
              onChange={e => setFormData({ ...formData, hostel_id: e.target.value })}
              required
              className="form-control"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="">-- Choose Hostel --</option>
              {eligibleHostels.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({String(h.gender).toUpperCase() === 'FEMALE' ? "Girls" : (String(h.gender).toUpperCase() === 'MALE' ? "Boys" : "Co-ed")})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Room *</label>
            <select
              value={formData.room_id}
              onChange={e => setFormData({ ...formData, room_id: e.target.value })}
              disabled={!formData.hostel_id || loadingRooms}
              required
              className="form-control"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="">{loadingRooms ? 'Loading rooms...' : '-- Choose Room --'}</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>Room {r.room_number}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Available Bed *</label>
            <select
              value={formData.bed_id}
              onChange={e => setFormData({ ...formData, bed_id: e.target.value })}
              disabled={!formData.room_id || loadingBeds}
              required
              className="form-control"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="">{loadingBeds ? 'Loading available beds...' : '-- Choose Bed --'}</option>
              {availableBeds.map(b => (
                <option key={b.id} value={b.id}>Bed {b.bed_number}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Allocation Start Date *</label>
            <input
              type="date"
              value={formData.allocated_from}
              onChange={e => setFormData({ ...formData, allocated_from: e.target.value })}
              required
              className="form-control"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#4F46E5', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
            >
              {submitting ? 'Allocating...' : 'Confirm Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AllocationModal;
