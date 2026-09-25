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
        <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src={becLogo} alt="BEC Logo" className="navbar-brand-logo" />
          <span className="navbar-logo-text">BEC Portal</span>
        </div>
      </div>
      
      <div className="navbar-right">
        {user && (
          <div 
            className="user-badge" 
            onClick={() => navigate('/profile')} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
            title="View Profile"
          >
            <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700 }}>
              {getInitials(user.full_name || user.username)}
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
