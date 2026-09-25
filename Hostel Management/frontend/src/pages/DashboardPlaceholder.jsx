import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Loading from '../components/Loading';
import Error from '../components/Error';
import Button from '../components/Button';
import Input from '../components/Input';
import { GraduationCap } from 'lucide-react';


const DashboardPlaceholder = () => {
  const { user } = useAuth();
  const [hostels, setHostels] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (user.role === 'SUPER_ADMIN' || user.role === 'SUPERINTENDENT') {
        // Fetch health status and hostels (filtered server-side based on role)
        const [healthRes, hostelsRes] = await Promise.all([
          api.get('/health').catch(err => ({ status: 'DEGRADED', services: { database: { status: 'DISCONNECTED' } } })),
          api.get('/hostels')
        ]);
        setHealth(healthRes);
        setHostels(hostelsRes.data || []);
      } else if (user.role === 'STUDENT') {
        // Fetch student's own profile details
        const profileRes = await api.get('/students/profile/me');
        setStudentProfile(profileRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data. Verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const filteredHostels = hostels.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <Loading message="Syncing with secure server..." />;
  if (error) return <Error message={error} onRetry={fetchData} />;

  // --- STUDENT DASHBOARD VIEW ---
  if (user.role === 'STUDENT') {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header-section">
          <h1 className="page-heading">Student Portal</h1>
          <p className="page-subheading">Welcome back, {studentProfile?.full_name || user.username}!</p>
        </div>

        <div className="student-profile-section">
          <Card title="My Profile Details" className="student-profile-card">
            <div className="student-profile-layout">
              <div className="profile-photo-placeholder">
                <span className="photo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={28} />
                </span>
                <span className="photo-label">Profile Image</span>
              </div>
              
              <div className="profile-details-list">
                <div className="profile-detail-row">
                  <span className="p-label">Full Name:</span>
                  <span className="p-val">{studentProfile?.full_name}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="p-label">Student ID:</span>
                  <span className="p-val"><code>{studentProfile?.student_id}</code></span>
                </div>
                <div className="profile-detail-row">
                  <span className="p-label">Email:</span>
                  <span className="p-val">{studentProfile?.email}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="p-label">Phone Number:</span>
                  <span className="p-val">{studentProfile?.phone}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="p-label">Course & Branch:</span>
                  <span className="p-val">{studentProfile?.course} ({studentProfile?.branch})</span>
                </div>
                <div className="profile-detail-row">
                  <span className="p-label">Year & Semester:</span>
                  <span className="p-val">Year {studentProfile?.year}, Sem {studentProfile?.semester}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="p-label">Assigned Hostel:</span>
                  <span className="p-val hostel-highlight">{studentProfile?.hostel_name || 'Not Allocated'}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="p-label">Room & Bed:</span>
                  <span className="p-val">
                    {studentProfile?.room_number 
                      ? `Room ${studentProfile.room_number}, Bed ${studentProfile.bed_number || 'N/A'}`
                      : 'Unassigned'}
                  </span>
                </div>
                <div className="profile-detail-row">
                  <span className="p-label">Admission Date:</span>
                  <span className="p-val">{studentProfile?.admission_date ? new Date(studentProfile.admission_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // --- ADMIN & SUPERINTENDENT VIEW ---
  const isDbConnected = health?.services?.database?.status === 'CONNECTED';

  return (
    <div className="dashboard-page">
      <div className="dashboard-header-section">
        <h1 className="page-heading">
          {user.role === 'SUPER_ADMIN' ? 'Super Admin Control Center' : 'Superintendent Dashboard'}
        </h1>
        <p className="page-subheading">
          {user.role === 'SUPER_ADMIN' 
            ? 'Complete access to all college campus hostels and superintendent assignments' 
            : 'Access only to your assigned hostel properties'}
        </p>
      </div>

      {/* System Status Cards */}
      <div className="status-grid">
        <Card title="System Connectivity" className="status-card">
          <div className="status-indicator-row">
            <span className={`status-dot ${health?.status === 'UP' ? 'online' : 'degraded'}`}></span>
            <span className="status-text">
              API Status: <strong>{health?.status || 'UNKNOWN'}</strong>
            </span>
          </div>
          <p className="status-detail-text">Running on node environment: <code>{health?.environment || 'development'}</code></p>
        </Card>

        <Card title="Database Verification" className="status-card">
          <div className="status-indicator-row">
            <span className={`status-dot ${isDbConnected ? 'online' : 'offline'}`}></span>
            <span className="status-text">
              MySQL: <strong>{isDbConnected ? 'CONNECTED' : 'DISCONNECTED'}</strong>
            </span>
          </div>
          <p className="status-detail-text">Hostinger MySQL database instance verified via live health check query.</p>
        </Card>
      </div>

      {/* Hostels Section */}
      <div className="hostels-section-header">
        <h2 className="section-title">
          {user.role === 'SUPER_ADMIN' ? 'All Hostels Directory' : 'Assigned Hostels Directory'}
        </h2>
        <div className="search-filter-container">
          <Input 
            placeholder="Search hostels by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <Button onClick={fetchData} variant="secondary">
            Refresh Data
          </Button>
        </div>
      </div>

      {filteredHostels.length === 0 ? (
        <div className="empty-hostels-state">
          <p>No hostels found matching "{searchQuery}".</p>
        </div>
      ) : (
        <div className="hostels-grid">
          {filteredHostels.map((hostel) => (
            <Card 
              key={hostel.id} 
              title={hostel.name} 
              className="hostel-card"
              footer={
                <div className="hostel-card-footer">
                  <span className="hostel-code-badge">{hostel.code}</span>
                  <span className={`hostel-gender-badge ${(hostel.gender || 'MALE').toLowerCase()}`}>
                    {hostel.gender || 'MALE'}
                  </span>
                </div>
              }
            >
              <div className="hostel-detail-item">
                <span className="detail-label">Location:</span>
                <span className="detail-value">{hostel.location}</span>
              </div>
              <div className="hostel-detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value status-active">● {hostel.status}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPlaceholder;
