import React, { useState } from 'react';
import {
  TextField, Button, Alert, CircularProgress, Paper, Typography,
  FormControlLabel, Checkbox, Stack, Link,
} from '@mui/material';
import { Login as LoginIcon, MenuBook as DocsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error ||
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
        sx={{ mb: 2 }}
        autoComplete="current-password"
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            sx={{
              color: 'rgba(0, 229, 255, 0.4)',
              '&.Mui-checked': { color: '#00E5FF' },
            }}
          />
        }
        label={
          <Typography variant="body2" color="text.secondary">
            Remember me
          </Typography>
        }
        sx={{ mb: 2 }}
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
        sx={{ mb: 2 }}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <Stack direction="row" justifyContent="center">
        <Link
          component="button"
          type="button"
          variant="body2"
          underline="hover"
          onClick={() => navigate('/docs')}
          sx={{
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            '&:hover': { color: 'primary.main' },
          }}
        >
          <DocsIcon fontSize="small" />
          Documentation
        </Link>
      </Stack>
    </Paper>
  );
}
