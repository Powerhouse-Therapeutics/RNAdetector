# RNAdetector Web Client

Modern React web application for controlling RNAdetector server instances.

## Tech Stack

- **React 18** with TypeScript
- **Vite 5** for fast development and builds
- **MUI v6** (Material UI) with custom dark futuristic theme
- **Zustand** for state management
- **Axios** for API communication with JWT interceptors
- **React Router v6** for client-side routing

## Getting Started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` and proxies `/api` requests to `http://localhost:9898` (the Laravel backend).

## Build

```bash
npm run build
```

Output goes to `dist/` for deployment.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api/` | Backend API base URL |

## Project Structure

```
src/
  api/                 API client modules
    client.ts          Axios instance with JWT auth
    auth.ts            Login/logout/refresh
    jobs.ts            Job CRUD operations
    files.ts           File browser API
    server.ts          Server management API
    templates.ts       Template downloads
    references.ts      Reference genome API
    annotations.ts     Annotation API
  components/
    analysis/          Analysis wizard components
      ResourceSelector.tsx   CPU/RAM configuration sliders
      AnalysisWizard.tsx     Shared stepper wizard
    auth/              Authentication components
      LoginForm.tsx    Email/password login form
      ProtectedRoute.tsx  Auth guard wrapper
    files/             File browser components
      ServerFileBrowser.tsx  Directory browser with search
      FileSelector.tsx      Dialog-based file picker
    jobs/              Job management components
      JobsList.tsx     Sortable jobs table
      JobLogViewer.tsx Monospace log display
      ReportViewer.tsx HTML report iframe viewer
    layout/            App layout components
      AppShell.tsx     Main layout with sidebar
      Sidebar.tsx      Navigation sidebar
      Header.tsx       Top app bar
    ui/                Shared UI components
      StatusBadge.tsx  Color-coded status chips
      LoadingSkeleton.tsx  Loading placeholders
      WizardStepper.tsx    Styled MUI stepper
  hooks/
    useAuth.ts         Auth convenience hook
  pages/               Page components (one per route)
  stores/
    authStore.ts       JWT token + user state (persisted)
    notificationStore.ts  Snackbar notifications
  theme/
    theme.ts           MUI dark theme configuration
    global.css         Global styles and animations
  types/
    index.ts           TypeScript type definitions
```

## Theme

Dark mode with a futuristic aesthetic:
- **Primary**: Electric cyan (#00E5FF)
- **Secondary**: Neon magenta (#FF00E5)
- **Background**: Deep dark (#0A0E17)
- **Cards**: Glassmorphism with backdrop blur and glow-on-hover
- **Status**: Green (completed), Cyan (processing), Amber (queued), Red (failed)
- **Fonts**: Inter (UI), JetBrains Mono (code/data)

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | JWT authentication |
| `/` | DashboardPage | Server status, recent jobs, quick actions |
| `/analysis/*` | AnalysisPage | Analysis wizards (RNA-seq, Small RNA, CircRNA, DE, Pathway) |
| `/jobs` | JobsPage | Job management with status tracking |
| `/files` | FileBrowserPage | Server file browser |
| `/references` | ReferencesPage | Reference genomes and packages |
| `/annotations` | AnnotationsPage | Genome annotations |
| `/templates` | TemplatesPage | Downloadable metadata templates |
| `/admin` | ServerAdminPage | Server management (admin only) |
| `/settings` | SettingsPage | User profile and configuration |
