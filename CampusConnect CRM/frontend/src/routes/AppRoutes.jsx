import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Pages
import Dashboard from '../pages/Dashboard';
import LeadsManagement from '../pages/LeadsManagement';
import AddLead from '../pages/AddLead';
import LeadDetails from '../pages/LeadDetails';
import Followups from '../pages/Followups';
import UsersManagement from '../pages/UsersManagement';
import Automation from '../pages/Automation';
import EmailLogs from '../pages/EmailLogs';
import AIChat from '../pages/AIChat';
import InquiryForm from '../pages/InquiryForm';
import CSVImport from '../pages/CSVImport';
import CallQueue from '../pages/CallQueue';
import CallLogs from '../pages/CallLogs';
import VoiceSettings from '../pages/VoiceSettings';
import Settings from '../pages/Settings';





import Login from '../pages/Login';
import NotFound from '../pages/NotFound';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/inquiry" element={<InquiryForm />} />


      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/leads" 
        element={
          <ProtectedRoute>
            <LeadsManagement />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/leads/add" 
        element={
          <ProtectedRoute>
            <AddLead />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/leads/import" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <CSVImport />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/leads/:id" 
        element={
          <ProtectedRoute>
            <LeadDetails />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/followups" 
        element={
          <ProtectedRoute>
            <Followups />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin/Manager Only Routes */}
      <Route 
        path="/users" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <UsersManagement />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/automation" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <Automation />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/email-logs" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <EmailLogs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ai-chat" 
        element={
          <ProtectedRoute>
            <AIChat />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/calls" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'COUNSELOR']}>
            <CallQueue />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/call-logs" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'COUNSELOR']}>
            <CallLogs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/call-settings" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <VoiceSettings />
          </ProtectedRoute>
        } 
      />



      <Route 
        path="/settings" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Settings />
          </ProtectedRoute>
        } 
      />

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
