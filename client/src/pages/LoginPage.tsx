import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Biotech } from '@mui/icons-material';
import LoginForm from '@/components/auth/LoginForm';
import useAuthStore from '@/stores/authStore';

export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Biotech sx={{ fontSize: 64, color: 'primary.main', mb: 1 }} />
        <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
          RNAdetector
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
          RNA Analysis Platform
        </Typography>
      </Box>
      <LoginForm />
    </Box>
  );
}
