import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CardActionArea, Grid, Chip, Stack,
  Skeleton, keyframes,
} from '@mui/material';
import {
  Biotech, AcUnit, BubbleChart, CompareArrows, AccountTree, Groups,
  Speed, Storage, CheckCircle, Schedule, TrendingUp, Memory,
} from '@mui/icons-material';
import type { Job, ServerStatus, Reference } from '@/types';
import client from '@/api/client';

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const subtlePulse = keyframes`
  0%   { opacity: 1; }
  50%  { opacity: 0.5; }
  100% { opacity: 1; }
`;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const analysisCards = [
  { label: 'RNA-seq', path: '/analysis/long-rna', icon: <Biotech />, desc: 'Long RNA sequencing analysis' },
  { label: 'Small RNA', path: '/analysis/small-rna', icon: <AcUnit />, desc: 'miRNA and small RNA analysis' },
  { label: 'CircRNA', path: '/analysis/circ-rna', icon: <BubbleChart />, desc: 'Circular RNA detection' },
  { label: 'Sample Groups', path: '/analysis/sample-group', icon: <Groups />, desc: 'Group samples for comparison' },
  { label: 'DEGs Analysis', path: '/analysis/diff-expr', icon: <CompareArrows />, desc: 'Differential expression' },
  { label: 'Pathway Analysis', path: '/analysis/pathway', icon: <AccountTree />, desc: 'Gene set enrichment' },
];

const statusColor: Record<string, string> = {
  completed: '#3FB950',
  processing: '#58A6FF',
  queued: '#D29922',
  failed: '#F85149',
  ready: '#8B949E',
};

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */

function AnimatedCard({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        animation: `${fadeInUp} 400ms ease both`,
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </Box>
  );
}

