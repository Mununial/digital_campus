import React, { useEffect, useState } from 'react';
import { getRoomInspectionHistory } from '../../api/operations';
import '../../pages/MaintenancePage.css';

export default function InspectionHistoryModal({ isOpen, onClose, roomId }) {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && roomId) {
      setLoading(true);
      setError(null);
      getRoomInspectionHistory(roomId)
        .then(data => setHistoryData(data))
        .catch(err => setError(err.message || 'Failed to load room inspection history.'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  const renderBadge = (status) => {
    switch (status) {
      case 'CRITICAL':
        return <span className="priority-pill priority-urgent">CRITICAL</span>;
      case 'ATTENTION_REQUIRED':
        return <span className="priority-pill priority-high">ATTENTION</span>;
      default:
        return <span className="status-pill status-resolved">GOOD</span>;
    }
  };

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
            <span>Room Inspection History</span>
            {historyData?.room?.room_number && (
              <span className="badge-id" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
                Room {historyData.room.room_number} - {historyData.room.hostel_name}
              </span>
            )}
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
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}></div>
              <p>Loading room inspection records...</p>
            </div>
          )}

          {error && (
            <div className="alert-error-custom">
              <span>️</span>
              <div>{error}</div>
            </div>
          )}

          {!loading && historyData && historyData.history && (
            historyData.history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {historyData.history.map(insp => (
                  <div key={insp.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                         {new Date(insp.inspection_date).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Inspector: <strong>{insp.inspector_name}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.84rem' }}>
                      <div>Cleanliness: {renderBadge(insp.cleanliness_status)}</div>
                      <div>Electrical: {renderBadge(insp.electrical_status)}</div>
                      <div>Plumbing: {renderBadge(insp.plumbing_status)}</div>
                      <div>Furniture: {renderBadge(insp.furniture_status)}</div>
                      <div>Beds: {renderBadge(insp.bed_status)}</div>
                      <div>Safety: {renderBadge(insp.safety_status)}</div>
                    </div>

                    {insp.remarks && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
                        <strong>Remarks:</strong> {insp.remarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontStyle: 'italic' }}>
                No past inspection history recorded for this room.
              </div>
            )
          )}
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
