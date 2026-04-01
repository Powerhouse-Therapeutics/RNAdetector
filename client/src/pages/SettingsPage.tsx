import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Divider, Avatar, Alert,
} from '@mui/material';
import { Save, Person, Lock } from '@mui/icons-material';
import useAuthStore from '@/stores/authStore';
import useNotificationStore from '@/stores/notificationStore';
import client from '@/api/client';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const notify = useNotificationStore((s) => s.show);

  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const { data } = await client.put('auth/profile', { name: profileName, email: profileEmail });
      setUser(data);
      notify('Profile updated successfully', 'success');
    } catch (err: any) {
      notify(err?.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setPasswordSaving(true);
    try {
      await client.post('auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      notify('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'primary.dark', color: 'primary.contrastText', width: 48, height: 48 }}>
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {user.admin ? 'Administrator' : 'User'} &middot; Member since {new Date(user.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.08)' }} />
                <TextField
                  label="Name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  fullWidth
                  size="small"
                />
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<Save />}
                    onClick={handleSaveProfile}
                    size="small"
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">Loading user profile...</Typography>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock sx={{ color: 'primary.main' }} /> Change Password
            </Typography>
            {passwordError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPasswordError(null)}>
                {passwordError}
              </Alert>
            )}
            <Stack spacing={2}>
              <TextField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                size="small"
              />
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<Lock />}
                  onClick={handleChangePassword}
                  size="small"
                  disabled={passwordSaving || !currentPassword || !newPassword}
                >
                  {passwordSaving ? 'Changing...' : 'Change Password'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
