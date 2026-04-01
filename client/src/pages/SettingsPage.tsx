import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Divider, Avatar,
} from '@mui/material';
import { Save, Person } from '@mui/icons-material';
import useAuthStore from '@/stores/authStore';
import useNotificationStore from '@/stores/notificationStore';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const notify = useNotificationStore((s) => s.show);
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || '/api/');

  const handleSaveApi = () => {
    notify('API URL configuration is managed via environment variables (VITE_API_URL)', 'info');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Settings
      </Typography>

      <Stack spacing={3} sx={{ maxWidth: 600 }}>
        {/* User Profile */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person sx={{ color: 'primary.main' }} /> User Profile
            </Typography>
            {user ? (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.dark', color: 'primary.contrastText', width: 48, height: 48 }}>
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{user.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  </Box>
                </Box>
                <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.08)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Role</Typography>
                  <Typography variant="body2">{user.admin ? 'Administrator' : 'User'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Member since</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">Loading user profile...</Typography>
            )}
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>API Configuration</Typography>
            <Stack spacing={2}>
              <TextField
                label="API Base URL"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                fullWidth
                size="small"
                helperText="Set via VITE_API_URL environment variable at build time"
                InputProps={{ sx: { fontFamily: 'JetBrains Mono', fontSize: '0.875rem' } }}
              />
              <Box>
                <Button variant="outlined" startIcon={<Save />} onClick={handleSaveApi} size="small">
                  Save
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
