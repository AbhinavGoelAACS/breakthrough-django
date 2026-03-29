import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider, ToastContext } from './contexts/ToastContext';
import { ModalProvider, ModalContext } from './contexts/ModalContext';
import { JournalProvider, useJournalContext } from './contexts/JournalContext';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import ProtectedAdminRoute from './components/shared/ProtectedAdminRoute';
import ProtectedAuthorRoute from './components/shared/ProtectedAuthorRoute';
import ProtectedEditorRoute from './components/shared/ProtectedEditorRoute';
import ProtectedReviewerRoute from './components/shared/ProtectedReviewerRoute';
import Navbar from './components/Navbar';
import JournalNavbar from './components/JournalNavbar';
import ToastContainer from './components/toast/ToastContainer';
import Modal from './components/modal/Modal';
import { JournalsPage } from './pages/JournalsPage/JournalsPage';
import JournalDetailPage from './pages/JournalDetailPage/JournalDetailPage';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { SignupPage } from './pages/SignupPage/SignupPage';
import { DashboardPage } from './pages/DashboardPage/DashboardPage';
import { SubmitPage } from './pages/SubmitPage/SubmitPage';
import InvitationPage from './pages/InvitationPage/InvitationPage';
// Journal pages (accessed via /j/:shortForm route)
import JournalHomePage from './pages/JournalHomePage/JournalHomePage';
import JournalAboutPage from './pages/JournalAboutPage/JournalAboutPage';
import JournalArchivesPage from './pages/JournalArchivesPage/JournalArchivesPage';
import JournalGuidelinesPage from './pages/JournalGuidelinesPage/JournalGuidelinesPage';
// Admin layouts and pages
import AdminLayout from './layouts/AdminLayout/AdminLayout.jsx';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard.jsx';
import AdminUsers from './pages/AdminUsers/AdminUsers.jsx';
import AdminJournals from './pages/AdminJournals/AdminJournals.jsx';
import AdminSubmissions from './pages/AdminSubmissions/AdminSubmissions.jsx';
import AdminSettings from './pages/AdminSettings/AdminSettings.jsx';
import AdminRoleRequests from './pages/AdminRoleRequests/AdminRoleRequests.jsx';
import AdminAnalytics from './pages/AdminAnalytics/AdminAnalytics.jsx';
// Author layouts and pages
import AuthorLayout from './layouts/AuthorLayout/AuthorLayout.jsx';
import AuthorDashboard from './pages/AuthorDashboard/AuthorDashboard.jsx';
import AuthorSubmissions from './pages/AuthorSubmissions/AuthorSubmissions.jsx';
import AuthorGuidelines from './pages/AuthorGuidelines/AuthorGuidelines.jsx';
// Editor layouts and pages
import EditorLayout from './layouts/EditorLayout/EditorLayout.jsx';
import EditorDashboard from './pages/EditorDashboard/EditorDashboard.jsx';
import EditorPaperQueue from './pages/EditorPaperQueue/EditorPaperQueue.jsx';
import EditorPendingDecision from './pages/EditorPendingDecision/EditorPendingDecision.jsx';
import EditorReviewerList from './pages/EditorReviewerList/EditorReviewerList.jsx';
import EditorJournals from './pages/EditorJournals/EditorJournals.jsx';
// Reviewer layouts and pages
import ReviewerLayout from './layouts/ReviewerLayout/ReviewerLayout.jsx';
import ReviewerDashboard from './pages/ReviewerDashboard/ReviewerDashboard.jsx';
import ReviewerAssignments from './pages/ReviewerAssignments/ReviewerAssignments.jsx';
import ReviewerInvitations from './pages/ReviewerInvitations/ReviewerInvitations.jsx';
import ReviewerProfile from './pages/ReviewerProfile/ReviewerProfile.jsx';
import ReviewerHistory from './pages/ReviewerHistory/ReviewerHistory.jsx';
import ReviewerGuidelines from './pages/ReviewerGuidelines/ReviewerGuidelines.jsx';
import ReviewPage from './pages/ReviewPage/ReviewPage.jsx';
// Editor Decision Panel
import EditorDecisionPanel from './components/EditorDecisionPanel.jsx';
// Paper Details Page
import PaperDetailsPage from './pages/PaperDetailsPage/PaperDetailsPage.jsx';
// Editor Publishing Page
import EditorPublishing from './pages/EditorPublishing/EditorPublishing.jsx';
// Editor Guidelines Page
import EditorGuidelines from './pages/EditorGuidelines/EditorGuidelines.jsx';
// Public Paper View Page
import PublicPaperView from './pages/PublicPaperView/PublicPaperView.jsx';
// Issue Papers Page
import IssuePapersPage from './pages/IssuePapersPage/IssuePapersPage.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <AppContent />
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

// Wrapper component for journal routes that provides context
function JournalRouteWrapper() {
  const { shortForm } = useParams();
  
  return (
    <JournalProvider shortForm={shortForm}>
      <JournalRouteContent />
    </JournalProvider>
  );
}

