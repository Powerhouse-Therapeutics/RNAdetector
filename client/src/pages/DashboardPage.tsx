import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CardActionArea, Grid, Chip, Stack,
  Skeleton, LinearProgress,
} from '@mui/material';
import {
  Biotech, AcUnit, BubbleChart, CompareArrows, AccountTree, Groups,
  Speed, Storage, CheckCircle, Schedule,
} from '@mui/icons-material';
import type { Job, ServerStatus, Reference } from '@/types';
import client from '@/api/client';

const analysisCards = [
  { label: 'RNA-seq', path: '/analysis/long-rna', icon: <Biotech />, desc: 'Long RNA sequencing analysis' },
  { label: 'Small RNA', path: '/analysis/small-rna', icon: <AcUnit />, desc: 'miRNA and small RNA analysis' },
  { label: 'CircRNA', path: '/analysis/circ-rna', icon: <BubbleChart />, desc: 'Circular RNA detection' },
  { label: 'Sample Groups', path: '/analysis/sample-group', icon: <Groups />, desc: 'Group samples for comparison' },
  { label: 'DEGs Analysis', path: '/analysis/diff-expr', icon: <CompareArrows />, desc: 'Differential expression' },
  { label: 'Pathway Analysis', path: '/analysis/pathway', icon: <AccountTree />, desc: 'Gene set enrichment' },
];

const statusColor: Record<string, string> = {
  completed: '#10B981',
  processing: '#00E5FF',
  queued: '#F59E0B',
  failed: '#EF4444',
  ready: '#9CA3AF',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statusRes, jobsRes, refsRes] = await Promise.allSettled([
          client.get<ServerStatus>('server/status'),
          client.get('jobs', { params: { per_page: 5, sort_by: 'created_at', sort_dir: 'desc' } }),
          client.get<Reference[]>('references'),
        ]);
        if (statusRes.status === 'fulfilled') setServerStatus(statusRes.value.data);
        if (jobsRes.status === 'fulfilled') setRecentJobs(jobsRes.value.data.data ?? jobsRes.value.data);
        if (refsRes.status === 'fulfilled') setReferences(refsRes.value.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Server Status */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed sx={{ color: 'primary.main' }} /> Server Status
              </Typography>
              {loading ? (
                <Stack spacing={1}>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                </Stack>
              ) : serverStatus ? (
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Version</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono' }}>{serverStatus.version}</Typography>
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">CPU Cores</Typography>
                      <Typography variant="body2">{serverStatus.used_cores}/{serverStatus.cores}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(serverStatus.used_cores / serverStatus.cores) * 100}
                      sx={{ borderRadius: 1, bgcolor: 'rgba(0,229,255,0.08)' }}
                    />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">RAM</Typography>
                      <Typography variant="body2">
                        {(serverStatus.total_memory_gb - serverStatus.available_memory_gb).toFixed(1)}/{serverStatus.total_memory_gb} GB
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={((serverStatus.total_memory_gb - serverStatus.available_memory_gb) / serverStatus.total_memory_gb) * 100}
                      color="secondary"
                      sx={{ borderRadius: 1, bgcolor: 'rgba(255,0,229,0.08)' }}
                    />
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">Unable to load server status</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Jobs */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule sx={{ color: 'primary.main' }} /> Recent Jobs
              </Typography>
              {loading ? (
                <Stack spacing={1}>
                  {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rectangular" height={32} sx={{ borderRadius: 1 }} />)}
                </Stack>
              ) : recentJobs.length > 0 ? (
                <Stack spacing={1}>
                  {recentJobs.map((job) => (
                    <Box
                      key={job.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(0,229,255,0.04)' },
                      }}
                      onClick={() => navigate('/jobs')}
                    >
                      <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{job.name}</Typography>
                      <Chip
                        label={job.status}
                        size="small"
                        sx={{
                          bgcolor: `${statusColor[job.status]}20`,
                          color: statusColor[job.status],
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No recent jobs</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Installed References */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Storage sx={{ color: 'primary.main' }} /> References
              </Typography>
              {loading ? (
                <Stack spacing={1}>
                  {[...Array(3)].map((_, i) => <Skeleton key={i} variant="text" />)}
                </Stack>
              ) : references.length > 0 ? (
                <Stack spacing={1}>
                  {references.filter((r) => r.installed).slice(0, 5).map((ref) => (
                    <Box key={ref.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="body2">{ref.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {ref.species}
                      </Typography>
                    </Box>
                  ))}
                  <Typography variant="caption" color="text.secondary">
                    {references.filter((r) => r.installed).length} installed
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No references installed</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick-start Analysis Cards */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quick Start
          </Typography>
          <Grid container spacing={2}>
            {analysisCards.map((card) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={card.path}>
                <Card>
                  <CardActionArea onClick={() => navigate(card.path)} sx={{ p: 2, textAlign: 'center' }}>
                    <Box sx={{ color: 'primary.main', mb: 1, '& svg': { fontSize: 36 } }}>
                      {card.icon}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {card.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.desc}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
