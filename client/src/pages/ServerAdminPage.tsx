import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  LinearProgress,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  CheckCircle as CheckIcon,
  Download as InstallIcon,
  Memory as CpuIcon,
  Storage as DiskIcon,
  Timer as UptimeIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import type { ServerStatus, User } from '@/types';
import { getServerStatus, getPackages, installPackage, getInstallProgress } from '@/api/server';
import client from '@/api/client';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import useNotificationStore from '@/stores/notificationStore';

interface PackageInfo {
  name: string;
  description: string;
  status: 'installed' | 'available' | 'installing';
  version?: string;
  progress?: number;
}

export default function ServerAdminPage() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingPkgs, setInstallingPkgs] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', admin: false });
  const notify = useNotificationStore((s) => s.show);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await client.get('admin/users');
      setUsers(data.data ?? data);
    } catch { /* ignore */ }
  }, []);

  const handleAddUser = async () => {
    try {
      await client.post('admin/users', newUser);
      notify('User created successfully', 'success');
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', admin: false });
      loadUsers();
    } catch (err: any) {
      notify(err?.response?.data?.message || 'Failed to create user', 'error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await client.delete(`admin/users/${id}`);
      notify('User deleted', 'success');
      loadUsers();
    } catch (err: any) {
      notify(err?.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [statusData, pkgData] = await Promise.all([getServerStatus(), getPackages()]);
      setStatus(statusData);
      setPackages(pkgData.data ?? pkgData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadUsers();
  }, [loadData, loadUsers]);

  // Poll for install progress when packages are installing
  useEffect(() => {
    if (installingPkgs.size === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      const updates: PackageInfo[] = [...packages];
      let anyStillInstalling = false;

      for (const name of installingPkgs) {
        try {
          const progressData = await getInstallProgress(name);
          const idx = updates.findIndex((p) => p.name === name);
          if (idx >= 0) {
            if (progressData.status === 'installed') {
              updates[idx] = { ...updates[idx], status: 'installed', progress: undefined };
              setInstallingPkgs((prev) => {
                const next = new Set(prev);
                next.delete(name);
                return next;
              });
            } else {
              updates[idx] = {
                ...updates[idx],
                status: 'installing',
                progress: progressData.progress ?? 0,
              };
              anyStillInstalling = true;
            }
          }
        } catch {
          // ignore polling errors
        }
      }

      setPackages(updates);
      if (!anyStillInstalling) {
        setInstallingPkgs(new Set());
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [installingPkgs, packages]);

  const handleInstall = async (name: string) => {
    setInstallingPkgs((prev) => new Set(prev).add(name));
    setPackages((prev) =>
      prev.map((p) => (p.name === name ? { ...p, status: 'installing' as const, progress: 0 } : p))
    );
    try {
      await installPackage(name);
    } catch {
      setInstallingPkgs((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
      setPackages((prev) =>
        prev.map((p) => (p.name === name ? { ...p, status: 'available' as const, progress: undefined } : p))
      );
    }
  };

  if (loading) return <LoadingSkeleton variant="detail" />;

  const memUsedPercent = status
    ? ((status.total_memory_gb - status.available_memory_gb) / status.total_memory_gb) * 100
    : 0;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <AdminIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h4">Server Administration</Typography>
      </Stack>

      {/* Server Status */}
      {status && (
        <Card
          sx={{
            mb: 4,
            background: 'rgba(17, 24, 39, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 229, 255, 0.1)',
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CpuIcon sx={{ color: 'primary.main' }} />
              Server Status
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={6} sm={3}>
                <StatusItem label="Version" value={status.version} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatusItem
                  label="Uptime"
                  value={status.uptime}
                  icon={<UptimeIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatusItem label="CPU Cores" value={`${status.used_cores} / ${status.cores}`} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatusItem
                  label="Docker"
                  value={status.docker_running ? 'Running' : 'Stopped'}
                  chipColor={status.docker_running ? 'success' : 'error'}
                />
              </Grid>
              <Grid item xs={12}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      <DiskIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      RAM Usage
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(status.total_memory_gb - status.available_memory_gb).toFixed(1)} / {status.total_memory_gb} GB
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={memUsedPercent}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(0, 229, 255, 0.08)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: memUsedPercent > 85 ? 'error.main' : memUsedPercent > 60 ? 'warning.main' : 'primary.main',
                        boxShadow:
                          memUsedPercent > 85
                            ? '0 0 8px rgba(239, 68, 68, 0.4)'
                            : '0 0 8px rgba(0, 229, 255, 0.3)',
                      },
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Package Manager */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Package Manager
      </Typography>
      <TableContainer
        component={Paper}
        sx={{
          background: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.08)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: 150 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.map((pkg) => (
              <TableRow key={pkg.name}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {pkg.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {pkg.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  {pkg.status === 'installed' && (
                    <Chip label="Installed" size="small" color="success" sx={{ fontWeight: 600 }} />
                  )}
                  {pkg.status === 'available' && (
                    <Chip label="Available" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(156, 163, 175, 0.2)', color: '#9CA3AF' }} />
                  )}
                  {pkg.status === 'installing' && (
                    <Stack spacing={0.5} sx={{ minWidth: 120 }}>
                      <Chip
                        label="Installing"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: 'rgba(0, 229, 255, 0.15)',
                          color: '#00E5FF',
                          animation: 'pulse-glow 2s ease-in-out infinite',
                        }}
                      />
                      {pkg.progress !== undefined && (
                        <LinearProgress
                          variant="determinate"
                          value={pkg.progress}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: 'rgba(0, 229, 255, 0.08)',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: 'primary.main',
                              borderRadius: 2,
                            },
                          }}
                        />
                      )}
                    </Stack>
                  )}
                </TableCell>
                <TableCell>
                  {pkg.status === 'installed' ? (
                    <CheckIcon sx={{ color: 'success.main' }} />
                  ) : pkg.status === 'installing' ? (
                    <Typography variant="caption" color="primary.main">
                      {pkg.progress !== undefined ? `${pkg.progress}%` : '...'}
                    </Typography>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<InstallIcon />}
                      onClick={() => handleInstall(pkg.name)}
                    >
                      Install
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {packages.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No packages found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* User Management */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon sx={{ color: 'primary.main' }} />
          User Management
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={() => setShowAddUser(true)}
        >
          Add User
        </Button>
      </Stack>
      <TableContainer
        component={Paper}
        sx={{
          background: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.08)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: 80 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip
                    label={u.admin ? 'Admin' : 'User'}
                    size="small"
                    color={u.admin ? 'primary' : 'default'}
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Delete user">
                    <IconButton size="small" onClick={() => handleDeleteUser(u.id)} sx={{ color: 'error.main' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No users found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onClose={() => setShowAddUser(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={newUser.name}
              onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
              fullWidth
              required
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newUser.admin}
                  onChange={(e) => setNewUser((p) => ({ ...p, admin: e.target.checked }))}
                />
              }
              label="Administrator"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddUser(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddUser}
            disabled={!newUser.name || !newUser.email || !newUser.password}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function StatusItem({
  label,
  value,
  icon,
  chipColor,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  chipColor?: 'success' | 'error';
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        {icon}
        {chipColor ? (
          <Chip label={value} size="small" color={chipColor} sx={{ fontWeight: 600 }} />
        ) : (
          <Typography variant="body1" fontWeight={600}>
            {value}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
