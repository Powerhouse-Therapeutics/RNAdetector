import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Skeleton, Stack, TablePagination, Collapse, LinearProgress, keyframes,
} from '@mui/material';
import {
  Visibility, Download, Delete, Refresh,
  KeyboardArrowDown, KeyboardArrowRight, ErrorOutline,
} from '@mui/icons-material';
import type { Job, JobStatus } from '@/types';
import { fetchJobs, fetchJob, deleteJob } from '@/api/jobs';
import useNotificationStore from '@/stores/notificationStore';

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const ACTIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 15_000;

const subtlePulse = keyframes`
  0%   { box-shadow: 0 0 0 0 currentColor; }
  50%  { box-shadow: 0 0 6px 0 currentColor; }
  100% { box-shadow: 0 0 0 0 currentColor; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const statusConfig: Record<JobStatus, { color: string; label: string }> = {
  completed:  { color: '#3FB950', label: 'Completed' },
  processing: { color: '#58A6FF', label: 'Processing' },
  queued:     { color: '#D29922', label: 'Queued' },
  failed:     { color: '#F85149', label: 'Failed' },
  ready:      { color: '#8B949E', label: 'Ready' },
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

/** Format relative time e.g. "2m ago", "3h ago" */
function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

/** Syntax-highlight log lines: timestamps, errors, warnings */
function highlightLog(log: string): React.ReactNode[] {
  return log.split('\n').map((line, i) => {
    const isError = /error|fail|exception|fatal/i.test(line);
    const isWarning = /warn|warning/i.test(line);
    const hasTimestamp = /^\[?\d{4}[-/]\d{2}[-/]\d{2}[\sT]\d{2}:\d{2}/.test(line)
      || /^\d{2}:\d{2}:\d{2}/.test(line);

    let lineColor = 'rgba(201, 209, 217, 0.7)';
    if (isError) lineColor = '#F85149';
    else if (isWarning) lineColor = '#D29922';

    let styledLine: React.ReactNode;

    if (hasTimestamp) {
      const tsMatch = line.match(/^(\[?\d{4}[-/]\d{2}[-/]\d{2}[\sT]\d{2}:\d{2}[:\d.]*\]?|\d{2}:\d{2}:\d{2})/);
      if (tsMatch) {
        const ts = tsMatch[0];
        const rest = line.slice(ts.length);
        styledLine = (
          <>
            <span style={{ color: '#8B949E' }}>{ts}</span>
            <span style={{ color: lineColor }}>{rest}</span>
          </>
        );
      } else {
        styledLine = <span style={{ color: lineColor }}>{line}</span>;
      }
    } else {
      styledLine = <span style={{ color: lineColor }}>{line}</span>;
    }

    return (
      <div key={i} style={{ minHeight: '1.5em' }}>
        <span style={{ color: '#484F58', userSelect: 'none', display: 'inline-block', width: 40, textAlign: 'right', marginRight: 12, fontSize: '0.68rem' }}>
          {i + 1}
        </span>
        {styledLine}
      </div>
    );
  });
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
    <Box
      sx={{
        px: 3,
        py: 2.5,
        background: 'rgba(13, 17, 23, 0.6)',
        borderTop: '1px solid rgba(88, 166, 255, 0.06)',
        animation: `${fadeIn} 200ms ease`,
      }}
    >
      {/* Progress bar for active jobs */}
      {isActive && (
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500 }}>
              Progress
            </Typography>
            <Typography variant="caption" sx={{ color: '#58A6FF', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
              {progress !== null ? `${progress}%` : 'Indeterminate'}
            </Typography>
          </Stack>
          <Box sx={{ position: 'relative', height: 6, borderRadius: 3, bgcolor: 'rgba(88, 166, 255, 0.06)', overflow: 'hidden' }}>
            {progress !== null ? (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: 3,
                  bgcolor: '#58A6FF',
                  transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 8px rgba(88, 166, 255, 0.3)',
                }}
              />
            ) : (
              <LinearProgress
                variant="indeterminate"
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'transparent',
                  '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: '#58A6FF' },
                }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Time info */}
      <Stack direction="row" spacing={4} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500, display: 'block', mb: 0.25 }}>
            Elapsed
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#C9D1D9', fontWeight: 500 }}>
            {formatDuration(elapsed)}
          </Typography>
        </Box>
        {remaining && (
          <Box>
            <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500, display: 'block', mb: 0.25 }}>
              Est. Remaining
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#58A6FF', fontWeight: 500 }}>
              ~{remaining}
            </Typography>
          </Box>
        )}
        {j.completed_at && (
          <Box>
            <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500, display: 'block', mb: 0.25 }}>
              Completed
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#C9D1D9' }}>
              {new Date(j.completed_at).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Parameters summary */}
      {params.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500, mb: 0.75, display: 'block' }}>
            Parameters
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 0.5,
              background: 'rgba(13, 17, 23, 0.5)',
              borderRadius: '8px',
              p: 1.5,
              fontFamily: 'JetBrains Mono',
              fontSize: '0.73rem',
              border: '1px solid rgba(88, 166, 255, 0.04)',
            }}
          >
            {params.map(([k, v]) => (
              <Box key={k} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Typography
                  component="span"
                  sx={{ color: '#58A6FF', fontFamily: 'inherit', fontSize: 'inherit', mr: 0.5 }}
                >
                  {k}:
                </Typography>
                <Typography
                  component="span"
                  sx={{ color: 'rgba(201, 209, 217, 0.65)', fontFamily: 'inherit', fontSize: 'inherit' }}
                >
                  {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Log readout with syntax highlighting */}
      <Box>
        <Typography variant="caption" sx={{ color: '#8B949E', fontWeight: 500, mb: 0.75, display: 'block' }}>
          Log
        </Typography>
        {loading && !j.log ? (
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '8px' }} />
        ) : j.log ? (
          <Box
            sx={{
              maxHeight: 340,
              overflow: 'auto',
              background: 'rgba(13, 17, 23, 0.8)',
              borderRadius: '8px',
              p: 2,
              fontFamily: 'JetBrains Mono',
              fontSize: '0.72rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              border: '1px solid rgba(88, 166, 255, 0.06)',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(88, 166, 255, 0.15)',
                borderRadius: 3,
                '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.25)' },
              },
            }}
          >
            {highlightLog(j.log)}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: '#484F58', fontStyle: 'italic' }}>
            No log output available.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Batch grouping types                                               */
/* ------------------------------------------------------------------ */

interface BatchGroup {
  kind: 'batch';
  batchId: string;
  batchName: string;
  jobs: Job[];
  status: JobStatus;
  type: string;
  created_at: string;
}

interface SingleJob {
  kind: 'single';
  job: Job;
}

type DisplayRow = BatchGroup | SingleJob;

/** Compute an aggregate status for a batch of jobs. */
function batchStatus(jobs: Job[]): JobStatus {
  if (jobs.some((j) => j.status === 'processing')) return 'processing';
  if (jobs.some((j) => j.status === 'queued')) return 'queued';
  if (jobs.every((j) => j.status === 'completed')) return 'completed';
  if (jobs.every((j) => j.status === 'failed')) return 'failed';
  if (jobs.some((j) => j.status === 'failed') && jobs.every((j) => j.status === 'completed' || j.status === 'failed')) return 'completed';
  if (jobs.some((j) => j.status === 'ready')) return 'ready';
  return 'processing';
}

/** Group jobs by batch_id parameter; jobs without batch_id are standalone. */
function groupIntoBatches(jobs: Job[]): DisplayRow[] {
  const batches = new Map<string, Job[]>();
  const standalone: Job[] = [];

  for (const job of jobs) {
    const bid = job.parameters?.batch_id as string | undefined;
    if (bid) {
      const list = batches.get(bid);
      if (list) list.push(job);
      else batches.set(bid, [job]);
    } else {
      standalone.push(job);
    }
  }

  const rows: DisplayRow[] = [];
  const seen = new Set<string>();

  // Preserve original order: walk through jobs in order, emit batch row on first encounter
  for (const job of jobs) {
    const bid = job.parameters?.batch_id as string | undefined;
    if (bid) {
      if (!seen.has(bid)) {
        seen.add(bid);
        const batchJobs = batches.get(bid)!;
        rows.push({
          kind: 'batch',
          batchId: bid,
          batchName: (batchJobs[0].parameters?.batch_name as string) || batchJobs[0].name,
          jobs: batchJobs,
          status: batchStatus(batchJobs),
          type: batchJobs[0].type,
          created_at: batchJobs[0].created_at,
        });
      }
    } else {
      rows.push({ kind: 'single', job });
    }
  }
  return rows;
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

  // Expanded row state: job id or batch id
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Expanded batch: which batch_id has its sub-jobs visible
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

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
      setJobs(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
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

  const loadDetail = useCallback(async (id: number, isInitial = false) => {
    if (isInitial) setDetailLoading(true);
    try {
      const detail = await fetchJob(id);
      // Only apply if still expanded on the same job
      if (expandedIdRef.current === id) {
        setDetailJob(detail);
      }
    } catch {
      // Silently ignore; the summary data from the list is still shown
    } finally {
      if (isInitial) setDetailLoading(false);
    }
  }, []);

  // When expanded job is active, poll its detail every 5s
  useEffect(() => {
    if (expandedId === null || typeof expandedId !== 'number') return;
    loadDetail(expandedId, true);
    const expandedJob = jobs.find((j) => j.id === expandedId);
    const isActive = expandedJob && (expandedJob.status === 'processing' || expandedJob.status === 'queued');
    if (!isActive) return;
    const interval = setInterval(() => loadDetail(expandedId, false), ACTIVE_POLL_MS);
    return () => clearInterval(interval);
  }, [expandedId, jobs, loadDetail]);

  /* ---- Expand / collapse for single job detail panel ---- */
  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailJob(null);
    } else {
      setExpandedId(id);
      setDetailJob(null);
    }
  };

  /* ---- Expand / collapse for batch sub-jobs ---- */
  const toggleBatch = (batchId: string) => {
    setExpandedBatchId((prev) => (prev === batchId ? null : batchId));
  };

  /* ---- Delete all jobs in a batch ---- */
  const handleDeleteBatch = async (batchJobs: Job[]) => {
    const deletable = batchJobs.filter((j) => ['ready', 'completed', 'failed'].includes(j.status));
    if (deletable.length === 0) {
      notify('No deletable jobs in this batch', 'error');
      return;
    }
    if (!window.confirm(`Delete ${deletable.length} job(s) from this batch?`)) return;
    try {
      await Promise.all(deletable.map((j) => deleteJob(j.id)));
      notify(`${deletable.length} job(s) deleted`, 'success');
      loadJobs();
    } catch {
      notify('Failed to delete some jobs', 'error');
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
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

  /* ---- Group into batches and filter ---- */
  const displayRows = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? jobs
      : jobs.filter((j) => j.status === statusFilter);
    return groupIntoBatches(filtered);
  }, [jobs, statusFilter]);

  /* ---- Status chip renderer ---- */
  const renderStatusChip = (job: Job) => {
    const sc = statusConfig[job.status];
    const progress = parseProgress(job.log);

    let label = sc.label;
    let isAnimated = false;

    switch (job.status) {
      case 'processing':
        label = progress !== null ? `Processing ${progress}%` : 'Processing';
        isAnimated = true;
        break;
      case 'queued': {
        const pos = queuePositions.get(job.id);
        if (pos) label = `Queued #${pos}`;
        isAnimated = true;
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
            bgcolor: `${sc.color}15`,
            color: sc.color,
            fontWeight: 600,
            fontFamily: 'JetBrains Mono',
            fontSize: '0.72rem',
            letterSpacing: '0.01em',
            border: `1px solid ${sc.color}20`,
            transition: 'all 200ms ease',
            ...(isAnimated && {
              animation: `${subtlePulse} 2.4s ease-in-out infinite`,
            }),
          }}
        />
        {job.status === 'failed' && (
          <ErrorOutline sx={{ color: '#F85149', fontSize: 16 }} />
        )}
      </Stack>
    );
  };

  /** Render a status chip for a batch group */
  const renderBatchStatusChip = (batch: BatchGroup) => {
    const sc = statusConfig[batch.status];
    const completedCount = batch.jobs.filter((j) => j.status === 'completed').length;
    const totalCount = batch.jobs.length;
    const isAnimated = batch.status === 'processing' || batch.status === 'queued';

    let label = sc.label;
    if (batch.status === 'processing' || batch.status === 'queued') {
      label = `${completedCount}/${totalCount} done`;
    } else if (batch.status === 'completed') {
      label = `All ${totalCount} done`;
    }

    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Chip
          label={label}
          size="small"
          sx={{
            bgcolor: `${sc.color}15`,
            color: sc.color,
            fontWeight: 600,
            fontFamily: 'JetBrains Mono',
            fontSize: '0.72rem',
            letterSpacing: '0.01em',
            border: `1px solid ${sc.color}20`,
            transition: 'all 200ms ease',
            ...(isAnimated && {
              animation: `${subtlePulse} 2.4s ease-in-out infinite`,
            }),
          }}
        />
        {batch.jobs.some((j) => j.status === 'failed') && (
          <ErrorOutline sx={{ color: '#F85149', fontSize: 16 }} />
        )}
      </Stack>
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <Box sx={{ animation: `${fadeIn} 300ms ease` }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#C9D1D9', letterSpacing: '-0.01em' }}>
            Jobs
          </Typography>
          <Typography variant="body2" sx={{ color: '#8B949E', mt: 0.25 }}>
            {total > 0 ? `${total} total jobs` : 'Manage analysis jobs'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl
            size="small"
            sx={{
              minWidth: 140,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '& fieldset': { borderColor: 'rgba(88, 166, 255, 0.12)' },
                '&:hover fieldset': { borderColor: 'rgba(88, 166, 255, 0.25)' },
              },
            }}
          >
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
            <IconButton
              onClick={loadJobs}
              sx={{
                color: '#58A6FF',
                bgcolor: 'rgba(88, 166, 255, 0.06)',
                borderRadius: '8px',
                transition: 'all 200ms ease',
                '&:hover': {
                  bgcolor: 'rgba(88, 166, 255, 0.12)',
                  transform: 'rotate(45deg)',
                },
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          background: '#161B22',
          borderRadius: '12px',
          border: '1px solid rgba(240, 246, 252, 0.1)',
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(88, 166, 255, 0.08)' } }}>
              <TableCell sx={{ fontWeight: 600, width: 48, color: '#8B949E' }} />
              <TableCell sx={{ fontWeight: 600, color: '#8B949E', fontSize: '0.78rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#8B949E', fontSize: '0.78rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#8B949E', fontSize: '0.78rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#8B949E', fontSize: '0.78rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#8B949E', fontSize: '0.78rem', letterSpacing: '0.03em', textTransform: 'uppercase' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="rounded" height={20} sx={{ borderRadius: 1 }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : displayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                  <Typography variant="body2" sx={{ color: '#484F58', fontStyle: 'italic' }}>
                    No jobs found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) => {
                if (row.kind === 'batch') {
                  const isBatchExpanded = expandedBatchId === row.batchId;
                  return (
                    <React.Fragment key={`batch-${row.batchId}`}>
                      {/* Batch header row */}
                      <TableRow
                        hover
                        onClick={() => toggleBatch(row.batchId)}
                        sx={{
                          cursor: 'pointer',
                          transition: 'background-color 200ms ease',
                          '& > td': {
                            borderBottom: isBatchExpanded ? 'none' : '1px solid rgba(88, 166, 255, 0.04)',
                            py: 1.5,
                          },
                          '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.04) !important' },
                          bgcolor: 'rgba(88, 166, 255, 0.02)',
                        }}
                      >
                        <TableCell sx={{ width: 48, pr: 0 }}>
                          <IconButton
                            size="small"
                            sx={{
                              color: '#58A6FF',
                              transition: 'transform 200ms ease, color 200ms ease',
                              transform: isBatchExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}
                          >
                            <KeyboardArrowRight />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#C9D1D9' }}>
                              {row.batchName}
                            </Typography>
                            <Chip
                              label={`${row.jobs.length} samples`}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(88, 166, 255, 0.08)',
                                color: '#58A6FF',
                                fontWeight: 600,
                                fontSize: '0.68rem',
                                height: 20,
                                border: '1px solid rgba(88, 166, 255, 0.15)',
                              }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeLabels[row.type] ?? row.type}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.72rem',
                              height: 24,
                              borderColor: 'rgba(88, 166, 255, 0.12)',
                              color: '#8B949E',
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell>{renderBatchStatusChip(row)}</TableCell>
                        <TableCell>
                          <Stack>
                            <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#C9D1D9' }}>
                              {new Date(row.created_at).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#484F58', fontSize: '0.68rem' }}>
                              {relativeTime(row.created_at)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Delete Batch">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteBatch(row.jobs)}
                                sx={{
                                  color: '#F85149',
                                  borderRadius: '6px',
                                  opacity: 0.6,
                                  transition: 'all 200ms ease',
                                  '&:hover': { opacity: 1, bgcolor: 'rgba(248, 81, 73, 0.1)' },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {/* Expanded sub-job rows */}
                      {isBatchExpanded && row.jobs.map((job) => {
                        const isSubExpanded = expandedId === job.id;
                        // Extract sample name from job name (after " - ")
                        const dashIdx = job.name.indexOf(' - ');
                        const sampleLabel = dashIdx >= 0 ? job.name.substring(dashIdx + 3) : job.name;
                        return (
                          <React.Fragment key={job.id}>
                            <TableRow
                              hover
                              onClick={() => toggleExpand(job.id)}
                              sx={{
                                cursor: 'pointer',
                                transition: 'background-color 200ms ease',
                                '& > td': {
                                  borderBottom: isSubExpanded ? 'none' : '1px solid rgba(88, 166, 255, 0.04)',
                                  py: 1,
                                },
                                '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.04) !important' },
                              }}
                            >
                              <TableCell sx={{ width: 48, pr: 0 }}>
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: '#8B949E',
                                    transition: 'transform 200ms ease, color 200ms ease',
                                    transform: isSubExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    '&:hover': { color: '#58A6FF' },
                                    ml: 2,
                                  }}
                                >
                                  <KeyboardArrowDown sx={{ fontSize: 18 }} />
                                </IconButton>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 400, color: '#8B949E', pl: 2 }}>
                                  {sampleLabel}
                                </Typography>
                              </TableCell>
                              <TableCell />
                              <TableCell>{renderStatusChip(job)}</TableCell>
                              <TableCell />
                              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  <Tooltip title="View Report">
                                    <IconButton
                                      size="small"
                                      onClick={() => navigate(`/jobs/${job.id}/report`)}
                                      sx={{
                                        color: '#58A6FF',
                                        borderRadius: '6px',
                                        transition: 'all 200ms ease',
                                        '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.1)' },
                                      }}
                                    >
                                      <Visibility sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDelete(job.id)}
                                      sx={{
                                        color: '#F85149',
                                        borderRadius: '6px',
                                        opacity: 0.6,
                                        transition: 'all 200ms ease',
                                        '&:hover': { opacity: 1, bgcolor: 'rgba(248, 81, 73, 0.1)' },
                                      }}
                                    >
                                      <Delete sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>

                            {/* Sub-job detail panel */}
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                sx={{
                                  p: 0,
                                  borderBottom: isSubExpanded ? '1px solid rgba(88, 166, 255, 0.06)' : 'none',
                                }}
                              >
                                <Collapse in={isSubExpanded} timeout={250} unmountOnExit>
                                  <DetailPanel job={job} detailJob={detailJob} loading={detailLoading} />
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                }

                // Single (non-batch) job row
                const job = row.job;
                const isExpanded = expandedId === job.id;
                return (
                  <React.Fragment key={job.id}>
                    <TableRow
                      hover
                      onClick={() => toggleExpand(job.id)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 200ms ease',
                        '& > td': {
                          borderBottom: isExpanded ? 'none' : '1px solid rgba(88, 166, 255, 0.04)',
                          py: 1.5,
                        },
                        '&:hover': {
                          bgcolor: 'rgba(88, 166, 255, 0.04) !important',
                        },
                      }}
                    >
                      <TableCell sx={{ width: 48, pr: 0 }}>
                        <IconButton
                          size="small"
                          sx={{
                            color: '#8B949E',
                            transition: 'transform 200ms ease, color 200ms ease',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            '&:hover': { color: '#58A6FF' },
                          }}
                        >
                          <KeyboardArrowDown />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#C9D1D9' }}>
                          {job.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeLabels[job.type] ?? job.type}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '0.72rem',
                            height: 24,
                            borderColor: 'rgba(88, 166, 255, 0.12)',
                            color: '#8B949E',
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>{renderStatusChip(job)}</TableCell>
                      <TableCell>
                        <Stack>
                          <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#C9D1D9' }}>
                            {new Date(job.created_at).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#484F58', fontSize: '0.68rem' }}>
                            {relativeTime(job.created_at)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="View Report">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/jobs/${job.id}/report`)}
                              sx={{
                                color: '#58A6FF',
                                borderRadius: '6px',
                                transition: 'all 200ms ease',
                                '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.1)' },
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {job.status === 'completed' && (
                            <Tooltip title="Download">
                              <IconButton
                                size="small"
                                sx={{
                                  color: '#3FB950',
                                  borderRadius: '6px',
                                  transition: 'all 200ms ease',
                                  '&:hover': { bgcolor: 'rgba(63, 185, 80, 0.1)' },
                                }}
                              >
                                <Download fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(job.id)}
                              sx={{
                                color: '#F85149',
                                borderRadius: '6px',
                                opacity: 0.6,
                                transition: 'all 200ms ease',
                                '&:hover': { opacity: 1, bgcolor: 'rgba(248, 81, 73, 0.1)' },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>

                    {/* Expandable detail row */}
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        sx={{
                          p: 0,
                          borderBottom: isExpanded ? '1px solid rgba(88, 166, 255, 0.06)' : 'none',
                        }}
                      >
                        <Collapse in={isExpanded} timeout={250} unmountOnExit>
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
          sx={{
            borderTop: '1px solid rgba(88, 166, 255, 0.06)',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              color: '#8B949E',
              fontSize: '0.8rem',
            },
          }}
        />
      </TableContainer>
    </Box>
  );
}
