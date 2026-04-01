import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Skeleton, Stack, TablePagination, Collapse, LinearProgress, keyframes,
} from '@mui/material';
import {
  Visibility, Download, Delete, Refresh,
  KeyboardArrowDown, KeyboardArrowUp, ErrorOutline,
} from '@mui/icons-material';
import type { Job, JobStatus } from '@/types';
import { fetchJobs, fetchJob, deleteJob } from '@/api/jobs';
import useNotificationStore from '@/stores/notificationStore';

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const ACTIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 15_000;

const pulse = keyframes`
  0%   { opacity: 1; }
  50%  { opacity: 0.4; }
  100% { opacity: 1; }
`;

const statusConfig: Record<JobStatus, { color: string; label: string }> = {
  completed:  { color: '#10B981', label: 'Completed' },
  processing: { color: '#00E5FF', label: 'Processing' },
  queued:     { color: '#F59E0B', label: 'Queued' },
  failed:     { color: '#EF4444', label: 'Failed' },
  ready:      { color: '#9CA3AF', label: 'Ready' },
};

const typeLabels: Record<string, string> = {
  long_rna: 'RNA-seq',                    long_rna_job_type: 'RNA-seq',
  small_rna: 'Small RNA',                 small_rna_job_type: 'Small RNA',
  circ_rna: 'CircRNA',                    circ_rna_job_type: 'CircRNA',
  sample_group: 'Sample Group',           samples_group_job_type: 'Sample Group',
  diff_expr: 'DEGs Analysis',             diff_expr_analysis_job_type: 'DEGs Analysis',
  pathway: 'Pathway',                     pathway_analysis_job_type: 'Pathway',
};

/** Parse a progress percentage from the log text (last occurrence of e.g. "42%"). */
function parseProgress(log: string | null | undefined): number | null {
  if (!log) return null;
  const matches = log.match(/(\d{1,3})%/g);
  if (!matches || matches.length === 0) return null;
  const last = parseInt(matches[matches.length - 1], 10);
  return last >= 0 && last <= 100 ? last : null;
}

/** Format milliseconds into a human-readable duration string. */
function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Compute elapsed ms from a date string to now. */
function elapsedMs(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.max(0, Date.now() - new Date(dateStr).getTime());
}

/** Estimate remaining time based on progress and elapsed. */
function estimateRemaining(elapsed: number, progress: number | null): string | null {
  if (progress === null || progress <= 0 || progress >= 100) return null;
  const total = (elapsed / progress) * 100;
  const remaining = total - elapsed;
  return formatDuration(remaining);
}

/* ------------------------------------------------------------------ */
/*  Detail panel                                                       */
/* ------------------------------------------------------------------ */

interface DetailPanelProps {
  job: Job;
  detailJob: Job | null;
  loading: boolean;
}

