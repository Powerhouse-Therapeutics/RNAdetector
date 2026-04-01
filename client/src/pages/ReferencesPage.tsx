import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Button, Skeleton, Divider,
} from '@mui/material';
import { CheckCircle, CloudDownload } from '@mui/icons-material';
import { fetchReferences, fetchPackages } from '@/api/references';
import type { Reference } from '@/types';
import useNotificationStore from '@/stores/notificationStore';

interface PackageInfo {
  name: string;
  species: string;
  genome_build: string;
  description: string;
  installed: boolean;
}

export default function ReferencesPage() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotificationStore((s) => s.show);

  useEffect(() => {
    const load = async () => {
      try {
        const [refs, pkgs] = await Promise.allSettled([fetchReferences(), fetchPackages()]);
        if (refs.status === 'fulfilled') setReferences(refs.value);
        if (pkgs.status === 'fulfilled') setPackages(pkgs.value);
      } catch {
        notify('Failed to load references', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [notify]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        References
      </Typography>

      {/* Installed References */}
      <Typography variant="h6" sx={{ mb: 2 }}>Installed References</Typography>
      <TableContainer component={Paper} sx={{ mb: 4, background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(12px)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Species</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Genome Build</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}
                </TableRow>
              ))
            ) : references.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No references installed
                </TableCell>
              </TableRow>
            ) : (
              references.map((ref) => (
                <TableRow key={ref.id}>
                  <TableCell>{ref.name}</TableCell>
                  <TableCell>{ref.species}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono' }}>{ref.genome_build}</Typography>
                  </TableCell>
                  <TableCell>{ref.source}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<CheckCircle sx={{ fontSize: 16 }} />}
                      label={ref.installed ? 'Installed' : 'Not Installed'}
                      size="small"
                      sx={{
                        bgcolor: ref.installed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                        color: ref.installed ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Available Packages */}
      <Divider sx={{ mb: 3, borderColor: 'rgba(0, 229, 255, 0.08)' }} />
      <Typography variant="h6" sx={{ mb: 2 }}>Available Packages</Typography>
      <TableContainer component={Paper} sx={{ background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(12px)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Package</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Species</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Build</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}
                </TableRow>
              ))
            ) : packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No packages available
                </TableCell>
              </TableRow>
            ) : (
              packages.map((pkg) => (
                <TableRow key={pkg.name}>
                  <TableCell>{pkg.name}</TableCell>
                  <TableCell>{pkg.species}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono' }}>{pkg.genome_build}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{pkg.description}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CloudDownload />}
                      disabled={pkg.installed}
                    >
                      {pkg.installed ? 'Installed' : 'Install'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