function ResourceBar({
  label,
  icon,
  used,
  total,
  unit,
  color = '#58A6FF',
}: {
  label: string;
  icon: React.ReactNode;
  used: number;
  total: number;
  unit: string;
  color?: string;
}) {
  const percent = total > 0 ? (used / total) * 100 : 0;
  const barColor = percent > 85 ? '#F85149' : percent > 65 ? '#D29922' : color;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ color: 'rgba(139, 148, 158, 0.7)', display: 'flex', '& svg': { fontSize: 15 } }}>{icon}</Box>
          <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500 }}>{label}</Typography>
        </Stack>
        <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono', color: '#C9D1D9', fontWeight: 500 }}>
          {typeof used === 'number' && used % 1 !== 0 ? used.toFixed(1) : used} / {total} {unit}
        </Typography>
      </Stack>
      <Box sx={{ position: 'relative', height: 6, borderRadius: 3, bgcolor: 'rgba(88, 166, 255, 0.06)', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${Math.min(percent, 100)}%`,
            borderRadius: 3,
            bgcolor: barColor,
            transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1), background-color 400ms ease',
            boxShadow: `0 0 8px ${barColor}40`,
          }}
        />
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const navigate = useNavigate();
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    const load = async () => {
      try {
        const [statusRes, jobsRes, refsRes] = await Promise.allSettled([
          client.get('server/status', { signal }),
          client.get('jobs', { params: { per_page: 5, sort_by: 'created_at', sort_dir: 'desc' }, signal }),
          client.get('references', { signal }),
        ]);
        if (signal.aborted) return;
        if (statusRes.status === 'fulfilled') {
          const d = statusRes.value.data?.data ?? statusRes.value.data;
          if (d && typeof d === 'object') setServerStatus(d);
        }
        if (jobsRes.status === 'fulfilled') {
          const d = jobsRes.value.data?.data ?? jobsRes.value.data;
          setRecentJobs(Array.isArray(d) ? d : []);
        }
        if (refsRes.status === 'fulfilled') {
          const d = refsRes.value.data?.data ?? refsRes.value.data;
          setReferences(Array.isArray(d) ? d : []);
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    load();

    return () => { abortRef.current?.abort(); };
  }, []);

  const installedRefs = references.filter((r) => r.installed);
  const jobStats = {
    completed: recentJobs.filter((j) => j.status === 'completed').length,
    active: recentJobs.filter((j) => j.status === 'processing' || j.status === 'queued').length,
    failed: recentJobs.filter((j) => j.status === 'failed').length,
  };

  return (
    <Box>
      {/* Header */}
      <AnimatedCard delay={0}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#C9D1D9', letterSpacing: '-0.01em' }}>
            Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#8B949E', mt: 0.5 }}>
            Overview of your analysis environment
          </Typography>
        </Box>
      </AnimatedCard>

      <Grid container spacing={3}>
        {/* Server Status Card */}
        <Grid item xs={12} md={4}>
          <AnimatedCard delay={100}>
            <Card sx={{ height: '100%', borderColor: 'rgba(88, 166, 255, 0.1)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      bgcolor: 'rgba(88, 166, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Speed sx={{ color: '#58A6FF', fontSize: 18 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#C9D1D9' }}>
                    Server Status
                  </Typography>
                </Stack>
                {loading ? (
                  <Stack spacing={1.5}>
                    <Skeleton variant="rounded" height={16} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rounded" height={6} sx={{ borderRadius: 3 }} />
                    <Skeleton variant="rounded" height={16} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rounded" height={6} sx={{ borderRadius: 3 }} />
                  </Stack>
                ) : serverStatus ? (
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ color: '#8B949E' }}>Version</Typography>
                      <Chip
                        label={serverStatus.version}
                        size="small"
                        sx={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: '0.7rem',
                          height: 22,
                          bgcolor: 'rgba(88, 166, 255, 0.08)',
                          color: '#58A6FF',
                          border: '1px solid rgba(88, 166, 255, 0.15)',
                        }}
                      />
                    </Stack>
                    <ResourceBar
                      label="CPU Cores"
                      icon={<Memory />}
                      used={serverStatus.used_cores}
                      total={serverStatus.cores}
                      unit="cores"
                    />
                    <ResourceBar
                      label="Memory"
                      icon={<TrendingUp />}
                      used={+(serverStatus.total_memory_gb - serverStatus.available_memory_gb).toFixed(1)}
                      total={serverStatus.total_memory_gb}
                      unit="GB"
                      color="#BC8CFF"
                    />
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: '#8B949E', fontStyle: 'italic' }}>
                    Unable to load server status
                  </Typography>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </Grid>

        {/* Recent Jobs Card */}
        <Grid item xs={12} md={4}>
          <AnimatedCard delay={200}>
            <Card sx={{ height: '100%', borderColor: 'rgba(88, 166, 255, 0.1)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        bgcolor: 'rgba(88, 166, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Schedule sx={{ color: '#58A6FF', fontSize: 18 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#C9D1D9' }}>
                      Recent Jobs
                    </Typography>
                  </Stack>
                  {!loading && recentJobs.length > 0 && (
                    <Stack direction="row" spacing={0.75}>
                      {jobStats.active > 0 && (
                        <Chip
                          label={jobStats.active}
                          size="small"
                          sx={{
                            height: 20,
                            minWidth: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: 'rgba(88, 166, 255, 0.12)',
                            color: '#58A6FF',
                            animation: `${subtlePulse} 2s ease-in-out infinite`,
                          }}
                        />
                      )}
                    </Stack>
                  )}
                </Stack>
                {loading ? (
                  <Stack spacing={1}>
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} variant="rounded" height={36} sx={{ borderRadius: 1.5 }} />
                    ))}
                  </Stack>
                ) : recentJobs.length > 0 ? (
                  <Stack spacing={0.75}>
                    {recentJobs.map((job) => (
                      <Box
                        key={job.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          px: 1.5,
                          py: 1,
                          borderRadius: '8px',
                          bgcolor: 'rgba(22, 27, 34, 0.5)',
                          border: '1px solid rgba(88, 166, 255, 0.04)',
                          cursor: 'pointer',
                          transition: 'all 200ms ease',
                          '&:hover': {
                            bgcolor: 'rgba(88, 166, 255, 0.06)',
                            borderColor: 'rgba(88, 166, 255, 0.12)',
                            transform: 'translateX(2px)',
                          },
                        }}
                        onClick={() => navigate('/jobs')}
                      >
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 160, color: '#C9D1D9', fontSize: '0.82rem' }}
                        >
                          {job.name}
                        </Typography>
                        <Chip
                          label={job.status}
                          size="small"
                          sx={{
                            height: 22,
                            bgcolor: `${statusColor[job.status]}15`,
                            color: statusColor[job.status],
                            fontWeight: 600,
                            fontSize: '0.68rem',
                            letterSpacing: '0.02em',
                            border: `1px solid ${statusColor[job.status]}20`,
                            ...(job.status === 'processing' && {
                              animation: `${subtlePulse} 2s ease-in-out infinite`,
                            }),
                          }}
                        />
                      </Box>
                    ))}
                    <Box
                      onClick={() => navigate('/jobs')}
                      sx={{
                        textAlign: 'center',
                        pt: 1,
                        cursor: 'pointer',
                        transition: 'color 200ms ease',
                        '&:hover': { color: '#58A6FF' },
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500 }}>
                        View all jobs
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" sx={{ color: '#8B949E', fontStyle: 'italic' }}>
                      No recent jobs
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </Grid>

        {/* Installed References Card */}
        <Grid item xs={12} md={4}>
          <AnimatedCard delay={300}>
            <Card sx={{ height: '100%', borderColor: 'rgba(88, 166, 255, 0.1)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        bgcolor: 'rgba(63, 185, 80, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Storage sx={{ color: '#3FB950', fontSize: 18 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#C9D1D9' }}>
                      References
                    </Typography>
                  </Stack>
                  {!loading && installedRefs.length > 0 && (
                    <Chip
                      label={`${installedRefs.length} installed`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        bgcolor: 'rgba(63, 185, 80, 0.1)',
                        color: '#3FB950',
                        border: '1px solid rgba(63, 185, 80, 0.15)',
                      }}
                    />
                  )}
                </Stack>
                {loading ? (
                  <Stack spacing={1}>
                    {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={28} sx={{ borderRadius: 1 }} />)}
                  </Stack>
                ) : installedRefs.length > 0 ? (
                  <Stack spacing={0.75}>
                    {installedRefs.slice(0, 5).map((ref) => (
                      <Stack
                        key={ref.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          px: 1.5,
                          py: 0.75,
                          borderRadius: '8px',
                          bgcolor: 'rgba(22, 27, 34, 0.5)',
                          border: '1px solid rgba(63, 185, 80, 0.04)',
                          transition: 'all 200ms ease',
                          '&:hover': {
                            bgcolor: 'rgba(63, 185, 80, 0.04)',
                            borderColor: 'rgba(63, 185, 80, 0.1)',
                          },
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 14, color: '#3FB950' }} />
                        <Typography variant="body2" sx={{ flex: 1, fontSize: '0.82rem', color: '#C9D1D9' }}>
                          {ref.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8B949E', fontSize: '0.7rem' }}>
                          {ref.species}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" sx={{ color: '#8B949E', fontStyle: 'italic' }}>
                      No references installed
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </Grid>

        {/* Quick Start Analysis Cards */}
        <Grid item xs={12}>
          <AnimatedCard delay={400}>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#C9D1D9' }}>
                Quick Start
              </Typography>
              <Typography variant="caption" sx={{ color: '#8B949E' }}>
                Launch a new analysis pipeline
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {analysisCards.map((card, idx) => (
                <Grid item xs={12} sm={6} md={4} lg={2} key={card.path}>
                  <Box
                    sx={{
                      animation: `${fadeInUp} 400ms ease both`,
                      animationDelay: `${500 + idx * 60}ms`,
                    }}
                  >
                    <Card
                      sx={{
                        border: '1px solid rgba(88, 166, 255, 0.06)',
                        '&:hover': {
                          borderColor: 'rgba(88, 166, 255, 0.2)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 12px rgba(88, 166, 255, 0.06)',
                        },
                        transition: 'all 200ms ease',
                      }}
                    >
                      <CardActionArea
                        onClick={() => navigate(card.path)}
                        sx={{
                          p: 2.5,
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.75,
                        }}
                      >
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: 'rgba(88, 166, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 0.5,
                            transition: 'all 200ms ease',
                            '& svg': { fontSize: 24, color: '#58A6FF', transition: 'color 200ms ease' },
                            '.MuiCardActionArea-root:hover &': {
                              bgcolor: 'rgba(88, 166, 255, 0.14)',
                            },
                          }}
                        >
                          {card.icon}
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#C9D1D9', lineHeight: 1.3 }}>
                          {card.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8B949E', lineHeight: 1.4, fontSize: '0.7rem' }}>
                          {card.desc}
                        </Typography>
                      </CardActionArea>
                    </Card>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </AnimatedCard>
        </Grid>
      </Grid>
    </Box>
  );
}
