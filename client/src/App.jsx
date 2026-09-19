import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import Notifications from './pages/Notifications';

import CandidateDashboard from './pages/candidate/Dashboard';
import CandidateProfile from './pages/candidate/Profile';
import CandidateResume from './pages/candidate/Resume';
import AssessmentStart from './pages/candidate/AssessmentStart';
import AssessmentTake from './pages/candidate/AssessmentTake';
import AssessmentResult from './pages/candidate/AssessmentResult';
import CandidateProgress from './pages/candidate/Progress';
import CandidateSettings from './pages/candidate/Settings';
import InterviewStart from './pages/candidate/InterviewStart';
import InterviewTake from './pages/candidate/InterviewTake';
import InterviewResult from './pages/candidate/InterviewResult';
import CandidateConnections from './pages/candidate/Connections';
import CandidateConnectionDetail from './pages/candidate/ConnectionDetail';

import RecruiterDashboard from './pages/recruiter/Dashboard';
import RecruiterCandidates from './pages/recruiter/Candidates';
import RecruiterCandidateDetail from './pages/recruiter/CandidateDetail';
import RecruiterCompany from './pages/recruiter/Company';
import RecruiterProfilePage from './pages/recruiter/Profile';
import RecruiterSettings from './pages/recruiter/Settings';
import RecruiterConnections from './pages/recruiter/Connections';
import RecruiterConnectionDetail from './pages/recruiter/ConnectionDetail';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminQuestions from './pages/admin/Questions';
import AdminAssessments from './pages/admin/Assessments';
import AdminCompanies from './pages/admin/Companies';

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/home" element={<RoleHome />} />
          </Route>

          {/* Distraction-free test-taking view — no sidebar/topbar */}
          <Route element={<ProtectedRoute roles={['candidate']} />}>
            <Route path="/candidate/assessment/:id" element={<AssessmentTake />} />
            <Route path="/candidate/interview/:id" element={<InterviewTake />} />
          </Route>

          <Route element={<ProtectedRoute roles={['candidate']} />}>
            <Route element={<AppLayout />}>
              <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
              <Route path="/candidate/profile" element={<CandidateProfile />} />
              <Route path="/candidate/resume" element={<CandidateResume />} />
              <Route path="/candidate/assessment" element={<AssessmentStart />} />
              <Route path="/candidate/assessment/:id/result" element={<AssessmentResult />} />
              <Route path="/candidate/progress" element={<CandidateProgress />} />
              <Route path="/candidate/settings" element={<CandidateSettings />} />
              <Route path="/candidate/interview" element={<InterviewStart />} />
              <Route path="/candidate/interview/:id/result" element={<InterviewResult />} />
              <Route path="/candidate/connections" element={<CandidateConnections />} />
              <Route path="/candidate/connections/:id" element={<CandidateConnectionDetail />} />
              <Route path="/candidate/notifications" element={<Notifications />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['recruiter']} />}>
            <Route element={<AppLayout />}>
              <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
              <Route path="/recruiter/candidates" element={<RecruiterCandidates />} />
              <Route path="/recruiter/candidates/:id" element={<RecruiterCandidateDetail />} />
              <Route path="/recruiter/company" element={<RecruiterCompany />} />
              <Route path="/recruiter/profile" element={<RecruiterProfilePage />} />
              <Route path="/recruiter/settings" element={<RecruiterSettings />} />
              <Route path="/recruiter/connections" element={<RecruiterConnections />} />
              <Route path="/recruiter/connections/:id" element={<RecruiterConnectionDetail />} />
              <Route path="/recruiter/notifications" element={<Notifications />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/questions" element={<AdminQuestions />} />
              <Route path="/admin/assessments" element={<AdminAssessments />} />
              <Route path="/admin/companies" element={<AdminCompanies />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
