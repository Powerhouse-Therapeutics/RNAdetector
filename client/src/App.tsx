import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analysis/long-rna" element={<AnalysisPage />} />
          <Route path="/analysis/small-rna" element={<AnalysisPage />} />
          <Route path="/analysis/circ-rna" element={<AnalysisPage />} />
          <Route path="/analysis/sample-group" element={<AnalysisPage />} />
          <Route path="/analysis/diff-expr" element={<AnalysisPage />} />
          <Route path="/analysis/pathway" element={<AnalysisPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/files" element={<FileBrowserPage />} />
          <Route path="/references" element={<ReferencesPage />} />
          <Route path="/annotations" element={<AnnotationsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/admin" element={<ServerAdminPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
