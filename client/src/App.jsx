import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CoursePage from './pages/CoursePage';
import LessonPage from './pages/LessonPage';
import CompliancePage from './pages/CompliancePage';
import ChecklistRunPage from './pages/ChecklistRunPage';
import TasksPage from './pages/TasksPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentFormPage from './pages/IncidentFormPage';
import SOPsPage from './pages/SOPsPage';
import SOPDetailPage from './pages/SOPDetailPage';
import TrainingMatrixPage from './pages/TrainingMatrixPage';
import AdminLayout from './components/AdminLayout';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminTasksPage from './pages/admin/AdminTasksPage';
import AdminCompliancePage from './pages/admin/AdminCompliancePage';
import OnboardingPage from './pages/OnboardingPage';
import BankDetailsPage from './pages/BankDetailsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

          {/* User routes */}
          <Route path="/"        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/courses/:courseId" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
          <Route path="/compliance" element={<ProtectedRoute><CompliancePage /></ProtectedRoute>} />
          <Route path="/compliance/run/:completionId" element={<ProtectedRoute><ChecklistRunPage /></ProtectedRoute>} />
          <Route path="/tasks"   element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/incidents" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
          <Route path="/incidents/new" element={<ProtectedRoute><IncidentFormPage /></ProtectedRoute>} />
          <Route path="/incidents/:id/edit" element={<ProtectedRoute><IncidentFormPage /></ProtectedRoute>} />
          <Route path="/sops"    element={<ProtectedRoute><SOPsPage /></ProtectedRoute>} />
          <Route path="/sops/:id" element={<ProtectedRoute><SOPDetailPage /></ProtectedRoute>} />
          <Route path="/training-matrix" element={<ProtectedRoute><TrainingMatrixPage /></ProtectedRoute>} />
          <Route path="/bank-details"    element={<ProtectedRoute><BankDetailsPage /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview"   element={<AdminOverviewPage />} />
            <Route path="users"      element={<AdminUsersPage />} />
            <Route path="roles"      element={<AdminRolesPage />} />
            <Route path="reports"    element={<AdminReportsPage />} />
            <Route path="tasks"      element={<AdminTasksPage />} />
            <Route path="compliance" element={<AdminCompliancePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
