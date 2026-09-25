import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import './MasterData.css';

const MasterOverviewPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMasterSummary();
      if (res.success) {
        setSummary(res.data);
      } else {
        setError(res.message || 'Failed to load master data summary.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching master data summary.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading Master Data Metrics..." />;

  const metricItems = [
    { label: 'Total Hostels', value: summary?.totalHostels ?? summary?.hostels ?? 0, icon: 'fa-building', bg: '#e0e7ff', color: '#4338ca' },
    { label: 'Total Floors', value: summary?.totalFloors ?? summary?.floors ?? 0, icon: 'fa-layer-group', bg: '#dbeafe', color: '#1e40af' },
    { label: 'Total Rooms', value: summary?.totalRooms ?? summary?.rooms ?? 0, icon: 'fa-door-open', bg: '#cff4fc', color: '#055160' },
    { label: 'Total Beds', value: summary?.totalBeds ?? summary?.beds ?? 0, icon: 'fa-bed', bg: '#f3e8ff', color: '#6b21a8' },
    { label: 'Available Beds', value: summary?.availableBeds ?? 0, icon: 'fa-circle-check', bg: '#d1fae5', color: '#065f46' },
    { label: 'Occupied Beds', value: summary?.occupiedBeds ?? 0, icon: 'fa-user-check', bg: '#fef3c7', color: '#92400e' },
    { label: 'Maintenance Beds', value: summary?.maintenanceBeds ?? 0, icon: 'fa-wrench', bg: '#ffe4e6', color: '#9f1239' },
    { label: 'Unallocated Students', value: summary?.unallocatedStudents ?? 0, icon: 'fa-user-clock', bg: '#ffedd5', color: '#9a3412' }
  ];

  const steps = [
    { title: 'Hostels', step: 'Step 1', icon: 'fa-building', path: '/admin/master/hostels', desc: 'Manage hostels, codes, capacity, and active status.' },
    { title: 'Floors', step: 'Step 2', icon: 'fa-layer-group', path: '/admin/master/floors', desc: 'Manage hostel floors, level numbers, and floor naming.' },
    { title: 'Rooms', step: 'Step 3', icon: 'fa-door-open', path: '/admin/master/rooms', desc: 'Manage room numbers, capacity limits, and room status.' },
    { title: 'Beds', step: 'Step 4', icon: 'fa-bed', path: '/admin/master/beds', desc: 'Manage bed identifiers, occupancy status, and assignments.' }
  ];

  return (
    <div className="master-page-container">
      {/* Header */}
      <div className="master-header">
        <div className="master-header-left">
          <h1 className="master-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-cubes text-indigo-600"></i>
            <span>Master Data Hub</span>
          </h1>
          <p className="master-subtitle">
            Centralized administration and infrastructure hierarchy management.
          </p>
        </div>
        <Link to="/admin/master/data-integrity" className="master-btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-stethoscope"></i>
          <span>Data Integrity Center</span>
        </Link>
      </div>

      {error && (
        <div className="master-alert-error">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i>
          <span>{error}</span>
          <button className="master-action-btn btn-action-edit" style={{ marginLeft: '12px' }} onClick={fetchSummary}>
            Retry
          </button>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {metricItems.map((item, idx) => (
          <div key={idx} style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: item.bg,
              color: item.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0
            }}>
              <i className={`fa-solid ${item.icon}`}></i>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Infrastructure Hierarchy Cards */}
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="fa-solid fa-sitemap text-indigo-600"></i>
        <span>Infrastructure Hierarchy Management</span>
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {steps.map((s, idx) => (
          <Link key={idx} to={s.path} style={{
            textDecoration: 'none',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.12)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
            e.currentTarget.style.transform = 'none';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '24px', color: '#4f46e5' }}>
                <i className={`fa-solid ${s.icon}`}></i>
              </span>
              <span className="badge-status badge-available">{s.step}</span>
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '4px 0' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                {s.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Safety Notice */}
      <div style={{
        background: '#eef2ff',
        border: '1px solid #c7d2fe',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <span style={{ fontSize: '24px', color: '#4338ca' }}>
          <i className="fa-solid fa-shield-halved"></i>
        </span>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#3730a3', margin: 0 }}>
            Safety & Infrastructure Hierarchy Active
          </h4>
          <p style={{ fontSize: '13px', color: '#4338ca', margin: '2px 0 0 0' }}>
            Hostels, floors, rooms, and occupied beds are protected from accidental deletion when active student allocations exist.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MasterOverviewPage;
