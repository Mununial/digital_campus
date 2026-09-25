import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { Undo2, ShieldAlert } from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isImpersonating, exitImpersonation } = useAuth();
  const [exiting, setExiting] = useState(false);
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleExitImpersonation = async () => {
    setExiting(true);
    try {
      const res = await exitImpersonation();
      if (res.success) {
        navigate('/admin/students');
      }
    } catch (err) {
      console.error('Failed to exit impersonation:', err);
    } finally {
      setExiting(false);
    }
  };

  return (
    <div className="app-layout">
      {/* Impersonation Top Floating Banner */}
      {isImpersonating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
          color: '#ffffff',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
          fontSize: '13.5px',
          fontWeight: 500
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              backgroundColor: '#4ade80',
              borderRadius: '50%',
              boxShadow: '0 0 8px #4ade80'
            }}></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} /> <strong>Super Admin Impersonation:</strong> You are logged in as <strong>{user?.full_name || user?.username}</strong> ({user?.student_profile?.student_code || user?.username})
            </span>
          </div>
          <button
            type="button"
            onClick={handleExitImpersonation}
            disabled={exiting}
            style={{
              background: '#ffffff',
              color: '#4f46e5',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Undo2 size={14} />
            {exiting ? 'Restoring Admin...' : 'Return to Super Admin'}
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      
      {/* Main Content Area */}
      <div className="main-wrapper" style={isImpersonating ? { paddingTop: '45px' } : {}}>
        <Navbar onToggleSidebar={handleToggleSidebar} />
        
        <main className="content-container">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
