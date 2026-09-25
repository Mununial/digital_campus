import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import './MasterData.css';

const DataIntegrityPage = () => {
  const [integrityData, setIntegrityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [activeSeverity, setActiveSeverity] = useState('ALL');

  // Repair Action State
  const [repairingIssue, setRepairingIssue] = useState(null);
  const [repairing, setRepairing] = useState(false);
  const [repairSuccessMsg, setRepairSuccessMsg] = useState(null);

  useEffect(() => {
    runDiagnosticCheck();
  }, []);

  const runDiagnosticCheck = async () => {
    try {
      setScanning(true);
      setError(null);
      setRepairSuccessMsg(null);
      const res = await api.getDataIntegrity();
      if (res.success) {
        setIntegrityData(res.data);
      } else {
        setError(res.message || 'Failed to complete data integrity scan.');
      }
    } catch (err) {
      setError(err.message || 'Error running data integrity scan.');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const handleExecuteRepair = async (issue, action) => {
    if (!window.confirm(`Are you sure you want to perform repair "${action}" for ${issue.title}?`)) {
      return;
    }

    try {
      setRepairing(true);
      setError(null);
      setRepairSuccessMsg(null);

      const res = await api.repairDataIntegrity(issue.type, issue.target_id || issue.id, action);
      if (res.success) {
        setRepairSuccessMsg(`✓ Successfully repaired: ${issue.title}`);
        runDiagnosticCheck();
      } else {
        setError(res.message || 'Failed to repair integrity issue.');
      }
    } catch (err) {
      setError(err.message || 'Error executing repair action.');
    } finally {
      setRepairing(false);
      setRepairingIssue(null);
    }
  };

  if (loading) return <Loading message="Initializing Data Integrity Center..." />;

  const summary = integrityData?.summary || { critical: 0, warning: 0, info: 0, totalIssues: 0 };
  const issues = integrityData?.issues || [];

  const filteredIssues = activeSeverity === 'ALL'
    ? issues
    : issues.filter(i => i.severity === activeSeverity);

  return (
    <div className="master-page-container">
      {/* Header */}
      <div className="master-header">
        <div className="master-header-left">
          <div className="master-breadcrumbs">
            <Link to="/admin/master">Master Data</Link>
            <span className="master-breadcrumbs-separator">/</span>
            <span>Data Integrity</span>
          </div>
          <h1 className="master-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-stethoscope text-indigo-600"></i>
            <span>Data Integrity Diagnostic Center</span>
          </h1>
          <p className="master-subtitle">
            Scan and detect relational inconsistencies, ghost allocations, orphaned records, and schema gaps.
          </p>
        </div>
        <button
          onClick={runDiagnosticCheck}
          disabled={scanning}
          className="master-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <i className={`fa-solid ${scanning ? 'fa-spinner fa-spin' : 'fa-magnifying-glass-chart'}`}></i>
          <span>{scanning ? 'Scanning System...' : 'Run Integrity Scan'}</span>
        </button>
      </div>

      {error && (
        <div className="master-alert-error">
          <span>{error}</span>
        </div>
      )}
      {repairSuccessMsg && (
        <div className="alert alert-success mb-4" style={{ borderRadius: '8px', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }}>
          {repairSuccessMsg}
        </div>
      )}

      {/* Severity Breakdown Cards */}
      <div className="severity-card-grid">
        <div
          onClick={() => setActiveSeverity('ALL')}
          className={`severity-card ${activeSeverity === 'ALL' ? 'active' : ''}`}
        >
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total Issues Detected
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: '4px 0' }}>
            {summary.totalIssues}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Across 15 integrity rules</div>
        </div>

        <div
          onClick={() => setActiveSeverity('CRITICAL')}
          className={`severity-card ${activeSeverity === 'CRITICAL' ? 'active' : ''}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#e11d48', textTransform: 'uppercase' }}>CRITICAL</span>
            <span className="badge-status badge-inactive">High Risk</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#e11d48', margin: '4px 0' }}>
            {summary.critical}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Allocation / Occupancy mismatches</div>
        </div>

        <div
          onClick={() => setActiveSeverity('WARNING')}
          className={`severity-card ${activeSeverity === 'WARNING' ? 'active' : ''}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>WARNING</span>
            <span className="badge-status badge-maintenance">Medium Risk</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#d97706', margin: '4px 0' }}>
            {summary.warning}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Status inconsistencies & duplicates</div>
        </div>

        <div
          onClick={() => setActiveSeverity('INFO')}
          className={`severity-card ${activeSeverity === 'INFO' ? 'active' : ''}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>INFO</span>
            <span className="badge-status badge-available">Low Risk</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#2563eb', margin: '4px 0' }}>
            {summary.info}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Missing metadata / optional fields</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tab-bar">
        {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
          <button
            key={sev}
            onClick={() => setActiveSeverity(sev)}
            className={`filter-tab-btn ${activeSeverity === sev ? 'active' : ''}`}
          >
            {sev} ({sev === 'ALL' ? summary.totalIssues : (summary[sev.toLowerCase()] || 0)})
          </button>
        ))}
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="master-empty-state">
          <span className="master-empty-icon"></span>
          <h3 className="master-empty-title">Zero Integrity Issues Found</h3>
          <p className="master-empty-desc">
            All master data relationships, room allocations, and bed occupancy states are 100% healthy.
          </p>
        </div>
      ) : (
        <div>
          {filteredIssues.map((issue, idx) => {
            const badgeClass = issue.severity === 'CRITICAL'
              ? 'badge-inactive'
              : (issue.severity === 'WARNING' ? 'badge-maintenance' : 'badge-available');

            return (
              <div key={idx} className="diagnostic-issue-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className={`badge-status ${badgeClass}`}>
                      <span className="badge-status-dot" />
                      {issue.severity}
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                      {issue.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#475569', margin: '4px 0 8px 0' }}>
                    {issue.description}
                  </p>
                  {issue.recommendation && (
                    <div style={{ fontSize: '12.5px', color: '#4f46e5', fontWeight: '500' }}>
                      Recommended Action: {issue.recommendation}
                    </div>
                  )}
                </div>

                {issue.repair_actions && issue.repair_actions.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {issue.repair_actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        disabled={repairing}
                        onClick={() => handleExecuteRepair(issue, act.action)}
                        className="master-action-btn btn-action-edit"
                      >
                         {act.label || act.action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DataIntegrityPage;
