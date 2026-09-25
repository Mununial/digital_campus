import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

/**
 * Route protection wrapper component.
 * @param {React.ReactNode} children - Component to render
 * @param {string[]} allowedRoles - List of roles permitted to view the page
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fullscreen-loading">
        <Loading message="Securing session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="forbidden-container">
        <div className="forbidden-card">
          <div className="forbidden-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <ShieldAlert size={48} color="#ef4444" />
          </div>
          <h1 className="forbidden-title">Access Denied</h1>
          <p className="forbidden-message">
            You do not have the required permissions to access this page.
          </p>
          <p className="forbidden-subtext">
            Required role: <strong>[{allowedRoles.join(', ')}]</strong>. Your role: <strong>{user?.role}</strong>.
          </p>
          <a href="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
