import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AllocationDetailsModal = ({ isOpen, onClose, allocation }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && allocation?.student_id) {
      setLoading(true);
      api.getStudentAllocationHistory(allocation.student_id)
        .then(res => {
          setHistory(res.data?.data || res.data || []);
        })
        .catch(err => {
          console.error('Failed to load student allocation history:', err);
          setHistory([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, allocation]);

  if (!isOpen || !allocation) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h2>Accommodation & History Profile</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Profile Header Card */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: '#F8FAFC', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#4F46E5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold' }}>
              {allocation.student_name ? allocation.student_name.charAt(0) : 'S'}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0F172A' }}>{allocation.student_name}</h3>
              <div style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '2px' }}>
                ID: <strong>{allocation.student_code}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                Course: {allocation.course || 'B.Tech'} ({allocation.branch || 'CSE'})
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             Complete Accommodation Lifecycle History
          </h4>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>Loading allocation timeline...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>No prior allocation records found.</div>
          ) : (
            <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((hItem, idx) => (
                <div
                  key={hItem.id || idx}
                  style={{
                    borderLeft: `4px solid ${
                      hItem.status === 'ACTIVE' ? '#10B981' : (hItem.status === 'TRANSFERRED' ? '#3B82F6' : '#EF4444')
                    }`,
                    background: '#F1F5F9',
                    padding: '12px 16px',
                    borderRadius: '0 8px 8px 0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0F172A' }}>
                      {hItem.hostel_name} &bull; Room {hItem.room_number} &bull; Bed {hItem.bed_number}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: hItem.status === 'ACTIVE' ? '#D1FAE5' : (hItem.status === 'TRANSFERRED' ? '#DBEAFE' : '#FEE2E2'),
                        color: hItem.status === 'ACTIVE' ? '#065F46' : (hItem.status === 'TRANSFERRED' ? '#1E40AF' : '#991B1B')
                      }}
                    >
                      {hItem.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                    <strong>Allocated:</strong> {hItem.allocated_from ? hItem.allocated_from.slice(0, 10) : 'N/A'}
                    {hItem.allocated_until && (
                      <span> &bull; <strong>Until:</strong> {hItem.allocated_until.slice(0, 10)}</span>
                    )}
                  </div>

                  {hItem.transfer_reason && (
                    <div style={{ fontSize: '0.83rem', color: '#2563EB', marginTop: '4px' }}>
                      <strong>Transfer Reason:</strong> {hItem.transfer_reason}
                    </div>
                  )}

                  {hItem.checkout_reason && (
                    <div style={{ fontSize: '0.83rem', color: '#DC2626', marginTop: '4px' }}>
                      <strong>Checkout Reason:</strong> {hItem.checkout_reason} {hItem.custom_reason ? `(${hItem.custom_reason})` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontWeight: '600' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocationDetailsModal;