function DetailPanel({ job, detailJob, loading }: DetailPanelProps) {
  const j = detailJob ?? job;
  const progress = parseProgress(j.log);
  const startRef = j.started_at ?? j.created_at;
  const elapsed = elapsedMs(startRef);
  const isActive = j.status === 'processing';
  const remaining = isActive ? estimateRemaining(elapsed, progress) : null;

  const params = j.parameters && typeof j.parameters === 'object'
    ? Object.entries(j.parameters) : [];

  return (
    <Box sx={{ px: 3, py: 2, background: 'rgba(17, 24, 39, 0.4)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Progress bar for active jobs */}
      {isActive && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Progress
            </Typography>
            <Typography variant="caption" sx={{ color: '#00E5FF', fontFamily: 'JetBrains Mono' }}>
              {progress !== null ? `${progress}%` : 'Indeterminate'}
            </Typography>
          </Stack>
          <LinearProgress
            variant={progress !== null ? 'determinate' : 'indeterminate'}
            value={progress ?? 0}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(0, 229, 255, 0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: '#00E5FF',
              },
            }}
          />
        </Box>
      )}

      {/* Time info */}
      <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Elapsed</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
            {formatDuration(elapsed)}
          </Typography>
        </Box>
        {remaining && (
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Est. Remaining</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#00E5FF' }}>
              ~{remaining}
            </Typography>
          </Box>
        )}
        {j.completed_at && (
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Completed</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
              {new Date(j.completed_at).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Parameters summary */}
      {params.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5, display: 'block' }}>
            Parameters
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 0.5,
              background: 'rgba(17, 24, 39, 0.6)',
              borderRadius: 1,
              p: 1.5,
              fontFamily: 'JetBrains Mono',
              fontSize: '0.75rem',
            }}
          >
            {params.map(([k, v]) => (
              <Box key={k} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Typography
                  component="span"
                  sx={{ color: '#00E5FF', fontFamily: 'inherit', fontSize: 'inherit', mr: 0.5 }}
                >
                  {k}:
                </Typography>
                <Typography
                  component="span"
                  sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', fontSize: 'inherit' }}
                >
                  {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Log readout */}
      <Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5, display: 'block' }}>
          Log
        </Typography>
        {loading ? (
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
        ) : j.log ? (
          <Box
            sx={{
              maxHeight: 320,
              overflow: 'auto',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 1,
              p: 1.5,
              fontFamily: 'JetBrains Mono',
              fontSize: '0.72rem',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.75)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              border: '1px solid rgba(255,255,255,0.06)',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,229,255,0.25)', borderRadius: 3 },
            }}
          >
            {j.log}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
            No log output available.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);

  // Expanded row state: job id -> detailed Job (or null while loading)
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const notify = useNotificationStore((s) => s.show);

  // Track whether there are active jobs for adaptive polling
  const hasActiveJobs = useMemo(
    () => jobs.some((j) => j.status === 'processing' || j.status === 'queued'),
    [jobs],
  );

  /* ---- Load jobs list ---- */
  const loadJobs = useCallback(async () => {
    try {
      const res = await fetchJobs(page + 1, rowsPerPage, { field: 'created_at', direction: 'desc' });
      setJobs(res.data);
      setTotal(res.total);
    } catch {
      notify('Failed to load jobs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, notify]);

  // Initial load only shows skeleton; subsequent polls update silently
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      setLoading(true);
      initialLoadDone.current = true;
    }
    loadJobs();
  }, [loadJobs]);

  // Adaptive polling: 5s for active jobs, 15s otherwise
  useEffect(() => {
    const ms = hasActiveJobs ? ACTIVE_POLL_MS : IDLE_POLL_MS;
    const interval = setInterval(loadJobs, ms);
    return () => clearInterval(interval);
  }, [loadJobs, hasActiveJobs]);

  /* ---- Refresh detail for expanded active job ---- */
  const expandedIdRef = useRef(expandedId);
  expandedIdRef.current = expandedId;

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const detail = await fetchJob(id);
      // Only apply if still expanded on the same job
      if (expandedIdRef.current === id) {
        setDetailJob(detail);
      }
    } catch {
      // Silently ignore; the summary data from the list is still shown
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // When expanded job is active, poll its detail every 5s
  useEffect(() => {
    if (expandedId === null) return;
    loadDetail(expandedId);
    const expandedJob = jobs.find((j) => j.id === expandedId);
    const isActive = expandedJob && (expandedJob.status === 'processing' || expandedJob.status === 'queued');
    if (!isActive) return;
    const interval = setInterval(() => loadDetail(expandedId), ACTIVE_POLL_MS);
    return () => clearInterval(interval);
  }, [expandedId, jobs, loadDetail]);

  /* ---- Expand / collapse ---- */
  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailJob(null);
    } else {
      setExpandedId(id);
      setDetailJob(null);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id: number) => {
    try {
      await deleteJob(id);
      notify('Job deleted', 'success');
      if (expandedId === id) {
        setExpandedId(null);
        setDetailJob(null);
      }
      loadJobs();
    } catch {
      notify('Failed to delete job', 'error');
    }
  };

  /* ---- Compute queue positions ---- */
  const queuePositions = useMemo(() => {
    const queued = jobs
      .filter((j) => j.status === 'queued')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const map = new Map<number, number>();
    queued.forEach((j, i) => map.set(j.id, i + 1));
    return map;
  }, [jobs]);

  /* ---- Filter ---- */
  const filteredJobs = statusFilter === 'all'
    ? jobs
    : jobs.filter((j) => j.status === statusFilter);

  /* ---- Status chip renderer ---- */
  const renderStatusChip = (job: Job) => {
    const sc = statusConfig[job.status];
    const progress = parseProgress(job.log);

    let label = sc.label;
    let extraSx: Record<string, unknown> = {};

    switch (job.status) {
      case 'processing':
        label = progress !== null ? `Processing ${progress}%` : 'Processing';
        extraSx = { animation: `${pulse} 1.8s ease-in-out infinite` };
        break;
      case 'queued': {
        const pos = queuePositions.get(job.id);
        if (pos) label = `Queued #${pos}`;
        break;
      }
      case 'completed': {
        const start = job.started_at ?? job.created_at;
        const end = job.completed_at ?? job.updated_at;
        const dur = new Date(end).getTime() - new Date(start).getTime();
        if (dur > 0) label = `Done (${formatDuration(dur)})`;
        break;
      }
      case 'failed':
        break;
      default:
        break;
    }

    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Chip
          label={label}
          size="small"
          sx={{
            bgcolor: `${sc.color}20`,
            color: sc.color,
            fontWeight: 600,
            fontFamily: 'JetBrains Mono',
            fontSize: '0.72rem',
            ...extraSx,
          }}
        />
        {job.status === 'failed' && (
          <ErrorOutline sx={{ color: '#EF4444', fontSize: 16 }} />
        )}
      </Stack>
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Jobs
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="queued">Queued</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="ready">Ready</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={loadJobs} sx={{ color: 'primary.main' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(12px)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 48 }} />
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((__, j) => (
                    <TableCell key={j}><Skeleton variant="text" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => {
                const isExpanded = expandedId === job.id;
                return (
                  <React.Fragment key={job.id}>
                    <TableRow
                      hover
                      onClick={() => toggleExpand(job.id)}
                      sx={{ cursor: 'pointer', '& > td': { borderBottom: isExpanded ? 'none' : undefined } }}
                    >
                      <TableCell sx={{ width: 48, pr: 0 }}>
                        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{job.name}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{typeLabels[job.type] ?? job.type}</Typography>
                      </TableCell>
                      <TableCell>{renderStatusChip(job)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                          {new Date(job.created_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="View Report">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/jobs/${job.id}/report`)}
                            sx={{ color: 'primary.main' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {job.status === 'completed' && (
                          <Tooltip title="Download">
                            <IconButton size="small" sx={{ color: 'success.main' }}>
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(job.id)} sx={{ color: 'error.main' }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>

                    {/* Expandable detail row */}
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <DetailPanel job={job} detailJob={detailJob} loading={detailLoading} />
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 15, 25, 50]}
        />
      </TableContainer>
    </Box>
  );
}
