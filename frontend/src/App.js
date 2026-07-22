import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

import LoginPage from './components/pages/LoginPage';
import DashboardPage from './components/pages/DashboardPage';
import ServicesPage from './components/pages/ServicesPage';
import ProjectsPage from './components/pages/ProjectsPage';
import ContentCalendarPage from './components/pages/ContentCalendarPage';
import PerformanceReportsPage from './components/pages/PerformanceReportsPage';
import InvoicesPage from './components/pages/InvoicesPage';
import DeliverablesPage from './components/pages/DeliverablesPage';
import ApprovalCenterPage from './components/pages/ApprovalCenterPage';
import MessagesPage from './components/pages/MessagesPage';
import MeetingsPage from './components/pages/MeetingsPage';
import BrandAssetsPage from './components/pages/BrandAssetsPage';
import SupportTicketsPage from './components/pages/SupportTicketsPage';
import ProfilePage from './components/pages/ProfilePage';
import AdminClientsPage from './components/pages/AdminClientsPage';
import TeamManagementPage from './components/pages/TeamManagementPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '3px solid #E5E7EB', borderTopColor: '#1E88E5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#6B7280', fontSize: 14 }}>Loading Vignova Portal...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><ContentCalendarPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><PerformanceReportsPage /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
      <Route path="/deliverables" element={<ProtectedRoute><DeliverablesPage /></ProtectedRoute>} />
      <Route path="/approvals" element={<ProtectedRoute><ApprovalCenterPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
      <Route path="/brand-assets" element={<ProtectedRoute><BrandAssetsPage /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><SupportTicketsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin/clients" element={<ProtectedRoute adminOnly><AdminClientsPage /></ProtectedRoute>} />
      <Route path="/admin/team" element={<ProtectedRoute adminOnly><TeamManagementPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontSize: '13.5px', fontFamily: 'DM Sans, sans-serif', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
            success: { iconTheme: { primary: '#43A047', secondary: '#fff' } },
            error: { iconTheme: { primary: '#E53935', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}