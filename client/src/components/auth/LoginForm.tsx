import React, { useState } from 'react';
import {
  Box, TextField, Button, Alert, CircularProgress, Paper, Typography,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import useAuth from '@/hooks/useAuth';

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 4,
        width: '100%',
        maxWidth: 420,
        background: 'rgba(17, 24, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 229, 255, 0.12)',
      }}
    >
      <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', color: 'primary.main' }}>
        Sign In
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Email"
        type="email"
        fullWidth
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
        autoComplete="email"
        autoFocus
      />

      <TextField
        label="Password"
        type="password"
        fullWidth
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 3 }}
        autoComplete="current-password"
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </Paper>
  );
}
