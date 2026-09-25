import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ReportFilterBar from '../components/reports/ReportFilterBar';
import ReportStatCard from '../components/reports/ReportStatCard';
import ReportChart from '../components/reports/ReportChart';
import './ReportsPage.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'fa-chart-pie' },
  { id: 'students', label: 'Students', icon: 'fa-user-graduate' },
  { id: 'attendance', label: 'Attendance', icon: 'fa-calendar-check' },
  { id: 'occupancy', label: 'Occupancy', icon: 'fa-bed' },
  { id: 'complaints', label: 'Complaints', icon: 'fa-triangle-exclamation' },
  { id: 'visitors', label: 'Visitors', icon: 'fa-user-check' },
];

const ReportsPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState('overview');
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize date range (last 30 days)
  const today = new Date();
  const past30Days = new Date();
  past30Days.setDate(today.getDate() - 30);

  const formatDate = (d) => d.toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    hostel_id: 'all',
    date_from: formatDate(past30Days),
    date_to: formatDate(today)
  });

  // Report Data States
  const [overviewData, setOverviewData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [complaintData, setComplaintData] = useState(null);
  const [visitorData, setVisitorData] = useState(null);

  // Fetch Hostels for Filter dropdown
  useEffect(() => {
    api.getHostels()
      .then(res => {
        if (res.success) {
          setHostels(res.data || []);
        }
      })
      .catch(err => console.error('Failed to load hostels for report filter:', err));
  }, []);

  // Fetch report data for active tab
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        hostel_id: filters.hostel_id !== 'all' ? filters.hostel_id : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined
      };

      if (activeTab === 'overview') {
        const res = await api.getReportOverview(params);
        if (res.success) setOverviewData(res.data);
      } else if (activeTab === 'students') {
        const res = await api.getReportStudents(params);
        if (res.success) setStudentData(res.data);
      } else if (activeTab === 'attendance') {
        const res = await api.getReportAttendance(params);
        if (res.success) setAttendanceData(res.data);
      } else if (activeTab === 'occupancy') {
        const res = await api.getReportOccupancy(params);
        if (res.success) setOccupancyData(res.data);
      } else if (activeTab === 'complaints') {
        const res = await api.getReportComplaints(params);
        if (res.success) setComplaintData(res.data);
      } else if (activeTab === 'visitors') {
        const res = await api.getReportVisitors(params);
        if (res.success) setVisitorData(res.data);
      }
    } catch (err) {
      console.error(`Failed to fetch report [${activeTab}]:`, err);
      setError(err.message || 'Unable to load report data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return (
    <div className="reports-page-container">
      {/* Page Header */}
      <div className="reports-page-header">
        <div>
          <div className="page-intro-badge">
            <i className="fa-solid fa-chart-line"></i> Analytics & Insights
          </div>
          <h1 className="reports-page-title">Reports & Analytics Center</h1>
          <p className="reports-page-subtitle">
            Comprehensive hostel performance, occupancy overview, and operational analytics.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <ReportFilterBar
        filters={filters}
        onFilterChange={setFilters}
        hostels={hostels}
        isSuperAdmin={isSuperAdmin}
        onRefresh={fetchReportData}
        loading={loading}
      />

      {/* Navigation Tabs */}
      <div className="reports-tabs-wrapper">
        <div className="reports-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`reports-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon"><i className={`fa-solid ${tab.icon}`}></i></span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Localized Error Display */}
      {error && (
        <div className="report-error-alert card">
          <div className="error-alert-content">
            <span className="error-icon"><i className="fa-solid fa-triangle-exclamation"></i></span>
            <span>{error}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchReportData}>
            <i className="fa-solid fa-rotate-right mr-1"></i> Retry
          </button>
        </div>
      )}

      {/* REPORT CONTENT AREA */}
      <div className="reports-content-body">

        {/* 1. OVERVIEW REPORT */}
        {activeTab === 'overview' && (
          <div className="report-section">
            <div className="report-stats-grid">
              <ReportStatCard
                title="Total Hostels"
                value={overviewData?.infrastructure?.totalHostels ?? '-'}
                subtitle="Active facilities"
                icon="fa-solid fa-building"
                color="primary"
                loading={loading}
              />
              <ReportStatCard
                title="Total Students"
                value={overviewData?.infrastructure?.totalStudents ?? '-'}
                subtitle="Active registrations"
                icon="fa-solid fa-user-graduate"
                color="info"
                loading={loading}
              />
              <ReportStatCard
                title="Beds Occupancy"
                value={`${overviewData?.infrastructure?.occupancyPercentage ?? 0}%`}
                subtitle={`${overviewData?.infrastructure?.occupiedBeds || 0} / ${overviewData?.infrastructure?.usableBeds || (overviewData?.infrastructure?.occupiedBeds + overviewData?.infrastructure?.availableBeds) || 0} usable beds`}
                icon="fa-solid fa-bed"
                color="success"
                loading={loading}
              />
              <ReportStatCard
                title="Today's Attendance"
                value={`${overviewData?.attendance?.attendancePercentage ?? 0}%`}
                subtitle={`${overviewData?.attendance?.presentToday || 0} Present, ${overviewData?.attendance?.absentToday || 0} Absent`}
                icon="fa-solid fa-calendar-check"
                color="warning"
                loading={loading}
              />
              <ReportStatCard
                title="Open Complaints"
                value={overviewData?.complaints?.openComplaints ?? '-'}
                subtitle={`${overviewData?.complaints?.urgentComplaints || 0} urgent unresolved`}
                icon="fa-solid fa-triangle-exclamation"
                color="danger"
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* 2. STUDENTS REPORT */}
        {activeTab === 'students' && (
          <div className="report-section">
            <div className="report-stats-grid">
              <ReportStatCard
                title="Total Students"
                value={studentData?.totalStudents ?? '-'}
                subtitle="Enrolled active students"
                icon="fa-solid fa-user-graduate"
                color="primary"
                loading={loading}
              />
              <ReportStatCard
                title="Branches Tracked"
                value={studentData?.byBranch?.length ?? '-'}
                subtitle="Academic departments"
                icon="fa-solid fa-code-branch"
                color="info"
                loading={loading}
              />
            </div>

            <div className="report-grid-two">
              <div className="card report-table-card">
                <h4 className="card-title">Distribution by Branch</h4>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>Student Count</th>
                        <th>Share %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentData?.byBranch?.map((b, i) => (
                        <tr key={i}>
                          <td><strong>{b.branch}</strong></td>
                          <td>{b.count}</td>
                          <td>{studentData.totalStudents > 0 ? ((b.count / studentData.totalStudents) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card report-table-card">
                <h4 className="card-title">Distribution by Hostel</h4>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Hostel</th>
                        <th>Student Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentData?.byHostel?.map((h, i) => (
                        <tr key={i}>
                          <td><strong>{h.hostel_name}</strong></td>
                          <td>{h.student_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. ATTENDANCE REPORT */}
        {activeTab === 'attendance' && (
          <div className="report-section">
            <div className="report-stats-grid">
              <ReportStatCard
                title="Present Today"
                value={attendanceData?.summary?.present ?? '-'}
                subtitle={`${attendanceData?.summary?.attendancePercentage ?? 0}% Present Rate`}
                icon="fa-solid fa-user-check"
                color="success"
                loading={loading}
              />
              <ReportStatCard
                title="Absent Today"
                value={attendanceData?.summary?.absent ?? '-'}
                subtitle="Marked absent"
                icon="fa-solid fa-user-xmark"
                color="danger"
                loading={loading}
              />
              <ReportStatCard
                title="Not Marked Today"
                value={attendanceData?.summary?.notMarked ?? '-'}
                subtitle="Pending roll call"
                icon="fa-solid fa-clock"
                color="warning"
                loading={loading}
              />
            </div>

            <ReportChart
              title="Daily Attendance Trend"
              data={attendanceData?.dailyTrend || []}
              xKey="date"
              yKey="present"
              label="Present Students"
              color="#10B981"
            />

            <div className="card report-table-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 className="card-title" style={{ margin: 0 }}>Hostel Attendance Comparison</h4>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: '#059669', borderColor: '#059669', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600 }}
                  onClick={downloadAttendanceComparisonReport}
                >
                  <i className="fa-solid fa-file-excel mr-1"></i> Export Attendance Comparison (Excel)
                </button>
              </div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Hostel Name</th>
                      <th>Total Students</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Not Marked</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData?.hostelComparison?.map(h => (
                      <tr key={h.hostel_id}>
                        <td><strong>{h.hostel_name}</strong></td>
                        <td>{h.totalStudents}</td>
                        <td className="text-success">{h.present}</td>
                        <td className="text-danger">{h.absent}</td>
                        <td className="text-muted">{h.notMarked}</td>
                        <td><strong>{h.attendancePercentage}%</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. OCCUPANCY REPORT */}
        {activeTab === 'occupancy' && (
          <div className="report-section">
            <div className="report-stats-grid">
              <ReportStatCard
                title="Total Capacity"
                value={occupancyData?.overall?.totalBeds ?? '-'}
                subtitle="Total registered beds"
                icon="fa-solid fa-hotel"
                color="primary"
                loading={loading}
              />
              <ReportStatCard
                title="Occupied Beds"
                value={occupancyData?.overall?.occupied ?? '-'}
                subtitle={`${occupancyData?.overall?.occupancyPercentage ?? 0}% Occupancy Rate`}
                icon="fa-solid fa-bed"
                color="success"
                loading={loading}
              />
              <ReportStatCard
                title="Available Beds"
                value={occupancyData?.overall?.available ?? '-'}
                subtitle="Ready for allocation"
                icon="fa-solid fa-door-open"
                color="info"
                loading={loading}
              />
              <ReportStatCard
                title="Maintenance Beds"
                value={occupancyData?.overall?.maintenance ?? '-'}
                subtitle="Excluded from usable percentage"
                icon="fa-solid fa-wrench"
                color="warning"
                loading={loading}
              />
            </div>

            <div className="card report-table-card">
              <h4 className="card-title">Hostel-wise Occupancy Breakdown</h4>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Hostel</th>
                      <th>Total Beds</th>
                      <th>Occupied</th>
                      <th>Available</th>
                      <th>Maintenance</th>
                      <th>Occupancy %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupancyData?.byHostel?.map(h => (
                      <tr key={h.hostel_id}>
                        <td><strong>{h.hostel_name}</strong></td>
                        <td>{h.totalBeds}</td>
                        <td className="text-success">{h.occupied}</td>
                        <td className="text-info">{h.available}</td>
                        <td className="text-warning">{h.maintenance}</td>
                        <td><strong>{h.occupancyPercentage}%</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. COMPLAINTS REPORT */}
        {activeTab === 'complaints' && (
          <div className="report-section">
            <div className="report-stats-grid">
              <ReportStatCard
                title="Total Complaints"
                value={complaintData?.summary?.totalComplaints ?? '-'}
                subtitle={`Resolution Rate: ${complaintData?.summary?.resolutionRate ?? 0}%`}
                icon="fa-solid fa-clipboard-list"
                color="primary"
                loading={loading}
              />
              <ReportStatCard
                title="Open & In Progress"
                value={(complaintData?.summary?.open || 0) + (complaintData?.summary?.inProgress || 0)}
                subtitle={`${complaintData?.summary?.urgent || 0} urgent items`}
                icon="fa-solid fa-spinner"
                color="warning"
                loading={loading}
              />
              <ReportStatCard
                title="Resolved / Closed"
                value={(complaintData?.summary?.resolved || 0) + (complaintData?.summary?.closed || 0)}
                subtitle="Successfully completed"
                icon="fa-solid fa-circle-check"
                color="success"
                loading={loading}
              />
            </div>

            <ReportChart
              title="Daily Complaint Inflow Trend"
              data={complaintData?.trend || []}
              xKey="date"
              yKey="count"
              label="Complaints"
              color="#F59E0B"
            />

            <div className="report-grid-two">
              <div className="card report-table-card">
                <h4 className="card-title">Complaints by Category</h4>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaintData?.byCategory?.map((c, i) => (
                        <tr key={i}>
                          <td><strong>{c.category}</strong></td>
                          <td>{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card report-table-card">
                <h4 className="card-title">Complaints by Priority</h4>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Priority</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaintData?.byPriority?.map((p, i) => (
                        <tr key={i}>
                          <td><strong>{p.priority}</strong></td>
                          <td>{p.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. VISITORS REPORT */}
        {activeTab === 'visitors' && (
          <div className="report-section">
            <div className="report-stats-grid">
              <ReportStatCard
                title="Total Visits"
                value={visitorData?.summary?.totalVisits ?? '-'}
                subtitle="Total registered visits"
                icon="fa-solid fa-users"
                color="primary"
                loading={loading}
              />
              <ReportStatCard
                title="Currently Checked In"
                value={visitorData?.summary?.currentVisitors ?? '-'}
                subtitle={`${visitorData?.summary?.overdueVisitors || 0} overdue inside`}
                icon="fa-solid fa-right-to-bracket"
                color="info"
                loading={loading}
              />
              <ReportStatCard
                title="Checked Out"
                value={visitorData?.summary?.checkedOut ?? '-'}
                subtitle="Completed visits"
                icon="fa-solid fa-right-from-bracket"
                color="success"
                loading={loading}
              />
            </div>

            <ReportChart
              title="Daily Visitor Trend"
              data={visitorData?.trend || []}
              xKey="date"
              yKey="count"
              label="Visitors"
              color="#3B82F6"
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportsPage;
