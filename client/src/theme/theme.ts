import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00E5FF',
      light: '#6EFFFF',
      dark: '#00B2CC',
      contrastText: '#0A0E17',
    },
    secondary: {
      main: '#FF00E5',
      light: '#FF5CFF',
      dark: '#CC00B8',
    },
    background: {
      default: '#0A0E17',
      paper: '#111827',
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#9CA3AF',
    },
    success: { main: '#10B981', light: '#34D399', dark: '#059669' },
    error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
    warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
    info: { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB' },
    divider: 'rgba(0, 229, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: '2.5rem' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: '2rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem' },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1rem' },
    h6: { fontWeight: 600, fontSize: '0.875rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none' as const, fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#1F2937 #0A0E17',
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-track': { background: '#0A0E17' },
          '&::-webkit-scrollbar-thumb': {
            background: '#1F2937',
            borderRadius: 4,
            '&:hover': { background: '#374151' },
          },
        },
        '*': { transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.08)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'rgba(0, 229, 255, 0.25)',
            boxShadow: '0 0 24px rgba(0, 229, 255, 0.08), 0 4px 16px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111827',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: '0 0 12px rgba(0, 229, 255, 0.25)',
          '&:hover': {
            boxShadow: '0 0 24px rgba(0, 229, 255, 0.4)',
          },
        },
        outlined: {
          borderColor: 'rgba(0, 229, 255, 0.3)',
          '&:hover': {
            borderColor: '#00E5FF',
            backgroundColor: 'rgba(0, 229, 255, 0.08)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          '& .MuiSlider-track': {
            boxShadow: '0 0 8px rgba(0, 229, 255, 0.4)',
          },
          '& .MuiSlider-thumb': {
            boxShadow: '0 0 12px rgba(0, 229, 255, 0.4)',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0 0 16px rgba(0, 229, 255, 0.6)',
            },
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 229, 255, 0.04) !important',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0D1117',
          borderRight: '1px solid rgba(0, 229, 255, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 14, 23, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 229, 255, 0.12)',
            borderLeft: '3px solid #00E5FF',
            '&:hover': { backgroundColor: 'rgba(0, 229, 255, 0.16)' },
          },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          '& .MuiStepIcon-root.Mui-active': { color: '#00E5FF' },
          '& .MuiStepIcon-root.Mui-completed': { color: '#10B981' },
          '& .MuiStepConnector-line': { borderColor: 'rgba(0, 229, 255, 0.2)' },
        },
      },
    },
  },
});

export default theme;
