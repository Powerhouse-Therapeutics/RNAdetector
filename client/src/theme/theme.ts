import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#58A6FF',
      light: '#79B8FF',
      dark: '#388BFD',
      contrastText: '#0D1117',
    },
    secondary: {
      main: '#8B949E',
      light: '#B1BAC4',
      dark: '#6E7681',
    },
    background: {
      default: '#0D1117',
      paper: '#161B22',
    },
    text: {
      primary: '#C9D1D9',
      secondary: '#8B949E',
    },
    success: { main: '#3FB950', light: '#56D364', dark: '#2EA043' },
    error: { main: '#F85149', light: '#FF7B72', dark: '#DA3633' },
    warning: { main: '#D29922', light: '#E3B341', dark: '#BB8009' },
    info: { main: '#58A6FF', light: '#79B8FF', dark: '#388BFD' },
    divider: 'rgba(240, 246, 252, 0.1)',
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 600, letterSpacing: '-0.025em', fontSize: '2.5rem' },
    h2: { fontWeight: 600, letterSpacing: '-0.02em', fontSize: '2rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem', letterSpacing: '-0.015em' },
    h4: { fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 500, fontSize: '1rem' },
    h6: { fontWeight: 500, fontSize: '0.875rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none' as const, fontWeight: 500, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#21262D #0D1117',
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-track': { background: '#0D1117' },
          '&::-webkit-scrollbar-thumb': {
            background: '#21262D',
            borderRadius: 4,
            '&:hover': { background: '#30363D' },
          },
        },
        '*': { transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#161B22',
          border: '1px solid rgba(240, 246, 252, 0.1)',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(240, 246, 252, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#161B22',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          padding: '6px 16px',
        },
        contained: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          },
        },
        outlined: {
          borderColor: 'rgba(240, 246, 252, 0.1)',
          '&:hover': {
            borderColor: '#58A6FF',
            backgroundColor: 'rgba(88, 166, 255, 0.06)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.75rem',
          borderRadius: 6,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          '& .MuiSlider-track': {
            boxShadow: 'none',
          },
          '& .MuiSlider-thumb': {
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0 0 0 8px rgba(88, 166, 255, 0.16)',
            },
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(88, 166, 255, 0.04) !important',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0D1117',
          borderRight: '1px solid rgba(240, 246, 252, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(13, 17, 23, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(240, 246, 252, 0.1)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(88, 166, 255, 0.1)',
            borderLeft: '3px solid #58A6FF',
            '&:hover': { backgroundColor: 'rgba(88, 166, 255, 0.15)' },
          },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          '& .MuiStepIcon-root.Mui-active': { color: '#58A6FF' },
          '& .MuiStepIcon-root.Mui-completed': { color: '#3FB950' },
          '& .MuiStepConnector-line': { borderColor: 'rgba(240, 246, 252, 0.1)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: '1px solid rgba(240, 246, 252, 0.1)',
          backgroundColor: '#161B22',
        },
      },
    },
  },
});

export default theme;
