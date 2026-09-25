import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const TransferModal = ({ isOpen, onClose, onSuccess, allocation, hostels = [] }) => {
  const [formData, setFormData] = useState({
    new_hostel_id: '',
    new_room_id: '',
    new_bed_id: '',
    transfer_date: new Date().toISOString().slice(0, 10),
    transfer_reason: ''
  });

  const [rooms, setRooms] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [error, setError] = useState('');

  const rawGender = allocation?.gender || allocation?.user_gender || (allocation?.hostel_name?.toLowerCase().includes('girl') ? 'FEMALE' : 'MALE');
  const normGender = String(rawGender).toUpperCase();
  const isMale = normGender.startsWith('M') || normGender.includes('BOY');
  const isFemale = normGender.startsWith('F') || normGender.includes('GIRL');

  const eligibleHostels = hostels.filter(h => {
    if (!allocation) return true;
    const hGender = String(h.gender || '').toUpperCase();
    if (hGender === 'COED') return true;
    if (isMale) return hGender === 'MALE' || hGender.includes('BOY');
    if (isFemale) return hGender === 'FEMALE' || hGender.includes('GIRL');
    return true;
  });

  useEffect(() => {
    if (isOpen && allocation) {
      const defaultHostelId = eligibleHostels.some(h => String(h.id) === String(allocation.hostel_id))
        ? allocation.hostel_id
        : (eligibleHostels.length > 0 ? eligibleHostels[0].id : '');

      setFormData({
        new_hostel_id: defaultHostelId,
        new_room_id: '',
        new_bed_id: '',
        transfer_date: new Date().toISOString().slice(0, 10),
        transfer_reason: ''
      });
      setConfirmStep(false);
      setError('');
    }
  }, [isOpen, allocation, hostels]);

  // Load rooms when new hostel changes
  useEffect(() => {
    if (formData.new_hostel_id) {
      setLoadingRooms(true);
      api.getRooms({ hostel_id: formData.new_hostel_id, limit: 1000 })
        .then(res => {
          const roomList = res.data?.rooms || res.data || [];
          roomList.sort((a, b) => {
            return String(a.room_number || '').localeCompare(String(b.room_number || ''), undefined, { numeric: true, sensitivity: 'base' });
          });
          setRooms(roomList);
          setFormData(prev => ({ ...prev, new_room_id: '', new_bed_id: '' }));
        })
        .catch(err => {
          console.error('Failed to load rooms:', err);
          setRooms([]);
        })
        .finally(() => setLoadingRooms(false));
    } else {
      setRooms([]);
    }
  }, [formData.new_hostel_id]);

  // Load available beds when new room changes
  useEffect(() => {
    if (formData.new_hostel_id && formData.new_room_id) {
      setLoadingBeds(true);
      api.getAvailableBeds(formData.new_hostel_id, formData.new_room_id)
        .then(res => {
          const bedList = res.data?.data || res.data || [];
          bedList.sort((a, b) => {
            return String(a.bed_number || '').localeCompare(String(b.bed_number || ''), undefined, { numeric: true, sensitivity: 'base' });
          });
          setAvailableBeds(bedList);
          setFormData(prev => ({ ...prev, new_bed_id: '' }));
        })
        .catch(err => {
          console.error('Failed to load available beds:', err);
          setAvailableBeds([]);
        })
        .finally(() => setLoadingBeds(false));
    } else {
      setAvailableBeds([]);
    }
  }, [formData.new_hostel_id, formData.new_room_id]);

  if (!isOpen || !allocation) return null;

  const targetHostel = hostels.find(h => String(h.id) === String(formData.new_hostel_id));
  const targetRoom = rooms.find(r => String(r.id) === String(formData.new_room_id));
  const targetBed = availableBeds.find(b => String(b.id) === String(formData.new_bed_id));

  const handleNext = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.new_hostel_id || !formData.new_room_id || !formData.new_bed_id) {
      return setError('Please select Destination Hostel, Room, and Bed.');
    }
    if (String(allocation.bed_id) === String(formData.new_bed_id)) {
      return setError('Student is already allocated to this exact bed.');
    }

    setConfirmStep(true);
  };

  const handleConfirmTransfer = async () => {
    setSubmitting(true);
    setError('');

    try {
      await api.transferStudent(allocation.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to transfer student.');
      setConfirmStep(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h2>Room & Bed Transfer</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="alert alert-danger" style={{ margin: '15px 20px 0' }}>{error}</div>}

        {!confirmStep ? (
          <form onSubmit={handleNext} style={{ padding: '20px' }}>
            <div style={{ background: '#F3F4F6', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontWeight: '700', color: '#1F2937', marginBottom: '4px' }}>
                Student: {allocation.student_name} ({allocation.student_code})
              </div>
              <div style={{ fontSize: '0.9rem', color: '#4B5563' }}>
                <strong>CURRENT:</strong> {allocation.hostel_name} &bull; Room {allocation.room_number} &bull; Bed {allocation.bed_number}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>
                Destination Hostel * ({isFemale ? "Girls' Hostels Only" : "Boys' Hostels Only"})
              </label>
              <select
                value={formData.new_hostel_id}
                onChange={e => setFormData({ ...formData, new_hostel_id: e.target.value })}
                required
                className="form-control"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              >
                <option value="">-- Choose Target Hostel --</option>
                {eligibleHostels.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({String(h.gender).toUpperCase() === 'FEMALE' ? 'Girls' : (String(h.gender).toUpperCase() === 'MALE' ? 'Boys' : 'Co-ed')})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Destination Room *</label>
              <select
                value={formData.new_room_id}
                onChange={e => setFormData({ ...formData, new_room_id: e.target.value })}
                disabled={!formData.new_hostel_id || loadingRooms}
                required
                className="form-control"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              >
                <option value="">{loadingRooms ? 'Loading rooms...' : '-- Choose Target Room --'}</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>Room {r.room_number}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Destination Available Bed *</label>
              <select
                value={formData.new_bed_id}
                onChange={e => setFormData({ ...formData, new_bed_id: e.target.value })}
                disabled={!formData.new_room_id || loadingBeds}
                required
                className="form-control"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              >
                <option value="">{loadingBeds ? 'Loading available beds...' : '-- Choose Target Bed --'}</option>
                {availableBeds.map(b => (
                  <option key={b.id} value={b.id}>Bed {b.bed_number}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Transfer Date *</label>
              <input
                type="date"
                value={formData.transfer_date}
                onChange={e => setFormData({ ...formData, transfer_date: e.target.value })}
                required
                className="form-control"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Reason for Transfer (Optional)</label>
              <textarea
                value={formData.transfer_reason}
                onChange={e => setFormData({ ...formData, transfer_reason: e.target.value })}
                placeholder="e.g. Requested floor change / Medical preference"
                className="form-control"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '60px' }}
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
                style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
              >
                Review Transfer &rarr;
              </button>
            </div>
          </form>
        ) : (
          <div style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#111827' }}>Confirm Transfer Summary</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: '700', color: '#991B1B', marginBottom: '6px', fontSize: '0.85rem' }}>RELEASED (OLD)</div>
                <div style={{ fontSize: '0.9rem', color: '#7F1D1D' }}>
                  <strong>Hostel:</strong> {allocation.hostel_name}<br />
                  <strong>Room:</strong> {allocation.room_number}<br />
                  <strong>Bed:</strong> {allocation.bed_number}
                </div>
              </div>

              <div style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: '700', color: '#065F46', marginBottom: '6px', fontSize: '0.85rem' }}>NEW ASSIGNMENT</div>
                <div style={{ fontSize: '0.9rem', color: '#064E3B' }}>
                  <strong>Hostel:</strong> {targetHostel ? targetHostel.name : ''}<br />
                  <strong>Room:</strong> {targetRoom ? targetRoom.room_number : ''}<br />
                  <strong>Bed:</strong> {targetBed ? targetBed.bed_number : ''}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#4B5563' }}>
              <strong>Effective Date:</strong> {formData.transfer_date}<br />
              {formData.transfer_reason && <span><strong>Reason:</strong> {formData.transfer_reason}</span>}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmStep(false)}
                disabled={submitting}
                style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer' }}
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={submitting}
                style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#059669', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
              >
                {submitting ? 'Transferring...' : 'Execute Transfer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferModal;
