import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatCard from '../components/StatCard';
import HostelCard from '../components/HostelCard';
import AttendanceChart from '../components/AttendanceChart';
import OccupancySummary from '../components/OccupancySummary';
import RecentNoticesSection from '../components/RecentNoticesSection';
import RecentComplaintsSection from '../components/complaints/RecentComplaintsSection';
import NoticeDetailsModal from '../components/NoticeDetailsModal';
import VisitorFormModal from '../components/visitors/VisitorFormModal';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import {
  Building2,
  GraduationCap,
  DoorClosed,
  BedDouble,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  BarChart3,
  RefreshCw,
  ClipboardList,
  Bell,
  AlertCircle
} from 'lucide-react';
import './SuperintendentDashboard.css';

const buildStats = (overall) => [
  { title: 'My Hostels',    value: overall.totalHostels,           icon: <Building2 size={20} />, color: 'blue'  },
  { title: 'Students',      value: overall.totalStudents,          icon: <GraduationCap size={20} />, color: 'blue'  },
  { title: 'Rooms',         value: overall.totalRooms,             icon: <DoorClosed size={20} />                 },
  { title: 'Total Beds',    value: overall.totalBeds,              icon: <BedDouble size={20} />                },
  { title: 'Occupied Beds', value: overall.occupiedBeds,           icon: <CheckCircle2 size={20} />, color: 'green' },
  { title: 'Available',     value: overall.availableBeds,          icon: <CheckCircle2 size={20} />, color: 'green' },
  { title: 'Maintenance',   value: overall.maintenanceBeds,        icon: <AlertTriangle size={20} />, color: 'amber' },
  { title: 'Present Today', value: overall.present,                icon: <UserCheck size={20} />, color: 'green' },
  { title: 'Absent Today',  value: overall.absent,                 icon: <UserX size={20} />, color: 'red'   },
  { title: 'Not Marked',    value: overall.notMarked,              icon: <Clock size={20} />, color: 'amber' },
  { title: 'Attendance %',  value: `${overall.attendancePercentage}%`, icon: <TrendingUp size={20} />, color: 'blue' },
  { title: 'Occupancy %',   value: `${overall.occupancyPercentage}%`,  icon: <BarChart3 size={20} />, color: 'blue' },
];

function SuperintendentDashboard() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('all');
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getDashboardOverview();
      setData(resp.data || resp);
    } catch (err) {
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const visibleHostels = data?.hostels?.filter(h =>
    filter === 'all' || String(h.hostelId) === filter
  ) ?? [];

  return (
    <div className="super-dashboard page-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Superintendent Dashboard</h1>
          <p className="dashboard-subtitle">Your assigned hostels overview & student management</p>
        </div>
        <button
          className="refresh-btn"
          onClick={fetchData}
          disabled={loading}
          aria-label="Refresh dashboard data"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </header>

      {/* Quick Actions */}
      <nav className="quick-actions" aria-label="Quick actions">
        <button onClick={() => navigate('/superintendent/students')}   className="qa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <GraduationCap size={16} /> Students
        </button>
        <button onClick={() => navigate('/superintendent/hostels')}    className="qa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Building2 size={16} /> Rooms & Beds
        </button>
        <button onClick={() => navigate('/superintendent/reports')}    className="qa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <BarChart3 size={16} /> View Reports
        </button>
        <button onClick={() => navigate('/superintendent/attendance')} className="qa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ClipboardList size={16} /> Mark Attendance
        </button>
        <button onClick={() => navigate('/superintendent/notices')}    className="qa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Bell size={16} /> Notice Board
        </button>
      </nav>

      {/* Error */}
      {error && (
        <div className="dashboard-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} color="#ef4444" />
          <p style={{ margin: 0 }}>{error}</p>
          <button onClick={fetchData} className="retry-btn">Retry</button>
        </div>
      )}

      {/* Overall stats — skeleton while loading */}
      {loading ? (
        <div className="overall-stats-grid" aria-busy="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <StatCard key={i} title="" value="" loading />
          ))}
        </div>
      ) : (!error && data && (
        <div className="overall-stats-grid">
          {buildStats(data.overall).map(s => (
            <StatCard key={s.title} title={s.title} value={s.value} icon={s.icon} color={s.color} />
          ))}
        </div>
      ))}

      {/* Recent Notices Section */}
      {!loading && !error && (
        <RecentNoticesSection
          notices={data?.recentNotices || []}
          userRole="SUPERINTENDENT"
          onViewNotice={(n) => setSelectedNotice(n)}
        />
      )}

      {/* Complaints Section */}
      {!loading && !error && (
        <RecentComplaintsSection
          user={{ role: 'SUPERINTENDENT' }}
          complaintsPath="/superintendent/complaints"
        />
      )}

      {/* Charts + hostel cards */}
      {!loading && !error && data && (
        <>
          <div className="dashboard-charts">
            <AttendanceChart
              present={data.overall.present}
              absent={data.overall.absent}
              notMarked={data.overall.notMarked}
            />
            <OccupancySummary
              occupied={data.overall.occupiedBeds}
              available={data.overall.availableBeds}
              maintenance={data.overall.maintenanceBeds}
              occupancyPercentage={data.overall.occupancyPercentage}
            />
          </div>

          {/* System Recent Activity Audit Widget */}
          <div className="mb-6">
            <RecentActivity onNavigateAll={() => navigate('/superintendent/activity')} />
          </div>

          <div className="hostels-section">
            <div className="hostels-section__header">
              <h2 className="section-title">My Hostels</h2>
              {data.hostels.length > 1 && (
                <select
                  className="hostel-filter"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  aria-label="Filter by hostel"
                >
                  <option value="all">All Hostels</option>
                  {data.hostels.map(h => (
                    <option key={h.hostelId} value={String(h.hostelId)}>{h.name}</option>
                  ))}
                </select>
              )}
            </div>

            {visibleHostels.length === 0 ? (
              <p className="empty-state">No hostels assigned to your account.</p>
            ) : (
              <div className="hostel-cards-grid">
                {visibleHostels.map(h => (
                  <HostelCard key={h.hostelId} hostel={h} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedNotice && (
        <NoticeDetailsModal
          notice={selectedNotice}
          userRole="SUPERINTENDENT"
          onClose={() => setSelectedNotice(null)}
        />
      )}

      {/* Visitor Form Modal */}
      <VisitorFormModal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        onSubmitSuccess={() => setIsVisitorModalOpen(false)}
        userRole="SUPERINTENDENT"
      />
    </div>
  );
}

export default SuperintendentDashboard;
