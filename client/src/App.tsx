import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import ErrorBoundary, { PageErrorBoundary } from '@/components/ui/ErrorBoundary';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import AnalysisPage from '@/pages/AnalysisPage';
import JobsPage from '@/pages/JobsPage';
import FileBrowserPage from '@/pages/FileBrowserPage';
import ReferencesPage from '@/pages/ReferencesPage';
import AnnotationsPage from '@/pages/AnnotationsPage';
import TemplatesPage from '@/pages/TemplatesPage';
import ServerAdminPage from '@/pages/ServerAdminPage';
import SettingsPage from '@/pages/SettingsPage';
import DocsPage from '@/pages/DocsPage';
import ReportViewerPage from '@/pages/ReportViewerPage';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<PageErrorBoundary><LoginPage /></PageErrorBoundary>} />
        <Route path="/docs" element={<PageErrorBoundary><DocsPage /></PageErrorBoundary>} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<PageErrorBoundary><DashboardPage /></PageErrorBoundary>} />
            <Route path="/analysis/:type" element={<PageErrorBoundary><AnalysisPage /></PageErrorBoundary>} />
            <Route path="/jobs" element={<PageErrorBoundary><JobsPage /></PageErrorBoundary>} />
            <Route path="/files" element={<PageErrorBoundary><FileBrowserPage /></PageErrorBoundary>} />
            <Route path="/references" element={<PageErrorBoundary><ReferencesPage /></PageErrorBoundary>} />
            <Route path="/annotations" element={<PageErrorBoundary><AnnotationsPage /></PageErrorBoundary>} />
            <Route path="/templates" element={<PageErrorBoundary><TemplatesPage /></PageErrorBoundary>} />
            <Route path="/admin" element={<PageErrorBoundary><ServerAdminPage /></PageErrorBoundary>} />
            <Route path="/jobs/:jobId/report" element={<PageErrorBoundary><ReportViewerPage /></PageErrorBoundary>} />
            <Route path="/settings" element={<PageErrorBoundary><SettingsPage /></PageErrorBoundary>} />
            <Route path="/documentation" element={<PageErrorBoundary><DocsPage /></PageErrorBoundary>} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
