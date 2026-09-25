import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPlaceholder from './pages/DashboardPlaceholder';
import Login from './pages/Login';
import HostelsPage from './pages/HostelsPage';
import HostelDetailsPage from './pages/HostelDetailsPage';
import StudentsPage from './pages/StudentsPage';
import AdminDashboard from './pages/AdminDashboard';
import SuperintendentDashboard from './pages/SuperintendentDashboard';
import NoticesPage from './pages/NoticesPage';
import ComplaintsPage from './pages/ComplaintsPage';
import VisitorsPage from './pages/VisitorsPage';
import ReportsPage from './pages/ReportsPage';
import AllocationsPage from './pages/AllocationsPage';
import StudentAccommodationPage from './pages/StudentAccommodationPage';
import StudentDashboard from './pages/StudentDashboard';
import UserManagementPage from './pages/UserManagementPage';
import SecurityAuditPage from './pages/SecurityAuditPage';
import ProfilePage from './pages/ProfilePage';
import ActivityPage from './pages/ActivityPage';
import MaintenancePage from './pages/MaintenancePage';
import InspectionsPage from './pages/InspectionsPage';
import OperationsDashboardPage from './pages/OperationsDashboardPage';
import MasterOverviewPage from './pages/MasterOverviewPage';
import MasterHostelsPage from './pages/MasterHostelsPage';
import MasterFloorsPage from './pages/MasterFloorsPage';
import MasterRoomsPage from './pages/MasterRoomsPage';
import MasterBedsPage from './pages/MasterBedsPage';
import DataIntegrityPage from './pages/DataIntegrityPage';
import MessPage from './pages/MessPage';
import GatePassPage from './pages/GatePassPage';
import LeavePage from './pages/LeavePage';
import RoomApplicationPage from './pages/RoomApplicationPage';
import DocumentRequestsPage from './pages/DocumentRequestsPage';
import CafeteriaPage from './pages/CafeteriaPage';
import AttendancePage from './pages/AttendancePage';
import StudentAttendancePage from './pages/StudentAttendancePage';
import Loading from './components/Loading';

/**
 * RoleRedirect — sends authenticated users to their role-specific dashboard.
 * Unauthenticated users go to /login (handled by ProtectedRoute).
 */
