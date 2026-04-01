import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';
import theme from '@/theme/theme';
import '@/theme/global.css';
import App from '@/App';
import useNotificationStore from '@/stores/notificationStore';

function NotificationSnackbar() {
  const { open, message, severity, hide } = useNotificationStore();
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={hide}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={hide} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
        <NotificationSnackbar />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
