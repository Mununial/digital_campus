import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import RecentNoticesSection from '../components/RecentNoticesSection';
import RecentComplaintsSection from '../components/complaints/RecentComplaintsSection';
import NoticeDetailsModal from '../components/NoticeDetailsModal';
import VisitorFormModal from '../components/visitors/VisitorFormModal';
import ComplaintFormModal from '../components/complaints/ComplaintFormModal';
import Loading from '../components/Loading';
import {
  BedDouble,
  Bell,
  Wrench,
  CalendarCheck,
  Utensils,
  User,
  DoorClosed,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [studentProfile, setStudentProfile] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotices, setRecentNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard overview, unread notices, student profile, and accommodation in parallel
      const [dashRes, unreadRes, profileRes, allocRes] = await Promise.allSettled([
        api.getDashboardOverview(),
        api.getUnreadCount(),
        api.get('/students/me'),
        api.getMyAllocation()
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.success && Array.isArray(dashRes.value.recentNotices)) {
        setRecentNotices(dashRes.value.recentNotices);
      }

      if (unreadRes.status === 'fulfilled' && unreadRes.value?.success) {
        setUnreadCount(unreadRes.value.unreadCount || 0);
      }

      if (profileRes.status === 'fulfilled' && profileRes.value?.student) {
        setStudentProfile(profileRes.value.student);
      }

      if (allocRes.status === 'fulfilled') {
        const allocData = allocRes.value?.data?.data || allocRes.value?.data || allocRes.value;
        if (allocData) {
          setAllocation(allocData.currentAllocation || null);
          setRoommates(allocData.roommates || []);
        }
      }

    } catch (err) {
      console.error('Failed to load student dashboard:', err);
      setError(err.message || 'Unable to load student dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleReadMarked = (noticeId) => {
    setRecentNotices(prev => prev.map(n => n.id === noticeId ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return <Loading message="Preparing your student dashboard..." />;
  }

  const displayName = studentProfile?.full_name || user?.full_name || user?.name || user?.username || 'Student';
  const displayRoll = studentProfile?.roll_number || user?.rollNo || studentProfile?.student_id || user?.username || '';
  const userPhoto = user?.photo_url || user?.studentPhotoUrl || user?.photoUrl || studentProfile?.photo_url || studentProfile?.studentPhotoUrl;

  return (
    <div className="student-dashboard">
      {/* 1. Welcome & Academic Identity Banner */}
      <div className="student-welcome-banner">
        <div className="banner-glow"></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', zIndex: 1, flexWrap: 'wrap' }}>
          {userPhoto && (
            <img 
              src={userPhoto} 
              alt={displayName} 
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #6366f1',
                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                background: '#fff',
                flexShrink: 0
              }} 
            />
          )}
          <div className="welcome-info">
            <span className="welcome-greeting-tag">{getGreeting()}, Welcome Back</span>
            <h1 className="welcome-name">{displayName}</h1>
            <div className="welcome-academic-pills">
              <span className="academic-pill highlight">
                {studentProfile?.branch || user?.branch || 'Computer Science & Engineering (CSE)'}
              </span>
              <span className="academic-pill">
                Year {studentProfile?.year || 1} • Sem {studentProfile?.semester || 1}
              </span>
              <span className="academic-pill">
                Roll No: <strong>{displayRoll}</strong>
              </span>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="unread-alert-badge-card" onClick={() => navigate('/student/notices')}>
            <span className="alert-bell"><Bell size={18} /></span>
            <div className="alert-text">
              <span className="alert-count">{unreadCount} Unread Notice{unreadCount > 1 ? 's' : ''}</span>
              <span className="alert-action">Tap to view →</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="dashboard-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* 2. Prominent Room & Bed Identity Card */}
      <div className="student-bed-hero-card">
        <div className="bed-hero-main">
          <span className={`bed-status-tag ${allocation ? 'allocated' : 'unallocated'}`}>
            {allocation ? '● Active Room Allocation' : '○ Pending Room Allocation'}
          </span>
          <h2 className="bed-hostel-title">
            {allocation ? allocation.hostel_name : 'No room allotted yet'}
          </h2>
          <p className="bed-sub-text">
            {allocation
              ? `${allocation.hostel_code ? `[${allocation.hostel_code}] ` : ''}${allocation.floor_name || 'Ground Floor'} • Campus Hostel Block`
              : 'Please contact hostel administration or superintendent for bed allocation.'}
          </p>
        </div>

        <div className="bed-hero-badges">
          {allocation ? (
            <>
              <div className="bed-pill-badge">
                <span className="bed-pill-label">Room</span>
                <span className="bed-pill-val">Room {allocation.room_number}</span>
              </div>
              <div className="bed-pill-badge">
                <span className="bed-pill-label">Allocated Bed</span>
                <span className="bed-pill-val">Bed {allocation.bed_number}</span>
              </div>
              {roommates.length > 0 && (
                <div className="bed-pill-badge">
                  <span className="bed-pill-label">Roommates</span>
                  <span className="bed-pill-val">{roommates.length} Active</span>
                </div>
              )}
            </>
          ) : (
            <div className="bed-pill-badge">
              <span className="bed-pill-label">Status</span>
              <span className="bed-pill-val">Contact Warden</span>
            </div>
          )}

          <button
            type="button"
            className="btn-view-accommodation"
            onClick={() => navigate('/student/accommodation')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            Stay Details <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 3. Quick Action Navigation Grid */}
      <div className="student-actions-grid">
        <div className="action-tile tile-accommodation" onClick={() => navigate('/student/accommodation')}>
          <div className="tile-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BedDouble size={22} />
          </div>
          <div className="tile-content">
            <h3>Accommodation</h3>
            <p>{allocation ? `Room ${allocation.room_number}, Bed ${String(allocation.bed_number || '').replace(/^bed\s+/i, '').trim()}` : 'No room allotted yet'}</p>
          </div>
        </div>

        <div className="action-tile tile-notices" onClick={() => navigate('/student/notices')}>
          <div className="tile-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={22} />
          </div>
          <div className="tile-content">
            <h3>Notice Board</h3>
            <p>Read hostel notices & circulars</p>
          </div>
          {unreadCount > 0 && <span className="tile-badge">{unreadCount}</span>}
        </div>

        <div className="action-tile tile-complaints" onClick={() => navigate('/student/complaints')}>
          <div className="tile-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={22} />
          </div>
          <div className="tile-content">
            <h3>My Complaints</h3>
            <p>Submit & track maintenance</p>
          </div>
        </div>

        <div className="action-tile tile-attendance" onClick={() => navigate('/student/attendance')}>
          <div className="tile-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarCheck size={22} />
          </div>
          <div className="tile-content">
            <h3>My Attendance</h3>
            <p>Daily check-ins & monthly record</p>
          </div>
        </div>

        <div className="action-tile tile-mess" onClick={() => navigate('/student/mess')}>
          <div className="tile-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Utensils size={22} />
          </div>
          <div className="tile-content">
            <h3>Hostel Mess</h3>
            <p>Daily meal menu & schedule</p>
          </div>
        </div>

        <div className="action-tile tile-profile" onClick={() => navigate('/profile')}>
          <div className="tile-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={22} />
          </div>
          <div className="tile-content">
            <h3>My Profile</h3>
            <p>Student ID & personal account</p>
          </div>
        </div>
      </div>

      {/* 4. Split Dashboard Content Sections */}
      <div className="dashboard-content-split">
        {/* Left Column: Recent Notices */}
        <div className="dashboard-column">
          <RecentNoticesSection
            notices={recentNotices}
            userRole="STUDENT"
            onViewNotice={(notice) => setSelectedNotice(notice)}
            loading={false}
          />
        </div>

        {/* Right Column: Complaints Tracker & Visitor Quick Action */}
        <div className="dashboard-column">
          <RecentComplaintsSection
            user={user}
            complaintsPath="/student/complaints"
          />

          {/* Visitor Pass Quick Action Card */}
          <div className="visitor-quick-banner">
            <div className="visitor-quick-info">
              <div className="visitor-quick-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DoorClosed size={22} />
              </div>
              <div>
                <h4>Visitor Gate Passes</h4>
                <p>Request entry passes for visiting family or guests</p>
              </div>
            </div>
            <div className="visitor-quick-actions">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setIsVisitorModalOpen(true)}
              >
                + Request Pass
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => navigate('/student/visitors')}
              >
                All Passes →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <NoticeDetailsModal
          notice={selectedNotice}
          userRole="STUDENT"
          onClose={() => setSelectedNotice(null)}
          onReadMarked={handleReadMarked}
        />
      )}

      {/* Visitor Request Form Modal */}
      <VisitorFormModal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        onSubmitSuccess={() => setIsVisitorModalOpen(false)}
        userRole="STUDENT"
      />

      {/* Complaint Form Modal */}
      {isComplaintModalOpen && (
        <ComplaintFormModal
          isOpen={isComplaintModalOpen}
          onClose={() => setIsComplaintModalOpen(false)}
          onSubmitSuccess={() => setIsComplaintModalOpen(false)}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
