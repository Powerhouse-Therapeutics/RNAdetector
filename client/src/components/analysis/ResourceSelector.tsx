import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Slider, Paper, Grid, Chip, Tooltip, Alert, Stack
} from '@mui/material';
import { Memory as MemoryIcon, Speed as CpuIcon, Info as InfoIcon } from '@mui/icons-material';

interface ServerResources {
  totalCores: number;
  totalMemoryGB: number;
  availableMemoryGB: number;
  usedCores: number;
}

interface Recommendation {
  min_threads: number;
  rec_threads: number;
  min_mem_gb: number;
  rec_mem_gb: number;
}

interface ResourceSelectorProps {
  analysisType: 'long_rna' | 'small_rna' | 'circ_rna' | 'diff_expr' | 'pathway';
  threads: number;
  memoryGB: number;
  onThreadsChange: (value: number) => void;
  onMemoryChange: (value: number) => void;
  serverResources?: ServerResources;
  recommendations?: Record<string, Recommendation>;
}

const getSliderColor = (value: number, recommended: number, max: number): string => {
  if (value <= recommended) return '#10B981'; // green
  if (value <= max) return '#F59E0B'; // yellow
  return '#EF4444'; // red
};

export default function ResourceSelector({
  analysisType,
  threads,
  memoryGB,
  onThreadsChange,
  onMemoryChange,
  serverResources,
  recommendations,
}: ResourceSelectorProps) {
  const rec = recommendations?.[analysisType];
  const maxCores = serverResources?.totalCores || 64;
  const maxMem = serverResources?.totalMemoryGB || 128;

  const threadColor = rec ? getSliderColor(threads, rec.rec_threads, maxCores) : '#00E5FF';
  const memColor = rec ? getSliderColor(memoryGB, rec.rec_mem_gb, maxMem) : '#00E5FF';

  const exceedsServer = threads > maxCores || memoryGB > maxMem;

  return (
    <Paper
      sx={{
        p: 3,
        background: 'rgba(17, 24, 39, 0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 229, 255, 0.1)',
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CpuIcon sx={{ color: 'primary.main' }} />
        Resource Configuration
      </Typography>

      {serverResources && (
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <Chip
            size="small"
            label={`Server: ${serverResources.totalCores} cores`}
            sx={{ bgcolor: 'rgba(0, 229, 255, 0.1)', color: 'primary.main' }}
          />
          <Chip
            size="small"
            label={`${serverResources.totalMemoryGB} GB RAM`}
            sx={{ bgcolor: 'rgba(0, 229, 255, 0.1)', color: 'primary.main' }}
          />
          <Chip
            size="small"
            label={`${serverResources.availableMemoryGB} GB available`}
            sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'success.main' }}
          />
        </Stack>
      )}

      {exceedsServer && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Selected resources exceed server capacity. Reduce threads or memory.
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CpuIcon fontSize="small" />
              CPU Threads: <strong>{threads}</strong>
              {rec && (
                <Tooltip title={`Recommended: ${rec.rec_threads}, Minimum: ${rec.min_threads}`}>
                  <InfoIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              )}
            </Typography>
            <Slider
              value={threads}
              min={1}
              max={maxCores}
              step={1}
              onChange={(_, val) => onThreadsChange(val as number)}
              valueLabelDisplay="auto"
              marks={rec ? [
                { value: rec.min_threads, label: `${rec.min_threads} min` },
                { value: rec.rec_threads, label: `${rec.rec_threads} rec` },
                { value: maxCores, label: `${maxCores} max` },
              ] : undefined}
              sx={{
                color: threadColor,
                '& .MuiSlider-track': { boxShadow: `0 0 8px ${threadColor}40` },
                '& .MuiSlider-thumb': { boxShadow: `0 0 12px ${threadColor}60` },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MemoryIcon fontSize="small" />
              Memory (GB): <strong>{memoryGB}</strong>
              {rec && (
                <Tooltip title={`Recommended: ${rec.rec_mem_gb} GB, Minimum: ${rec.min_mem_gb} GB`}>
                  <InfoIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              )}
            </Typography>
            <Slider
              value={memoryGB}
              min={1}
              max={maxMem}
              step={1}
              onChange={(_, val) => onMemoryChange(val as number)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v} GB`}
              marks={rec ? [
                { value: rec.min_mem_gb, label: `${rec.min_mem_gb} GB` },
                { value: rec.rec_mem_gb, label: `${rec.rec_mem_gb} GB` },
                { value: maxMem, label: `${maxMem} GB` },
              ] : undefined}
              sx={{
                color: memColor,
                '& .MuiSlider-track': { boxShadow: `0 0 8px ${memColor}40` },
                '& .MuiSlider-thumb': { boxShadow: `0 0 12px ${memColor}60` },
              }}
            />
          </Box>
        </Grid>
      </Grid>

      {rec && (
        <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
          Recommended for this analysis: {rec.rec_threads} threads, {rec.rec_mem_gb} GB RAM.
          Minimum requirements: {rec.min_threads} threads, {rec.min_mem_gb} GB RAM.
        </Typography>
      )}
    </Paper>
  );
}
