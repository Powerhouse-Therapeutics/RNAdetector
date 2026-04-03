import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Button, Skeleton, Divider, LinearProgress, Tooltip,
} from '@mui/material';
import { CheckCircle, CloudDownload, ErrorOutline, HourglassEmpty } from '@mui/icons-material';
import { fetchReferences } from '@/api/references';
import { getPackages, installPackage, getInstallProgress } from '@/api/server';
import type { Reference } from '@/types';
import useNotificationStore from '@/stores/notificationStore';

interface PackageInfo {
  name: string;
  description: string;
  species: string;
  build: string;
  status: 'available' | 'installing' | 'installed' | 'error';
}

interface InstallState {
  status: 'installing' | 'installed' | 'error';
  progress: number;
  message: string;
}

const glassCard = {
  background: '#161B22',
  border: '1px solid rgba(240, 246, 252, 0.1)',
  borderRadius: 2,
};

const headCellSx = {
  fontWeight: 600,
  color: '#8B949E',
  borderBottom: '1px solid rgba(240, 246, 252, 0.1)',
};

function StatusChip({ status }: { status: string }) {
  switch (status) {
    case 'installed':
      return (
        <Chip
          icon={<CheckCircle sx={{ fontSize: 16 }} />}
          label="Installed"
          size="small"
          sx={{
            bgcolor: 'rgba(16, 185, 129, 0.15)',
            color: '#3FB950',
            fontWeight: 600,
          }}
        />
      );
    case 'installing':
      return (
        <Chip
          icon={<HourglassEmpty sx={{ fontSize: 16 }} />}
          label="Installing"
          size="small"
          sx={{
            bgcolor: 'rgba(88, 166, 255, 0.12)',
            color: 'rgba(88, 166, 255, 0.9)',
            fontWeight: 600,
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        />
      );
    case 'error':
      return (
        <Chip
          icon={<ErrorOutline sx={{ fontSize: 16 }} />}
          label="Error"
          size="small"
          sx={{
            bgcolor: 'rgba(239, 68, 68, 0.15)',
            color: '#F85149',
            fontWeight: 600,
          }}
        />
      );
    default:
      return (
        <Chip
          label="Available"
          size="small"
          sx={{
            bgcolor: 'rgba(156, 163, 175, 0.15)',
            color: 'rgba(156, 163, 175, 0.85)',
            fontWeight: 600,
          }}
        />
      );
  }
}

export default function ReferencesPage() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [installStates, setInstallStates] = useState<Record<string, InstallState>>({});
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const notify = useNotificationStore((s) => s.show);

  const loadData = useCallback(async () => {
    try {
      const [refsResult, pkgsResult] = await Promise.allSettled([
        fetchReferences(),
        getPackages(),
      ]);
      if (refsResult.status === 'fulfilled') {
        const refsResponse = refsResult.value;
        setReferences(Array.isArray(refsResponse) ? refsResponse : (refsResponse as any).data ?? []);
      }
      if (pkgsResult.status === 'fulfilled') {
        const pkgList: PackageInfo[] = Array.isArray(pkgsResult.value) ? pkgsResult.value : [];
        setPackages(pkgList);
        // Seed install states from packages that are already installing
        const seeded: Record<string, InstallState> = {};
        pkgList.forEach((pkg) => {
          if (pkg.status === 'installing') {
            seeded[pkg.name] = { status: 'installing', progress: 0, message: '' };
          }
        });
        setInstallStates((prev) => ({ ...seeded, ...prev }));
      }
    } catch {
      notify('Failed to load references', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clean up poll timers on unmount
  useEffect(() => {
    const timers = pollTimers.current;
    return () => {
      Object.values(timers).forEach(clearInterval);
    };
  }, []);

  const startPolling = useCallback(
    (pkgName: string) => {
      // Clear any existing timer for this package
      if (pollTimers.current[pkgName]) {
        clearInterval(pollTimers.current[pkgName]);
      }

      pollTimers.current[pkgName] = setInterval(async () => {
        try {
          const result = await getInstallProgress(pkgName);
          const { status, progress, message } = result;

          if (status === 'installed') {
            clearInterval(pollTimers.current[pkgName]);
            delete pollTimers.current[pkgName];
            setInstallStates((prev) => ({
              ...prev,
              [pkgName]: { status: 'installed', progress: 100, message },
            }));
            setPackages((prev) =>
              prev.map((p) => (p.name === pkgName ? { ...p, status: 'installed' } : p)),
            );
            notify(`Package "${pkgName}" installed successfully`, 'success');
            // Refresh references list since a new one was installed
            try {
              const refsResponse = await fetchReferences();
              setReferences(Array.isArray(refsResponse) ? refsResponse : (refsResponse as any).data ?? []);
            } catch {
              // silent — references will refresh on next page load
            }
          } else if (status === 'error') {
            clearInterval(pollTimers.current[pkgName]);
            delete pollTimers.current[pkgName];
            setInstallStates((prev) => ({
              ...prev,
              [pkgName]: { status: 'error', progress, message },
            }));
            setPackages((prev) =>
              prev.map((p) => (p.name === pkgName ? { ...p, status: 'error' } : p)),
            );
            notify(`Package "${pkgName}" installation failed: ${message}`, 'error');
          } else {
            setInstallStates((prev) => ({
              ...prev,
              [pkgName]: { status: 'installing', progress, message },
            }));
          }
        } catch {
          // Network hiccup — keep polling
        }
      }, 3000);
    },
    [notify],
  );

  // Start polling for any packages that are already installing on mount
  useEffect(() => {
    Object.entries(installStates).forEach(([name, state]) => {
      if (state.status === 'installing' && !pollTimers.current[name]) {
        startPolling(name);
      }
    });
  }, [installStates, startPolling]);

  const handleInstall = async (pkgName: string) => {
    try {
      setInstallStates((prev) => ({
        ...prev,
        [pkgName]: { status: 'installing', progress: 0, message: 'Starting install...' },
      }));
      setPackages((prev) =>
        prev.map((p) => (p.name === pkgName ? { ...p, status: 'installing' } : p)),
      );

      await installPackage(pkgName);
      notify(`Installing package "${pkgName}"...`, 'info');
      startPolling(pkgName);
    } catch {
      setInstallStates((prev) => ({
        ...prev,
        [pkgName]: { status: 'error', progress: 0, message: 'Failed to start installation' },
      }));
      setPackages((prev) =>
        prev.map((p) => (p.name === pkgName ? { ...p, status: 'error' } : p)),
      );
      notify(`Failed to start installation of "${pkgName}"`, 'error');
    }
  };

  const skeletonRows = (cols: number) =>
    [...Array(3)].map((_, i) => (
      <TableRow key={i}>
        {[...Array(cols)].map((__, j) => (
          <TableCell key={j}>
            <Skeleton variant="text" sx={{ bgcolor: 'rgba(139, 148, 158, 0.08)' }} />
          </TableCell>
        ))}
      </TableRow>
    ));

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ mb: 3, fontWeight: 700 }}
      >
        References
      </Typography>

      {/* ── Installed References ── */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Installed References
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4, ...glassCard }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headCellSx}>Name</TableCell>
              <TableCell sx={headCellSx}>Species</TableCell>
              <TableCell sx={headCellSx}>Genome Build</TableCell>
              <TableCell sx={headCellSx}>Source</TableCell>
              <TableCell sx={headCellSx}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              skeletonRows(5)
            ) : references.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No references installed
                </TableCell>
              </TableRow>
            ) : (
              references.map((ref) => (
                <TableRow
                  key={ref.id}
                  sx={{ '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.03)' } }}
                >
                  <TableCell>{ref.name}</TableCell>
                  <TableCell>{ref.species}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono' }}>
                      {ref.genome_build}
                    </Typography>
                  </TableCell>
                  <TableCell>{ref.source}</TableCell>
                  <TableCell>
                    <StatusChip status={ref.installed ? 'installed' : 'available'} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Available Packages ── */}
      <Divider sx={{ mb: 3, borderColor: 'rgba(240, 246, 252, 0.1)' }} />
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Available Packages
      </Typography>
      <TableContainer component={Paper} sx={{ ...glassCard }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headCellSx}>Package</TableCell>
              <TableCell sx={headCellSx}>Species</TableCell>
              <TableCell sx={headCellSx}>Build</TableCell>
              <TableCell sx={headCellSx}>Description</TableCell>
              <TableCell sx={headCellSx}>Status</TableCell>
              <TableCell sx={headCellSx} align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              skeletonRows(6)
            ) : packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No packages available
                </TableCell>
              </TableRow>
            ) : (
              packages.map((pkg) => {
                const state = installStates[pkg.name];
                const isInstalling = state?.status === 'installing';
                const isInstalled = pkg.status === 'installed' || state?.status === 'installed';
                const isError = pkg.status === 'error' || state?.status === 'error';
                const effectiveStatus = state?.status ?? pkg.status;

                return (
                  <TableRow
                    key={pkg.name}
                    sx={{ '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.03)' } }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {pkg.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{pkg.species}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono' }}>
                        {pkg.build}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {pkg.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ minWidth: 180 }}>
                        <StatusChip status={effectiveStatus} />
                        {isInstalling && state && (
                          <Box sx={{ mt: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={state.progress}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(88, 166, 255, 0.06)',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  background:
                                    '#58A6FF',
                                },
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                color: 'rgba(88, 166, 255, 0.7)',
                                fontFamily: 'JetBrains Mono',
                                fontSize: '0.7rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 240,
                              }}
                            >
                              {state.progress}% &mdash; {state.message || 'Working...'}
                            </Typography>
                          </Box>
                        )}
                        {isError && state?.message && (
                          <Tooltip title={state.message} arrow>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                color: '#F85149',
                                fontSize: '0.7rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 240,
                                cursor: 'help',
                              }}
                            >
                              {state.message}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={isInstalled ? <CheckCircle /> : <CloudDownload />}
                        disabled={isInstalled || isInstalling}
                        onClick={() => handleInstall(pkg.name)}
                        sx={{
                          borderColor: 'rgba(240, 246, 252, 0.1)',
                          color: '#58A6FF',
                          textTransform: 'none',
                          fontWeight: 500,
                          '&:hover': {
                            borderColor: '#58A6FF',
                            bgcolor: 'rgba(88, 166, 255, 0.06)',
                          },
                          '&.Mui-disabled': {
                            borderColor: 'rgba(240, 246, 252, 0.06)',
                            color: 'rgba(139, 148, 158, 0.5)',
                          },
                        }}
                      >
                        {isInstalled
                          ? 'Installed'
                          : isInstalling
                            ? 'Installing...'
                            : isError
                              ? 'Retry'
                              : 'Install'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
