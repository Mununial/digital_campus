import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import becLogo from '../assets/BEC LOGO FINAL.png';

const Navbar = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const formatRole = (role) => {
    if (!role) return '';
    return role.replace('_', ' ');
  };

  const getRoleBadgeColor = (role) => {
    if (role === 'SUPER_ADMIN') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (role === 'SUPERINTENDENT') return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button 
          className="mobile-menu-btn" 
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="navbar-brand" onClick={() => { window.location.href = '/'; }} style={{ cursor: 'pointer' }} title="Return to Main Campus Portal">
          <img src={becLogo} alt="BEC Logo" className="navbar-brand-logo" />
          <span className="navbar-logo-text">BEC Portal</span>
        </div>
      </div>
      
      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <a 
          href="/" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            cursor: 'pointer'
          }}
          title="Return to Main Campus Portal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Main Portal</span>
        </a>
        {user && (
          <div 
            className="user-badge" 
            onClick={() => navigate('/profile')} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
            title="View Profile"
          >
            <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(user.photo_url || user.studentPhotoUrl || user.photoUrl) ? (
                <img 
                  src={user.photo_url || user.studentPhotoUrl || user.photoUrl} 
                  alt={user.full_name || user.username} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                getInitials(user.full_name || user.username)
              )}
            </div>
            <div className="user-info-desktop">
              <span className="user-name">{user.full_name || user.username}</span>
              <span className={`user-role font-bold text-xs uppercase px-1.5 py-0.5 rounded border ${getRoleBadgeColor(user.role)}`}>
                {formatRole(user.role)}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
