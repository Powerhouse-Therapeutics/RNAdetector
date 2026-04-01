import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Skeleton, Stack, TablePagination,
} from '@mui/material';
import { Visibility, Download, Delete, Refresh } from '@mui/icons-material';
import type { Job, JobStatus } from '@/types';
import { fetchJobs, deleteJob } from '@/api/jobs';
import useNotificationStore from '@/stores/notificationStore';

const statusConfig: Record<JobStatus, { color: string; label: string }> = {
  completed: { color: '#10B981', label: 'Completed' },
  processing: { color: '#00E5FF', label: 'Processing' },
  queued: { color: '#F59E0B', label: 'Queued' },
  failed: { color: '#EF4444', label: 'Failed' },
  ready: { color: '#9CA3AF', label: 'Ready' },
};

const typeLabels: Record<string, string> = {
  long_rna: 'RNA-seq',
  small_rna: 'Small RNA',
  circ_rna: 'CircRNA',
  sample_group: 'Sample Group',
  diff_expr: 'DEGs Analysis',
  pathway: 'Pathway',
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);
  const notify = useNotificationStore((s) => s.show);

  const loadJobs = useCallback(async () => {
    setLoading(true);
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

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Poll every 10s
  useEffect(() => {
    const interval = setInterval(loadJobs, 10000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const handleDelete = async (id: number) => {
    try {
      await deleteJob(id);
      notify('Job deleted', 'success');
      loadJobs();
    } catch {
      notify('Failed to delete job', 'error');
    }
  };

  const filteredJobs = statusFilter === 'all'
    ? jobs
    : jobs.filter((j) => j.status === statusFilter);

  return (
    <Box>
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

      <TableContainer component={Paper} sx={{ background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(12px)' }}>
        <Table>
          <TableHead>
            <TableRow>
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
                  {[...Array(5)].map((__, j) => (
                    <TableCell key={j}><Skeleton variant="text" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => {
                const sc = statusConfig[job.status];
                return (
                  <TableRow key={job.id}>
                    <TableCell>{job.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{typeLabels[job.type] ?? job.type}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sc.label}
                        size="small"
                        className={job.status === 'processing' ? 'status-running' : undefined}
                        sx={{
                          bgcolor: `${sc.color}20`,
                          color: sc.color,
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                        {new Date(job.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View">
                        <IconButton size="small" sx={{ color: 'primary.main' }}>
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
