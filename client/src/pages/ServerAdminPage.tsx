import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
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
  keyframes,
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
  Shield as ShieldIcon,
} from '@mui/icons-material';
import type { ServerStatus, User } from '@/types';
import { getServerStatus, getPackages, installPackage, getInstallProgress } from '@/api/server';
import client, { getErrorMessage } from '@/api/client';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import useNotificationStore from '@/stores/notificationStore';
import useAuthStore from '@/stores/authStore';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const subtlePulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(88, 166, 255, 0.2); }
  50%  { box-shadow: 0 0 8px 0 rgba(88, 166, 255, 0.15); }
  100% { box-shadow: 0 0 0 0 rgba(88, 166, 255, 0.2); }
`;

const tableHeaderCellSx = {
  fontWeight: 600,
  color: '#8B949E',
  fontSize: '0.78rem',
  letterSpacing: '0.03em',
  textTransform: 'uppercase' as const,
  borderBottom: '1px solid rgba(88, 166, 255, 0.08)',
};

const tableContainerSx = {
  background: 'rgba(22, 27, 34, 0.8)',
  borderRadius: '12px',
  border: '1px solid rgba(88, 166, 255, 0.06)',
  overflow: 'hidden' as const,
};

interface PackageInfo {
  name: string;
  description: string;
  status: 'installed' | 'available' | 'installing';
  version?: string;
  progress?: number;
}

export default function ServerAdminPage() {
  const user = useAuthStore((s) => s.user);
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
      const result = data?.data ?? data;
      setUsers(Array.isArray(result) ? result : []);
    } catch { /* ignore */ }
  }, []);

  const handleAddUser = async () => {
    try {
      await client.post('admin/users', newUser);
      notify('User created successfully', 'success');
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', admin: false });
      loadUsers();
    } catch (err: unknown) {
      notify(getErrorMessage(err, 'Failed to create user'), 'error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await client.delete(`admin/users/${id}`);
      notify('User deleted', 'success');
      loadUsers();
    } catch (err: unknown) {
      notify(getErrorMessage(err, 'Failed to delete user'), 'error');
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [statusResult, pkgResult] = await Promise.allSettled([getServerStatus(), getPackages()]);
      if (statusResult.status === 'fulfilled' && statusResult.value) {
        setStatus(statusResult.value);
      }
      if (pkgResult.status === 'fulfilled') {
        const pkgData = pkgResult.value;
        const list = pkgData?.data ?? pkgData;
        setPackages(Array.isArray(list) ? list : []);
      }
    } catch {
      notify('Failed to load server data', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

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

  if (user && !user.admin) {
    return <Navigate to="/" replace />;
  }

  if (loading) return <LoadingSkeleton variant="detail" />;

  const memUsedPercent = status
    ? (status.total_memory_gb > 0 ? ((status.total_memory_gb - status.available_memory_gb) / status.total_memory_gb) * 100 : 0)
    : 0;

  return (
    <Box sx={{ animation: `${fadeInUp} 300ms ease` }}>
      <Box sx={{ mb: 3.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(88, 166, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AdminIcon sx={{ color: '#58A6FF', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#C9D1D9', letterSpacing: '-0.01em' }}>Server Administration</Typography>
            <Typography variant="body2" sx={{ color: '#8B949E', mt: 0.25 }}>Manage server resources, packages, and users</Typography>
          </Box>
        </Stack>
      </Box>

      {/* Server Status */}
      {status && (
        <Box sx={{ animation: `${fadeInUp} 400ms ease`, animationDelay: '100ms', animationFillMode: 'both' }}>
        <Card
          sx={{
            mb: 4,
            background: 'rgba(22, 27, 34, 0.8)',
            border: '1px solid rgba(88, 166, 255, 0.08)',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: 'rgba(88, 166, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CpuIcon sx={{ color: '#58A6FF', fontSize: 16 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#C9D1D9' }}>Server Status</Typography>
            </Stack>
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
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <DiskIcon sx={{ fontSize: 14, color: '#8B949E' }} />
                      <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500 }}>RAM Usage</Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: '#C9D1D9', fontWeight: 500 }}>
                      {(status.total_memory_gb - status.available_memory_gb).toFixed(1)} / {status.total_memory_gb} GB
                    </Typography>
                  </Stack>
                  <Box sx={{ position: 'relative', height: 6, borderRadius: 3, bgcolor: 'rgba(88, 166, 255, 0.06)', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        position: 'absolute', top: 0, left: 0, height: '100%',
                        width: `${Math.min(memUsedPercent, 100)}%`,
                        borderRadius: 3,
                        bgcolor: memUsedPercent > 85 ? '#F85149' : memUsedPercent > 65 ? '#F59E0B' : '#58A6FF',
                        transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1), background-color 400ms ease',
                        boxShadow: `0 0 8px ${memUsedPercent > 85 ? 'rgba(248, 81, 73, 0.25)' : 'rgba(88, 166, 255, 0.25)'}`,
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        </Box>
      )}

      {/* Package Manager */}
      <Box sx={{ animation: `${fadeInUp} 400ms ease`, animationDelay: '200ms', animationFillMode: 'both' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: 'rgba(188, 140, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <InstallIcon sx={{ color: '#BC8CFF', fontSize: 16 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#C9D1D9' }}>Package Manager</Typography>
      </Stack>
      <TableContainer component={Paper} sx={tableContainerSx}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={tableHeaderCellSx}>Name</TableCell>
              <TableCell sx={tableHeaderCellSx}>Description</TableCell>
              <TableCell sx={tableHeaderCellSx}>Status</TableCell>
              <TableCell sx={{ ...tableHeaderCellSx, width: 150 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.map((pkg) => (
              <TableRow key={pkg.name} sx={{ transition: 'background-color 200ms ease', '& > td': { borderBottom: '1px solid rgba(88, 166, 255, 0.04)', py: 1.5 }, '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.03) !important' } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#C9D1D9' }}>
                    {pkg.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#8B949E' }}>
                    {pkg.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  {pkg.status === 'installed' && (
                    <Chip label="Installed" size="small" sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: 'rgba(63, 185, 80, 0.1)', color: '#3FB950', border: '1px solid rgba(63, 185, 80, 0.15)' }} />
                  )}
                  {pkg.status === 'available' && (
                    <Chip label="Available" size="small" sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: 'rgba(139, 148, 158, 0.08)', color: '#8B949E', border: '1px solid rgba(139, 148, 158, 0.12)' }} />
                  )}
                  {pkg.status === 'installing' && (
                    <Stack spacing={0.75} sx={{ minWidth: 120 }}>
                      <Chip label="Installing" size="small" sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: 'rgba(88, 166, 255, 0.1)', color: '#58A6FF', border: '1px solid rgba(88, 166, 255, 0.15)', animation: `${subtlePulse} 2.4s ease-in-out infinite` }} />
                      {pkg.progress !== undefined && (
                        <Box sx={{ position: 'relative', height: 4, borderRadius: 2, bgcolor: 'rgba(88, 166, 255, 0.06)', overflow: 'hidden' }}>
                          <Box sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pkg.progress}%`, borderRadius: 2, bgcolor: '#58A6FF', transition: 'width 500ms ease' }} />
                        </Box>
                      )}
                    </Stack>
                  )}
                </TableCell>
                <TableCell>
                  {pkg.status === 'installed' ? (
                    <CheckIcon sx={{ color: '#3FB950', fontSize: 20 }} />
                  ) : pkg.status === 'installing' ? (
                    <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: '#58A6FF', fontWeight: 600 }}>
                      {pkg.progress !== undefined ? `${pkg.progress}%` : '...'}
                    </Typography>
                  ) : (
                    <Button variant="outlined" size="small" startIcon={<InstallIcon sx={{ fontSize: 16 }} />} onClick={() => handleInstall(pkg.name)}
                      sx={{ borderRadius: '8px', borderColor: 'rgba(88, 166, 255, 0.2)', color: '#58A6FF', fontSize: '0.78rem', transition: 'all 200ms ease', '&:hover': { borderColor: 'rgba(88, 166, 255, 0.4)', bgcolor: 'rgba(88, 166, 255, 0.06)' } }}>
                      Install
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {packages.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                  <Typography variant="body2" sx={{ color: '#484F58', fontStyle: 'italic' }}>No packages found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      {/* User Management */}
      <Box sx={{ animation: `${fadeInUp} 400ms ease`, animationDelay: '300ms', animationFillMode: 'both', mt: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: 'rgba(63, 185, 80, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PeopleIcon sx={{ color: '#3FB950', fontSize: 16 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#C9D1D9' }}>User Management</Typography>
          {users.length > 0 && (
            <Chip label={`${users.length} users`} size="small" sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, bgcolor: 'rgba(139, 148, 158, 0.08)', color: '#8B949E', ml: 1 }} />
          )}
        </Stack>
        <Button variant="outlined" size="small" startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />} onClick={() => setShowAddUser(true)}
          sx={{ borderRadius: '8px', borderColor: 'rgba(88, 166, 255, 0.2)', color: '#58A6FF', fontSize: '0.82rem', transition: 'all 200ms ease', '&:hover': { borderColor: 'rgba(88, 166, 255, 0.4)', bgcolor: 'rgba(88, 166, 255, 0.06)' } }}>
          Add User
        </Button>
      </Stack>
      <TableContainer component={Paper} sx={tableContainerSx}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={tableHeaderCellSx}>Name</TableCell>
              <TableCell sx={tableHeaderCellSx}>Email</TableCell>
              <TableCell sx={tableHeaderCellSx}>Role</TableCell>
              <TableCell sx={tableHeaderCellSx}>Created</TableCell>
              <TableCell sx={{ ...tableHeaderCellSx, width: 80 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} sx={{ transition: 'background-color 200ms ease', '& > td': { borderBottom: '1px solid rgba(88, 166, 255, 0.04)', py: 1.5 }, '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.03) !important' } }}>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 500, color: '#C9D1D9' }}>{u.name}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ color: '#8B949E' }}>{u.email}</Typography></TableCell>
                <TableCell>
                  <Chip
                    icon={u.admin ? <ShieldIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                    label={u.admin ? 'Admin' : 'User'}
                    size="small"
                    sx={{
                      fontWeight: 600, fontSize: '0.72rem',
                      bgcolor: u.admin ? 'rgba(88, 166, 255, 0.1)' : 'rgba(139, 148, 158, 0.08)',
                      color: u.admin ? '#58A6FF' : '#8B949E',
                      border: `1px solid ${u.admin ? 'rgba(88, 166, 255, 0.15)' : 'rgba(139, 148, 158, 0.12)'}`,
                      '& .MuiChip-icon': { color: 'inherit' },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#8B949E' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Delete user">
                    <IconButton size="small" onClick={() => handleDeleteUser(u.id)}
                      sx={{ color: '#F85149', borderRadius: '6px', opacity: 0.6, transition: 'all 200ms ease', '&:hover': { opacity: 1, bgcolor: 'rgba(248, 81, 73, 0.1)' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                  <Typography variant="body2" sx={{ color: '#484F58', fontStyle: 'italic' }}>No users found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onClose={() => setShowAddUser(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: '#161B22', border: '1px solid rgba(88, 166, 255, 0.1)', borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#C9D1D9', pb: 0.5 }}>Add New User</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: '#484F58', display: 'block', mb: 2 }}>Create a new user account for RNAdetector.</Typography>
          <Stack spacing={2.5}>
            <TextField label="Name" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} fullWidth required size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '& fieldset': { borderColor: 'rgba(88, 166, 255, 0.12)' }, '&:hover fieldset': { borderColor: 'rgba(88, 166, 255, 0.25)' } } }} />
            <TextField label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} fullWidth required size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '& fieldset': { borderColor: 'rgba(88, 166, 255, 0.12)' }, '&:hover fieldset': { borderColor: 'rgba(88, 166, 255, 0.25)' } } }} />
            <TextField label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} fullWidth required size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', '& fieldset': { borderColor: 'rgba(88, 166, 255, 0.12)' }, '&:hover fieldset': { borderColor: 'rgba(88, 166, 255, 0.25)' } } }} />
            <FormControlLabel
              control={<Switch checked={newUser.admin} onChange={(e) => setNewUser((p) => ({ ...p, admin: e.target.checked }))} />}
              label={<Typography variant="body2" sx={{ color: '#C9D1D9' }}>Administrator</Typography>}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowAddUser(false)} sx={{ color: '#8B949E', borderRadius: '8px', '&:hover': { bgcolor: 'rgba(139, 148, 158, 0.08)' } }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddUser} disabled={!newUser.name || !newUser.email || !newUser.password}
            sx={{ borderRadius: '8px', bgcolor: 'rgba(88, 166, 255, 0.15)', color: '#58A6FF', boxShadow: 'none', fontWeight: 600, transition: 'all 200ms ease',
              '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.25)', boxShadow: '0 0 12px rgba(88, 166, 255, 0.15)' },
              '&.Mui-disabled': { bgcolor: 'rgba(88, 166, 255, 0.06)', color: 'rgba(88, 166, 255, 0.3)' } }}>
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
      <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500, display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        {icon}
        {chipColor ? (
          <Chip label={value} size="small" sx={{
            fontWeight: 600, fontSize: '0.72rem',
            bgcolor: chipColor === 'success' ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)',
            color: chipColor === 'success' ? '#3FB950' : '#F85149',
            border: `1px solid ${chipColor === 'success' ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)'}`,
          }} />
        ) : (
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#C9D1D9' }}>
            {value}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
