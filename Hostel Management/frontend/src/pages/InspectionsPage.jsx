import React, { useState, useEffect } from 'react';
import { getInspections } from '../api/operations';
import InspectionFormModal from '../components/operations/InspectionFormModal';
import InspectionHistoryModal from '../components/operations/InspectionHistoryModal';
import MaintenanceFormModal from '../components/operations/MaintenanceFormModal';
import './MaintenancePage.css';

export default function InspectionsPage({ role = 'SUPER_ADMIN' }) {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    hostel_id: '',
    condition: '',
    date_from: '',
    date_to: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  const [isInspFormOpen, setIsInspFormOpen] = useState(false);
  const [selectedHistoryRoomId, setSelectedHistoryRoomId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [prefillMaint, setPrefillMaint] = useState(null);
  const [isMaintFormOpen, setIsMaintFormOpen] = useState(false);

  const loadInspections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInspections(filters);
      setInspections(data.inspections || []);
      setPagination({
        page: data.page || 1,
        totalPages: data.totalPages || 1,
        total: data.total || 0
      });
    } catch (err) {
      setError(err.message || 'Failed to load room inspections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [filters]);

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

  const calculateOverallCondition = (insp) => {
    const conds = [
      insp.cleanliness_status,
      insp.electrical_status,
      insp.plumbing_status,
      insp.furniture_status,
      insp.bed_status,
      insp.safety_status
    ];
    if (conds.includes('CRITICAL')) return 'CRITICAL';
    if (conds.includes('ATTENTION_REQUIRED')) return 'ATTENTION_REQUIRED';
    return 'GOOD';
  };

  const openHistory = (roomId) => {
    setSelectedHistoryRoomId(roomId);
    setIsHistoryOpen(true);
  };

  const handleOpenMaintenancePrefill = (prefillData) => {
    setPrefillMaint(prefillData);
    setIsMaintFormOpen(true);
  };

  return (
    <div className="maintenance-page">
      {/* Header */}
      <div className="maintenance-header-row">
        <div>
          <h1 className="maintenance-title">
            <span>Room Health & Inspection Center</span>
          </h1>
          <p className="maintenance-sub">
            Conduct room health audits, hygiene inspections, and track physical room asset conditions.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary-gradient"
          onClick={() => setIsInspFormOpen(true)}
        >
          <span>+ Record Room Inspection</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="maintenance-filter-card">
        <div className="filter-grid">
          <div className="filter-search-wrapper">
            <span className="filter-search-icon"></span>
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search hostel, room number, inspector..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>

          <div>
            <select
              className="filter-select"
              value={filters.condition || ''}
              onChange={(e) => setFilters({ ...filters, condition: e.target.value, page: 1 })}
            >
              <option value="">All Health Statuses</option>
              <option value="CRITICAL">Critical Issues Only</option>
              <option value="ATTENTION_REQUIRED">Attention Required Only</option>
              <option value="GOOD">Good Condition Only</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => setFilters({ page: 1, limit: 20, search: '', hostel_id: '', condition: '', date_from: '', date_to: '' })}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-error-custom">
          <span>️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Inspections List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}></div>
          <p>Loading room inspections...</p>
        </div>
      ) : inspections.length === 0 ? (
        <div style={{ background: '#ffffff', border: '2px dashed #e2e8f0', borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}></div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>No Inspection Records Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>No room inspections match your current filter settings.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {inspections.map(insp => {
              const overall = calculateOverallCondition(insp);
              return (
                <div key={insp.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                      Room {insp.room_number} <small style={{ color: '#64748b', fontWeight: 500 }}>({insp.hostel_code || insp.hostel_name})</small>
                    </span>
                    {renderBadge(overall)}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                    <span>Inspector: <strong>{insp.inspector_name}</strong></span>
                    <span>{new Date(insp.inspection_date).toLocaleDateString()}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <div>Clean: {renderBadge(insp.cleanliness_status)}</div>
                    <div>Electrical: {renderBadge(insp.electrical_status)}</div>
                    <div>Plumbing: {renderBadge(insp.plumbing_status)}</div>
                    <div>Furniture: {renderBadge(insp.furniture_status)}</div>
                    <div>Beds: {renderBadge(insp.bed_status)}</div>
                    <div>Safety: {renderBadge(insp.safety_status)}</div>
                  </div>

                  {insp.remarks && (
                    <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, background: '#f1f5f9', padding: '8px 10px', borderRadius: '6px' }}>
                      <strong>Remarks:</strong> {insp.remarks}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                    <button
                      type="button"
                      className="filter-reset-btn"
                      style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem' }}
                      onClick={() => openHistory(insp.room_id)}
                    >
                      History
                    </button>

                    {overall !== 'GOOD' && (
                      <button
                        type="button"
                        className="btn-action-outline"
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem', borderColor: '#ef4444', color: '#dc2626' }}
                        onClick={() => handleOpenMaintenancePrefill({
                          category: insp.plumbing_status !== 'GOOD' ? 'PLUMBING' : (insp.electrical_status !== 'GOOD' ? 'ELECTRICAL' : 'ROOM'),
                          hostel_id: insp.hostel_id,
                          floor_id: insp.floor_id,
                          room_id: insp.room_id,
                          title: `Inspection Issue: Room ${insp.room_number}`,
                          description: `Created from room inspection on ${new Date(insp.inspection_date).toLocaleDateString()}. Remarks: ${insp.remarks || 'N/A'}`
                        })}
                      >
                        Report Issue
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontSize: '0.86rem' }}>
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total inspections)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="filter-reset-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="filter-reset-btn"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Inspection Form Modal */}
      <InspectionFormModal
        isOpen={isInspFormOpen}
        onClose={() => setIsInspFormOpen(false)}
        onSuccess={loadInspections}
        onOpenMaintenanceWithPrefill={handleOpenMaintenancePrefill}
      />

      {/* Room History Modal */}
      <InspectionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => { setIsHistoryOpen(false); setSelectedHistoryRoomId(null); }}
        roomId={selectedHistoryRoomId}
      />

      {/* Maintenance Form Modal for Prefill */}
      <MaintenanceFormModal
        isOpen={isMaintFormOpen}
        onClose={() => { setIsMaintFormOpen(false); setPrefillMaint(null); }}
        onSuccess={loadInspections}
        isStaff={true}
        prefill={prefillMaint}
      />
    </div>
  );
}
