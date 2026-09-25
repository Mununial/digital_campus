import React, { useState } from 'react';
import api from '../services/api';
import { Lock, Check, Circle, X, LogOut } from 'lucide-react';
import './ForcePasswordChangeModal.css';

const ForcePasswordChangeModal = ({ user, onPasswordChanged, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isFirstTimeActivation = Boolean(user?.must_change_password);

  // Password requirements calculation
  const reqs = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword
  };

  const isFormValid = reqs.length && reqs.upper && reqs.lower && reqs.number && reqs.match && (isFirstTimeActivation || Boolean(currentPassword));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.changePassword({
        current_password: isFirstTimeActivation ? undefined : currentPassword,
        new_password: newPassword
      });

      setSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => {
        if (onPasswordChanged) onPasswordChanged();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="force-password-overlay">
      <div className="force-password-modal">
        {/* Close (X) button in header */}
        <button
          type="button"
          className="force-password-close-btn"
          onClick={handleDismiss}
          title="Close modal and logout"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="force-password-header">
          <div className="force-password-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <Lock size={36} color="#4f46e5" />
          </div>
          <h2>Password Change Required</h2>
          <p>
            {isFirstTimeActivation
              ? 'You are completing first-time account activation. Please set your new account password to proceed.'
              : 'For security compliance, please set a new password to access your account.'}
          </p>
        </div>

        {error && <div className="alert alert-danger" style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>{success}</div>}

        <form onSubmit={handleSubmit} className="force-password-form">
          {!isFirstTimeActivation && (
            <div className="form-group">
              <label htmlFor="current-pass">Current Password *</label>
              <input
                id="current-pass"
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required={!isFirstTimeActivation}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="new-pass">New Password *</label>
            <input
              id="new-pass"
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-pass">Confirm New Password *</label>
            <input
              id="confirm-pass"
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>

          <div className="password-checklist">
            <div className="checklist-title">Password Security Requirements:</div>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              <li className={reqs.length ? 'met' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {reqs.length ? <Check size={14} color="#16a34a" /> : <Circle size={14} color="#94a3b8" />} At least 8 characters long
              </li>
              <li className={reqs.upper ? 'met' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {reqs.upper ? <Check size={14} color="#16a34a" /> : <Circle size={14} color="#94a3b8" />} At least one uppercase letter (A-Z)
              </li>
              <li className={reqs.lower ? 'met' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {reqs.lower ? <Check size={14} color="#16a34a" /> : <Circle size={14} color="#94a3b8" />} At least one lowercase letter (a-z)
              </li>
              <li className={reqs.number ? 'met' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {reqs.number ? <Check size={14} color="#16a34a" /> : <Circle size={14} color="#94a3b8" />} At least one number (0-9)
              </li>
              <li className={reqs.match ? 'met' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {reqs.match ? <Check size={14} color="#16a34a" /> : <Circle size={14} color="#94a3b8" />} Passwords match
              </li>
            </ul>
          </div>

          <div className="force-password-actions" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="submit"
              className="btn btn-primary submit-btn"
              disabled={!isFormValid || loading}
              style={{ flex: 1, padding: '0.75rem', fontWeight: 600 }}
            >
              {loading ? 'Updating Password...' : 'Set New Password & Continue'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary cancel-btn"
              onClick={handleDismiss}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              <LogOut size={16} /> Cancel & Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChangeModal;
