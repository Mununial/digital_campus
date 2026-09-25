import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import becLogo from '../assets/BEC LOGO FINAL.png';
import {
  LayoutDashboard,
  Database,
  Wrench,
  Users,
  ClipboardList,
  ShieldCheck,
  Building2,
  GraduationCap,
  BedDouble,
  BarChart3,
  UserCheck,
  AlertCircle,
  CalendarCheck,
  Bell,
  User,
  Utensils,
  CreditCard,
  DoorOpen,
  FileText,
  LogOut,
  Home
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count for active user
  useEffect(() => {
    if (user) {
      api.getUnreadCount()
        .then(res => {
          if (res.success) {
            setUnreadCount(res.unreadCount || 0);
          }
        })
        .catch(err => console.error('Failed to fetch unread notice count:', err));
    }
  }, [user, location.pathname]);

  // Define navigation schemas per user role
  const getNavItems = () => {
    if (!user) return [];

    const roleUpper = String(user.role || '').toUpperCase();

    if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN' || user.role === 'Admin') {
      return [
        { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/admin/dashboard' },
        { label: 'Master Data Hub', icon: <Database size={18} />, path: '/admin/master' },
        { label: 'Gate Pass & Outings', icon: <DoorOpen size={18} />, path: '/admin/gate-passes' },
        { label: 'Leave Applications', icon: <FileText size={18} />, path: '/admin/leaves' },
        { label: 'Room Applications', icon: <BedDouble size={18} />, path: '/admin/room-applications' },
        { label: 'Documents & Certificates', icon: <FileText size={18} />, path: '/admin/documents' },
        { label: 'Campus Cafeteria', icon: <Utensils size={18} />, path: '/admin/cafeteria' },
        { label: 'Maintenance Requests', icon: <Wrench size={18} />, path: '/admin/maintenance' },
        { label: 'User Directory', icon: <Users size={18} />, path: '/admin/users' },
        { label: 'Activity Log', icon: <ClipboardList size={18} />, path: '/admin/activity' },
        { label: 'Security Audit', icon: <ShieldCheck size={18} />, path: '/admin/security-audit' },
        { label: 'Hostels', icon: <Building2 size={18} />, path: '/admin/hostels' },
        { label: 'Students', icon: <GraduationCap size={18} />, path: '/admin/students' },
        { label: 'Allocations & Transfers', icon: <BedDouble size={18} />, path: '/admin/allocations' },
        { label: 'Reports Center', icon: <BarChart3 size={18} />, path: '/admin/reports' },
        { label: 'Visitors', icon: <UserCheck size={18} />, path: '/admin/visitors' },
        { label: 'Complaints', icon: <AlertCircle size={18} />, path: '/admin/complaints' },
        { label: 'Mess & Food', icon: <Utensils size={18} />, path: '/admin/mess' },
        { label: 'Attendance', icon: <CalendarCheck size={18} />, path: '/admin/attendance' },
        { label: 'Notices', icon: <Bell size={18} />, path: '/admin/notices', badge: unreadCount },
        { label: 'My Profile', icon: <User size={18} />, path: '/profile' },
      ];
    }

    if (roleUpper === 'SUPERINTENDENT' || roleUpper.includes('FACULTY') || roleUpper.includes('WARDEN')) {
      return [
        { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/superintendent/dashboard' },
        { label: 'Gate Pass & Outings', icon: <DoorOpen size={18} />, path: '/superintendent/gate-passes' },
        { label: 'Leave Applications', icon: <FileText size={18} />, path: '/superintendent/leaves' },
        { label: 'Room Applications', icon: <BedDouble size={18} />, path: '/superintendent/room-applications' },
        { label: 'Documents & Certificates', icon: <FileText size={18} />, path: '/superintendent/documents' },
        { label: 'Campus Cafeteria', icon: <Utensils size={18} />, path: '/superintendent/cafeteria' },
        { label: 'Maintenance Requests', icon: <Wrench size={18} />, path: '/superintendent/maintenance' },
        { label: 'My Hostels', icon: <Building2 size={18} />, path: '/superintendent/hostels' },
        { label: 'Students', icon: <GraduationCap size={18} />, path: '/superintendent/students' },
        { label: 'Allocations & Transfers', icon: <BedDouble size={18} />, path: '/superintendent/allocations' },
        { label: 'Activity Log', icon: <ClipboardList size={18} />, path: '/superintendent/activity' },
        { label: 'Reports Center', icon: <BarChart3 size={18} />, path: '/superintendent/reports' },
        { label: 'Visitors', icon: <UserCheck size={18} />, path: '/superintendent/visitors' },
        { label: 'Complaints', icon: <AlertCircle size={18} />, path: '/superintendent/complaints' },
        { label: 'Mess & Food', icon: <Utensils size={18} />, path: '/superintendent/mess' },
        { label: 'Attendance', icon: <CalendarCheck size={18} />, path: '/superintendent/attendance' },
        { label: 'Notices', icon: <Bell size={18} />, path: '/superintendent/notices', badge: unreadCount },
        { label: 'My Profile', icon: <User size={18} />, path: '/profile' },
      ];
    }

    return [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/student/dashboard' },
      { label: 'My Accommodation', icon: <BedDouble size={18} />, path: '/student/accommodation' },
      { label: 'Room Application', icon: <BedDouble size={18} />, path: '/student/room-applications' },
      { label: 'Gate Pass & Outings', icon: <DoorOpen size={18} />, path: '/student/gate-passes' },
      { label: 'Leave Applications', icon: <FileText size={18} />, path: '/student/leaves' },
      { label: 'Documents & Certificates', icon: <FileText size={18} />, path: '/student/documents' },
      { label: 'Campus Cafeteria', icon: <Utensils size={18} />, path: '/student/cafeteria' },
      { label: 'My Maintenance', icon: <Wrench size={18} />, path: '/student/maintenance' },
      { label: 'Visitors', icon: <UserCheck size={18} />, path: '/student/visitors' },
      { label: 'My Complaints', icon: <AlertCircle size={18} />, path: '/student/complaints' },
      { label: 'Notices', icon: <Bell size={18} />, path: '/student/notices', badge: unreadCount },
      { label: 'Mess Schedule', icon: <Utensils size={18} />, path: '/student/mess' },
      { label: 'My Attendance', icon: <CalendarCheck size={18} />, path: '/student/attendance' },
      { label: 'My Profile', icon: <User size={18} />, path: '/profile' },
    ];
  };

  const navItems = getNavItems();

  const isItemActive = (item) => {
    if (item.path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src={becLogo} alt="BEC Logo" className="sidebar-brand-logo" />
            <span className="sidebar-logo">BEC CHMS</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <ul className="sidebar-menu-list">
            {/* Direct Link to Main Doorway Portal */}
            <li className="sidebar-menu-item" style={{ marginBottom: '10px' }}>
              <a 
                href="/" 
                className="sidebar-menu-link"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(30,58,138,0.18) 100%)', 
                  color: '#1d4ed8', 
                  fontWeight: '700',
                  border: '1px solid rgba(37,99,235,0.3)',
                  borderRadius: '10px'
                }}
              >
                <span className="sidebar-menu-icon" style={{ display: 'inline-flex', alignItems: 'center', color: '#1d4ed8' }}>
                  <Home size={18} />
                </span>
                <span className="sidebar-menu-label">Main Campus Portal</span>
              </a>
            </li>

            {navItems.map((item, idx) => {
              const active = isItemActive(item);
              return (
                <li key={idx} className="sidebar-menu-item" onClick={onClose}>
                  <Link to={item.path} className={`sidebar-menu-link ${active ? 'active' : ''}`}>
                    <span className="sidebar-menu-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {item.icon}
                    </span>
                    <span className="sidebar-menu-label">{item.label}</span>
                    {Boolean(item.badge && item.badge > 0) && (
                      <span className="sidebar-unread-badge" title={`${item.badge} unread notices`}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
            
            {/* Direct Logout action in list */}
            <li className="sidebar-menu-item sidebar-logout-item">
              <button onClick={logout} className="sidebar-menu-link sidebar-logout-btn">
                <span className="sidebar-menu-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <LogOut size={18} />
                </span>
                <span className="sidebar-menu-label">Logout</span>
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <div className="sidebar-user-badge">
            <div className="avatar-mini" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(user?.photo_url || user?.studentPhotoUrl || user?.photoUrl) ? (
                <img 
                  src={user.photo_url || user.studentPhotoUrl || user.photoUrl} 
                  alt={user.full_name || user.username} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                user?.full_name 
                  ? user.full_name.substring(0, 2).toUpperCase() 
                  : (user?.username ? user.username.substring(0, 2).toUpperCase() : 'AD')
              )}
            </div>
            <div className="badge-meta">
              <span className="badge-name" title={user?.full_name || user?.email || user?.username || 'User'}>
                {user?.full_name || user?.username || 'User'}
              </span>
              <span className="badge-role">{user?.role || 'Guest'}</span>
            </div>
          </div>
          <span className="version-tag">Foundation v1.0.0</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