const RoleRedirect = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="fullscreen-loading"><Loading message="Loading..." /></div>;
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'SUPER_ADMIN':     return <Navigate to="/admin/dashboard" replace />;
    case 'SUPERINTENDENT':  return <Navigate to="/superintendent/dashboard" replace />;
    case 'STUDENT':         return <Navigate to="/student/dashboard" replace />;
    default:                return <Navigate to="/student/dashboard" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Root — redirect by role */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            }
          />

          {/* Shared Profile Route */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* ── SUPER ADMIN ────────────────────────────────────────────── */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard"           element={<AdminDashboard />} />
                    <Route path="users"               element={<UserManagementPage />} />
                    <Route path="security-audit"      element={<SecurityAuditPage />} />
                    <Route path="hostels"             element={<HostelsPage />} />
                    <Route path="hostels/:hostelId"   element={<HostelDetailsPage />} />
                    <Route path="students"            element={<StudentsPage />} />
                    <Route path="allocations"         element={<AllocationsPage />} />
                    <Route path="reports"             element={<ReportsPage />} />
                    <Route path="attendance"          element={<AttendancePage />} />
                    <Route path="notices"             element={<NoticesPage />} />
                    <Route path="notices/:noticeId"   element={<NoticesPage />} />
                    <Route path="complaints"          element={<ComplaintsPage />} />
                    <Route path="visitors"            element={<VisitorsPage />} />
                    <Route path="gate-passes"         element={<GatePassPage />} />
                    <Route path="leaves"              element={<LeavePage />} />
                    <Route path="room-applications"   element={<RoomApplicationPage />} />
                    <Route path="documents"           element={<DocumentRequestsPage />} />
                    <Route path="cafeteria"           element={<CafeteriaPage />} />
                    <Route path="mess"                element={<MessPage userRole="SUPER_ADMIN" />} />
                    <Route path="activity"            element={<ActivityPage />} />
                    <Route path="operations"          element={<OperationsDashboardPage role="SUPER_ADMIN" />} />
                    <Route path="maintenance"         element={<MaintenancePage role="SUPER_ADMIN" />} />
                    <Route path="inspections"         element={<InspectionsPage role="SUPER_ADMIN" />} />
                    <Route path="master"              element={<MasterOverviewPage />} />
                    <Route path="master/hostels"      element={<MasterHostelsPage />} />
                    <Route path="master/floors"       element={<MasterFloorsPage />} />
                    <Route path="master/rooms"        element={<MasterRoomsPage />} />
                    <Route path="master/beds"         element={<MasterBedsPage />} />
                    <Route path="data-integrity"      element={<DataIntegrityPage />} />
                    <Route path="*"                   element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* ── SUPERINTENDENT ─────────────────────────────────────────── */}
          <Route
            path="/superintendent/*"
            element={
              <ProtectedRoute allowedRoles={['SUPERINTENDENT']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard"           element={<SuperintendentDashboard />} />
                    <Route path="hostels"             element={<HostelsPage />} />
                    <Route path="hostels/:hostelId"   element={<HostelDetailsPage />} />
                    <Route path="students"            element={<StudentsPage />} />
                    <Route path="allocations"         element={<AllocationsPage />} />
                    <Route path="reports"             element={<ReportsPage />} />
                    <Route path="attendance"          element={<AttendancePage />} />
                    <Route path="notices"             element={<NoticesPage />} />
                    <Route path="notices/:noticeId"   element={<NoticesPage />} />
                    <Route path="complaints"          element={<ComplaintsPage />} />
                    <Route path="visitors"            element={<VisitorsPage />} />
                    <Route path="gate-passes"         element={<GatePassPage />} />
                    <Route path="leaves"              element={<LeavePage />} />
                    <Route path="room-applications"   element={<RoomApplicationPage />} />
                    <Route path="documents"           element={<DocumentRequestsPage />} />
                    <Route path="cafeteria"           element={<CafeteriaPage />} />
                    <Route path="mess"                element={<MessPage userRole="SUPERINTENDENT" />} />
                    <Route path="activity"            element={<ActivityPage />} />
                    <Route path="operations"          element={<OperationsDashboardPage role="SUPERINTENDENT" />} />
                    <Route path="maintenance"         element={<MaintenancePage role="SUPERINTENDENT" />} />
                    <Route path="inspections"         element={<InspectionsPage role="SUPERINTENDENT" />} />
                    <Route path="*"                   element={<Navigate to="/superintendent/dashboard" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* ── STUDENT ────────────────────────────────────────────────── */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard"         element={<StudentDashboard />} />
                    <Route path="accommodation"     element={<StudentAccommodationPage />} />
                    <Route path="room-applications" element={<RoomApplicationPage />} />
                    <Route path="documents"         element={<DocumentRequestsPage />} />
                    <Route path="cafeteria"         element={<CafeteriaPage />} />
                    <Route path="notices"       element={<NoticesPage />} />
                    <Route path="notices/:noticeId" element={<NoticesPage />} />
                    <Route path="complaints"    element={<ComplaintsPage />} />
                    <Route path="visitors"      element={<VisitorsPage />} />
                    <Route path="gate-passes"   element={<GatePassPage />} />
                    <Route path="leaves"        element={<LeavePage />} />
                    <Route path="maintenance"   element={<MaintenancePage role="STUDENT" />} />
                    <Route path="mess"          element={<MessPage userRole="STUDENT" />} />
                    <Route path="attendance"    element={<StudentAttendancePage />} />
                    <Route path="profile"       element={<Navigate to="/profile" replace />} />
                    <Route path="*"             element={<Navigate to="/student/dashboard" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
