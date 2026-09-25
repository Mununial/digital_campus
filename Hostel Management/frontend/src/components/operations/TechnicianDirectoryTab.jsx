import React, { useState, useEffect } from 'react';
import { getTechnicians, deleteTechnician } from '../../api/operations';
import TechnicianFormModal from './TechnicianFormModal';

export default function TechnicianDirectoryTab({ isStaff = false, hostels = [] }) {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState(null);

  const fetchTechniciansList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTechnicians({
        search,
        skill_category: skillFilter,
        status: statusFilter
      });
      setTechnicians(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load technician directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechniciansList();
  }, [search, skillFilter, statusFilter]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove technician ${name}?`)) return;
    try {
      await deleteTechnician(id);
      fetchTechniciansList();
    } catch (err) {
      alert(err.message || 'Failed to delete technician.');
    }
  };

  const getSkillBadge = (skill) => {
    const colors = {
      ELECTRICAL: 'bg-amber-100 text-amber-800 border-amber-300',
      PLUMBING: 'bg-blue-100 text-blue-800 border-blue-300',
      CARPENTRY: 'bg-orange-100 text-orange-800 border-orange-300',
      FAN_AC: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      NETWORK: 'bg-purple-100 text-purple-800 border-purple-300',
      GENERAL: 'bg-slate-100 text-slate-800 border-slate-300'
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${colors[skill] || colors.GENERAL}`}>
        <i className="fa-solid fa-wrench mr-1 text-xs"></i>
        {skill.replace('_', ' ')}
      </span>
    );
  };

  const getStatusPill = (status) => {
    const statusMap = {
      AVAILABLE: { label: 'Available', color: '#166534', bg: '#dcfce7', icon: 'fa-circle-check' },
      ON_JOB: { label: 'On Job', color: '#854d0e', bg: '#fef9c3', icon: 'fa-spinner fa-spin' },
      ON_LEAVE: { label: 'On Leave', color: '#991b1b', bg: '#fee2e2', icon: 'fa-calendar-xmark' },
      INACTIVE: { label: 'Inactive', color: '#475569', bg: '#f1f5f9', icon: 'fa-circle-minus' }
    };
    const s = statusMap[status] || statusMap.AVAILABLE;
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.78rem',
        fontWeight: 700,
        backgroundColor: s.bg,
        color: s.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <i className={`fa-solid ${s.icon}`}></i>
        {s.label}
      </span>
    );
  };

  return (
    <div className="technician-directory-container">
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search technician name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '34px' }}
            />
            <i className="fa-solid fa-magnifying-glass text-slate-400" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}></i>
          </div>

          <select
            className="filter-select"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          >
            <option value="">All Skills / Trades</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="CARPENTRY">Carpentry</option>
            <option value="FAN_AC">Fan & AC</option>
            <option value="NETWORK">Wi-Fi & Network</option>
            <option value="GENERAL">General</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_JOB">On Job</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>
        </div>

        {isStaff && (
          <button
            type="button"
            className="btn-primary-gradient"
            onClick={() => { setEditingTechnician(null); setIsModalOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fa-solid fa-user-plus"></i>
            <span>Register Technician</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert-error-custom" style={{ marginBottom: '16px' }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Technicians Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
          <div className="spinner mb-2" style={{ margin: '0 auto' }}></div>
          <p>Loading technician directory...</p>
        </div>
      ) : technicians.length === 0 ? (
        <div style={{ background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '50px 20px', textAlign: 'center' }}>
          <i className="fa-solid fa-user-gear text-slate-300" style={{ fontSize: '2.5rem', marginBottom: '12px' }}></i>
          <h4 style={{ color: '#0f172a', fontWeight: 700, margin: '0 0 4px 0' }}>No Technicians Found</h4>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No technicians match your current filter parameters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {technicians.map((t) => (
            <div key={t.id} style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              position: 'relative'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-user-check text-indigo-600"></i>
                      {t.full_name}
                    </h3>
                    <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '2px' }}>
                      <i className="fa-solid fa-phone mr-1 text-slate-400"></i> {t.phone} {t.email ? `• ${t.email}` : ''}
                    </div>
                  </div>
                  {getStatusPill(t.status)}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {getSkillBadge(t.skill_category)}
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fa-solid fa-star text-amber-400"></i>
                    {Number(t.rating).toFixed(2)} / 5.0
                  </span>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', fontSize: '0.82rem', color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Assigned Hostel:</span>
                    <strong style={{ color: '#0f172a' }}>{t.assigned_hostel_name || 'Campus Wide'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Active Jobs:</span>
                    <span className="badge-id" style={{ background: '#e0e7ff', color: '#3730a3', margin: 0 }}>{t.active_jobs_count || 0} active</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Total Completed:</span>
                    <strong>{t.total_jobs_done || 0} jobs</strong>
                  </div>
                </div>
              </div>

              {isStaff && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    className="filter-reset-btn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => { setEditingTechnician(t); setIsModalOpen(true); }}
                  >
                    <i className="fa-solid fa-pen-to-square mr-1"></i> Edit
                  </button>
                  <button
                    type="button"
                    className="filter-reset-btn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ef4444', borderColor: '#fca5a5' }}
                    onClick={() => handleDelete(t.id, t.full_name)}
                  >
                    <i className="fa-solid fa-trash-can mr-1"></i> Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <TechnicianFormModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingTechnician(null); }}
          onSuccess={fetchTechniciansList}
          technician={editingTechnician}
          hostels={hostels}
        />
      )}
    </div>
  );
}
