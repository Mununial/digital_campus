import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AllocationModal from '../components/allocations/AllocationModal';
import TransferModal from '../components/allocations/TransferModal';
import CheckoutModal from '../components/allocations/CheckoutModal';
import AllocationDetailsModal from '../components/allocations/AllocationDetailsModal';
import './AllocationsPage.css';

const AllocationsPage = () => {
  const [allocations, setAllocations] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [unallocatedStudents, setUnallocatedStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedHostel, setSelectedHostel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);

  // Consistency audit state
  const [consistencyResult, setConsistencyResult] = useState(null);
  const [auditing, setAuditing] = useState(false);

  // Fetch Hostels & Unallocated Students
  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const [hostelsRes, studentsRes] = await Promise.all([
        api.getHostels(),
        api.getStudents({ limit: 100 })
      ]);

      const hostelList = hostelsRes.data?.hostels || hostelsRes.data || [];
      setHostels(hostelList);

      const allStudents = studentsRes.data?.students || studentsRes.data || [];
      // Filter students who don't have bed_id or active allocation
      const unassigned = allStudents.filter(s => !s.bed_id && s.status === 'ACTIVE');
      setUnallocatedStudents(unassigned);
    } catch (err) {
      console.error('Error fetching auxiliary data:', err);
    }
  }, []);

  // Fetch Allocations List
  const fetchAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search,
        status: selectedStatus,
        hostel_id: selectedHostel
      };
      const res = await api.getAllocations(params);
      const data = res.data?.data || res.data || {};
      setAllocations(data.allocations || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error loading allocations:', err);
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedStatus, selectedHostel]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, [fetchAuxiliaryData]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleRunConsistencyCheck = async () => {
    setAuditing(true);
    try {
      const res = await api.getAllocationConsistency();
      setConsistencyResult(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to run consistency check:', err);
    } finally {
      setAuditing(false);
    }
  };

  const handleOpenTransfer = (alloc) => {
    setSelectedAllocation(alloc);
    setIsTransferOpen(true);
  };

  const handleOpenCheckout = (alloc) => {
    setSelectedAllocation(alloc);
    setIsCheckoutOpen(true);
  };

  const handleOpenDetails = (alloc) => {
    setSelectedAllocation(alloc);
    setIsDetailsOpen(true);
  };

  return (
    <div className="allocations-page">
      {/* Header */}
      <div className="allocations-header">
        <div>
          <h1>Student Accommodations & Transfers</h1>
          <p>Manage room/bed allocations, student transfers, and hostel checkouts with database integrity.</p>
        </div>
        <div className="allocations-actions">
          <button className="btn-secondary" onClick={handleRunConsistencyCheck} disabled={auditing}>
            {auditing ? 'Auditing...' : ' Consistency Audit'}
          </button>
          <button className="btn-primary" onClick={() => setIsAllocateOpen(true)}>
            + Allocate Student
          </button>
        </div>
      </div>

      {/* Consistency Audit Alert Box */}
      {consistencyResult && (
        <div
          style={{
            background: consistencyResult.isConsistent ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${consistencyResult.isConsistent ? '#A7F3D0' : '#FCA5A5'}`,
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: consistencyResult.isConsistent ? '#065F46' : '#991B1B' }}>
              {consistencyResult.isConsistent ? '✓ System Accommodation Database is 100% Consistent' : '️ Database Consistency Audit Alert'}
            </h3>
            <button
              onClick={() => setConsistencyResult(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              &times;
            </button>
          </div>

          {!consistencyResult.isConsistent && (
            <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#7F1D1D' }}>
              <ul>
                {consistencyResult.issues?.occupiedBedsWithoutActiveAllocation?.length > 0 && (
                  <li>Occupied beds without active allocation: {consistencyResult.issues.occupiedBedsWithoutActiveAllocation.length}</li>
                )}
                {consistencyResult.issues?.activeAllocationsWithAvailableBed?.length > 0 && (
                  <li>Active allocations with non-occupied bed: {consistencyResult.issues.activeAllocationsWithAvailableBed.length}</li>
                )}
                {consistencyResult.issues?.mismatchedStudentBeds?.length > 0 && (
                  <li>Students with mismatched bed reference: {consistencyResult.issues.mismatchedStudentBeds.length}</li>
                )}
                {consistencyResult.issues?.duplicateActiveAllocations?.length > 0 && (
                  <li>Students with duplicate active allocations: {consistencyResult.issues.duplicateActiveAllocations.length}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="allocations-stats">
        <div className="alloc-stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#EEF2FF', color: '#4F46E5' }}></div>
          <div className="stat-info">
            <div className="stat-value">{allocations.filter(a => a.status === 'ACTIVE').length}</div>
            <div className="stat-label">Active Occupants</div>
          </div>
        </div>

        <div className="alloc-stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#ECFDF5', color: '#10B981' }}></div>
          <div className="stat-info">
            <div className="stat-value">{allocations.filter(a => a.status === 'TRANSFERRED').length}</div>
            <div className="stat-label">Transfers Recorded</div>
          </div>
        </div>

        <div className="alloc-stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#FEF2F2', color: '#EF4444' }}></div>
          <div className="stat-info">
            <div className="stat-value">{allocations.filter(a => a.status === 'CHECKED_OUT').length}</div>
            <div className="stat-label">Hostel Checkouts</div>
          </div>
        </div>

        <div className="alloc-stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#FFFBEB', color: '#F59E0B' }}></div>
          <div className="stat-info">
            <div className="stat-value">{unallocatedStudents.length}</div>
            <div className="stat-label">Unallocated Students</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="allocations-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search student, ID, room..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="filter-input"
          />

          <select
            value={selectedHostel}
            onChange={e => { setSelectedHostel(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="all">All Hostels</option>
            {hostels.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
            className="filter-select"
          >
            <option value="">All Allocation Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRANSFERRED">TRANSFERRED</option>
            <option value="CHECKED_OUT">CHECKED_OUT</option>
          </select>
        </div>
      </div>

      {/* Allocations Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading allocation records...</div>
        ) : allocations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            No allocation records found matching current criteria.
          </div>
        ) : (
          <table className="allocations-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Hostel & Room</th>
                <th>Bed</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map(alloc => (
                <tr key={alloc.id}>
                  <td>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{alloc.student_name}</div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                      ID: {alloc.student_code}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: '#374151' }}>{alloc.hostel_name}</div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Room {alloc.room_number}</div>
                  </td>
                  <td>
                    <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '0.88rem' }}>
                      Bed {alloc.bed_number}
                    </span>
                  </td>
                  <td>{alloc.allocated_from ? alloc.allocated_from.slice(0, 10) : 'N/A'}</td>
                  <td>{alloc.allocated_until ? alloc.allocated_until.slice(0, 10) : '—'}</td>
                  <td>
                    {alloc.status === 'ACTIVE' && <span className="badge-active">ACTIVE</span>}
                    {alloc.status === 'TRANSFERRED' && <span className="badge-transferred">TRANSFERRED</span>}
                    {alloc.status === 'CHECKED_OUT' && <span className="badge-checkedout">CHECKED_OUT</span>}
                  </td>
                  <td>
                    <div className="action-btn-group">
                      <button className="action-btn btn-details" onClick={() => handleOpenDetails(alloc)} title="View History Profile">
                        History
                      </button>

                      {alloc.status === 'ACTIVE' && (
                        <>
                          <button className="action-btn btn-transfer" onClick={() => handleOpenTransfer(alloc)}>
                            Transfer
                          </button>
                          <button className="action-btn btn-checkout" onClick={() => handleOpenCheckout(alloc)}>
                            Checkout
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(prev => prev - 1)}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
          >
            &larr; Previous
          </button>
          <span style={{ alignSelf: 'center', fontWeight: '600', color: '#4b5563' }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(prev => prev + 1)}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
          >
            Next &rarr;
          </button>
        </div>
      )}

      {/* Modals */}
      <AllocationModal
        isOpen={isAllocateOpen}
        onClose={() => setIsAllocateOpen(false)}
        onSuccess={() => { fetchAllocations(); fetchAuxiliaryData(); }}
        hostels={hostels}
        unallocatedStudents={unallocatedStudents}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => { setIsTransferOpen(false); setSelectedAllocation(null); }}
        onSuccess={() => { fetchAllocations(); fetchAuxiliaryData(); }}
        allocation={selectedAllocation}
        hostels={hostels}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => { setIsCheckoutOpen(false); setSelectedAllocation(null); }}
        onSuccess={() => { fetchAllocations(); fetchAuxiliaryData(); }}
        allocation={selectedAllocation}
      />

      <AllocationDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedAllocation(null); }}
        allocation={selectedAllocation}
      />
    </div>
  );
};

export default AllocationsPage;