// Content for journal routes
function JournalRouteContent() {
  const { toasts, removeToast } = React.useContext(ToastContext);
  const { isOpen, title, message, confirmText, cancelText, type, onConfirm, onCancel, closeModal } = React.useContext(ModalContext);
  const { currentJournal, loading: journalLoading, error: journalError } = useJournalContext();

  const handleModalConfirm = () => {
    if (onConfirm) onConfirm();
    closeModal();
  };

  const handleModalCancel = () => {
    if (onCancel) onCancel();
    closeModal();
  };

  // Show loading state while fetching journal
  if (journalLoading) {
    return (
      <div className="App">
        <div className="journal-loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if journal not found
  if (journalError || !currentJournal) {
    return (
      <div className="App">
        <div className="journal-error-container">
          <h1>Journal Not Found</h1>
          <p>{journalError || 'The requested journal could not be found.'}</p>
          <a href="/">Return to Main Site</a>
        </div>
      </div>
    );
  }

  return (
    <div className="App journal-site">
      <JournalNavbar journal={currentJournal} />
      <main className="app-main journal-main">
        <Routes>
          {/* Journal routes */}
          <Route path="/" element={<JournalHomePage />} />
          <Route path="/about" element={<JournalAboutPage />} />
          <Route path="/archives" element={<JournalArchivesPage />} />
          <Route path="/guidelines" element={<JournalGuidelinesPage />} />
          <Route path="/submit" element={<ProtectedRoute><SubmitPage preselectedJournal={currentJournal} /></ProtectedRoute>} />
          <Route path="/volume/:volumeNo/issue/:issueNo" element={<IssuePapersPage />} />
          <Route path="/article/:id" element={<PublicPaperView />} />
          
          {/* Redirect unknown paths to journal home */}
          <Route path="*" element={<Navigate to={`/j/${currentJournal.short_form}`} replace />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <Modal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        type={type}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
}

function AppContent() {
  const { toasts, removeToast } = React.useContext(ToastContext);
  const { isOpen, title, message, confirmText, cancelText, type, onConfirm, onCancel, closeModal } = React.useContext(ModalContext);
  const location = useLocation();

  // Determine if current route is a portal route (has its own Navbar)
  const isPortalRoute = ['/admin', '/editor', '/author', '/reviewer'].some(
    prefix => location.pathname.startsWith(prefix)
  );
  
  // Check if we're on a journal route
  const isJournalRoute = location.pathname.startsWith('/j/');

  const handleModalConfirm = () => {
    if (onConfirm) onConfirm();
    closeModal();
  };

  const handleModalCancel = () => {
    if (onCancel) onCancel();
    closeModal();
  };

  // Main site rendering

  return (
    <div className="App">
      {/* Only show global Navbar for non-portal and non-journal routes */}
      {!isPortalRoute && !isJournalRoute && <Navbar sections={[]} portalName="" />}
      <main className={`app-main ${isPortalRoute ? 'portal-main' : ''}`}>
        <Routes>
          {/* Journal routes - using /j/:shortForm prefix */}
          <Route path="/j/:shortForm/*" element={<JournalRouteWrapper />} />
          
          {/* Public routes */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/journals" element={<JournalsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/article/:id" element={<PublicPaperView />} />

          {/* Protected routes */}
          <Route path="/journal/:id" element={<ProtectedRoute><JournalDetailPage /></ProtectedRoute>} />
          <Route path="/journal/:id/volume/:volumeNo/issue/:issueNo" element={<ProtectedRoute><IssuePapersPage /></ProtectedRoute>} />
          <Route path="/paper/:id" element={<ProtectedRoute><PaperDetailsPage /></ProtectedRoute>} />
          <Route path="/submit" element={<ProtectedRoute><SubmitPage /></ProtectedRoute>} />
          <Route path="/invitations/:token" element={<ProtectedRoute><InvitationPage /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/*" element={<ProtectedAdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="journals" element={<AdminJournals />} />
              <Route path="submissions" element={<AdminSubmissions />} />
              <Route path="submissions/:id" element={<PaperDetailsPage />} />
              <Route path="submissions/:paperId/decision" element={<EditorDecisionPanel />} />
              <Route path="role-requests" element={<AdminRoleRequests />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Author routes */}
          <Route path="/author/*" element={<ProtectedAuthorRoute />}>
            <Route element={<AuthorLayout />}>
              <Route path="" element={<AuthorDashboard />} />
              <Route path="submissions" element={<AuthorSubmissions />} />
              <Route path="submissions/:id" element={<PaperDetailsPage />} />
              <Route path="guidelines" element={<AuthorGuidelines />} />
            </Route>
          </Route>

          {/* Editor routes */}
          <Route path="/editor/*" element={<ProtectedEditorRoute />}>
            <Route element={<EditorLayout />}>
              <Route path="dashboard" element={<EditorDashboard />} />
              <Route path="" element={<EditorDashboard />} />
              <Route path="my-journals" element={<EditorJournals />} />
              <Route path="papers" element={<EditorPaperQueue />} />
              <Route path="papers/pending-decision" element={<EditorPendingDecision />} />
              <Route path="papers/:id" element={<PaperDetailsPage />} />
              <Route path="papers/:paperId/decision" element={<EditorDecisionPanel />} />
              <Route path="publishing" element={<EditorPublishing />} />
              <Route path="reviewers" element={<EditorReviewerList />} />
              <Route path="guidelines" element={<EditorGuidelines />} />
            </Route>
          </Route>

          {/* Reviewer routes */}
          <Route path="/reviewer/*" element={<ProtectedReviewerRoute />}>
            <Route element={<ReviewerLayout />}>
              <Route path="dashboard" element={<ReviewerDashboard />} />
              <Route path="" element={<ReviewerDashboard />} />
              <Route path="assignments" element={<ReviewerAssignments />} />
              <Route path="assignments/:id" element={<PaperDetailsPage />} />
              <Route path="assignments/:id/review" element={<ReviewPage />} />
              <Route path="invitations" element={<ReviewerInvitations />} />
              <Route path="history" element={<ReviewerHistory />} />
              <Route path="profile" element={<ReviewerProfile />} />
              <Route path="guidelines" element={<ReviewerGuidelines />} />
            </Route>
          </Route>

          {/* Protected routes */}
          <Route
            path="/home"
            element={<Navigate to="/" replace />}
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <Modal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        type={type}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
}

export default App;
