import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { fetchJobs, deleteJob } from '@/api/jobs';
import type { Job } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

interface JobsListProps {
  limit?: number;
  showPagination?: boolean;
  onView?: (job: Job) => void;
  onDownload?: (job: Job) => void;
}

type SortDirection = 'asc' | 'desc';

export default function JobsList({
  limit,
  showPagination = true,
  onView,
  onDownload,
}: JobsListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuJob, setMenuJob] = useState<Job | null>(null);
  const perPage = limit || 15;

  const loadJobs = useCallback(async () => {
    try {
      const result = await fetchJobs(page + 1, perPage, {
        field: sortField,
        direction: sortDir,
      });
      setJobs(result.data);
      setTotalCount(result.total);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortField, sortDir]);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 10000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const handleSort = (field: string) => {
    const isAsc = sortField === field && sortDir === 'asc';
    setSortDir(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, job: Job) => {
    setMenuAnchor(event.currentTarget);
    setMenuJob(job);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuJob(null);
  };

  const handleDelete = async () => {
    if (menuJob) {
      await deleteJob(menuJob.id);
      loadJobs();
    }
    handleMenuClose();
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) return <LoadingSkeleton variant="table" rows={5} />;

  return (
    <Box>
      <TableContainer
        component={Paper}
        sx={{
          background: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.08)',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              {[
                { id: 'name', label: 'Name' },
                { id: 'type', label: 'Type' },
                { id: 'status', label: 'Status' },
                { id: 'created_at', label: 'Created' },
              ].map((col) => (
                <TableCell key={col.id} sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  <TableSortLabel
                    active={sortField === col.id}
                    direction={sortField === col.id ? sortDir : 'asc'}
                    onClick={() => handleSort(col.id)}
                    sx={{
                      '&.Mui-active': { color: 'primary.main' },
                      '& .MuiTableSortLabel-icon': { color: 'primary.main !important' },
                    }}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No jobs found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {jobs.map((job) => (
              <TableRow key={job.id} hover sx={{ cursor: 'pointer' }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {job.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {job.type.replace(/_/g, ' ')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <StatusBadge status={job.status} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(job.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, job)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {showPagination && totalCount > perPage && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={perPage}
          rowsPerPageOptions={[perPage]}
          sx={{ borderTop: '1px solid rgba(0, 229, 255, 0.06)' }}
        />
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: '#1F2937',
            border: '1px solid rgba(0, 229, 255, 0.12)',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuJob && onView) onView(menuJob);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <ViewIcon fontSize="small" sx={{ color: 'primary.main' }} />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuJob && onDownload) onDownload(menuJob);
            handleMenuClose();
          }}
          disabled={menuJob?.status !== 'completed'}
        >
          <ListItemIcon>
            <DownloadIcon fontSize="small" sx={{ color: 'success.main' }} />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
