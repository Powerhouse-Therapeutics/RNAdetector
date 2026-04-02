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
  if (value <= recommended) return '#3FB950';
  if (value <= max) return '#D29922';
  return '#F85149';
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

  const threadColor = rec ? getSliderColor(threads, rec.rec_threads, maxCores) : '#58A6FF';
  const memColor = rec ? getSliderColor(memoryGB, rec.rec_mem_gb, maxMem) : '#58A6FF';

  const exceedsServer = threads > maxCores || memoryGB > maxMem;

  return (
    <Paper
      sx={{
        p: 3,
        background: '#161B22',
        border: '1px solid #21262D',
        borderRadius: '12px',
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          mb: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontWeight: 600,
          color: '#C9D1D9',
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            background: 'rgba(88, 166, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CpuIcon sx={{ color: '#58A6FF', fontSize: 18 }} />
        </Box>
        Resource Configuration
      </Typography>

      {serverResources && (
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <Chip
            size="small"
            label={`${serverResources.totalCores} cores`}
            sx={{
              bgcolor: 'rgba(88, 166, 255, 0.1)',
              color: '#58A6FF',
              border: '1px solid rgba(88, 166, 255, 0.15)',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
          <Chip
            size="small"
            label={`${serverResources.totalMemoryGB} GB RAM`}
            sx={{
              bgcolor: 'rgba(88, 166, 255, 0.1)',
              color: '#58A6FF',
              border: '1px solid rgba(88, 166, 255, 0.15)',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
          <Chip
            size="small"
            label={`${serverResources.availableMemoryGB} GB available`}
            sx={{
              bgcolor: 'rgba(63, 185, 80, 0.1)',
              color: '#3FB950',
              border: '1px solid rgba(63, 185, 80, 0.15)',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
        </Stack>
      )}

      {exceedsServer && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: '8px',
            bgcolor: 'rgba(248, 81, 73, 0.1)',
            border: '1px solid rgba(248, 81, 73, 0.2)',
          }}
        >
          Selected resources exceed server capacity. Reduce threads or memory.
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box>
            <Typography
              variant="body2"
              sx={{
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: '#C9D1D9',
                fontWeight: 500,
              }}
            >
              <CpuIcon fontSize="small" sx={{ color: '#8B949E' }} />
              CPU Threads:
              <Box
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: '6px',
                  bgcolor: `${threadColor}18`,
                  color: threadColor,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {threads}
              </Box>
              {rec && (
                <Tooltip title={`Recommended: ${rec.rec_threads}, Minimum: ${rec.min_threads}`}>
                  <InfoIcon fontSize="small" sx={{ color: '#484F58', cursor: 'help' }} />
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
                height: 6,
                '& .MuiSlider-track': {
                  border: 'none',
                  borderRadius: 3,
                },
                '& .MuiSlider-rail': {
                  bgcolor: '#21262D',
                  opacity: 1,
                },
                '& .MuiSlider-thumb': {
                  width: 18,
                  height: 18,
                  bgcolor: '#fff',
                  border: `2px solid ${threadColor}`,
                  boxShadow: `0 2px 6px ${threadColor}40`,
                  transition: 'box-shadow 200ms ease',
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: `0 2px 12px ${threadColor}60`,
                  },
                },
                '& .MuiSlider-markLabel': {
                  color: '#484F58',
                  fontSize: '0.7rem',
                },
              }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box>
            <Typography
              variant="body2"
              sx={{
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: '#C9D1D9',
                fontWeight: 500,
              }}
            >
              <MemoryIcon fontSize="small" sx={{ color: '#8B949E' }} />
              Memory (GB):
              <Box
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: '6px',
                  bgcolor: `${memColor}18`,
                  color: memColor,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {memoryGB}
              </Box>
              {rec && (
                <Tooltip title={`Recommended: ${rec.rec_mem_gb} GB, Minimum: ${rec.min_mem_gb} GB`}>
                  <InfoIcon fontSize="small" sx={{ color: '#484F58', cursor: 'help' }} />
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
                height: 6,
                '& .MuiSlider-track': {
                  border: 'none',
                  borderRadius: 3,
                },
                '& .MuiSlider-rail': {
                  bgcolor: '#21262D',
                  opacity: 1,
                },
                '& .MuiSlider-thumb': {
                  width: 18,
                  height: 18,
                  bgcolor: '#fff',
                  border: `2px solid ${memColor}`,
                  boxShadow: `0 2px 6px ${memColor}40`,
                  transition: 'box-shadow 200ms ease',
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: `0 2px 12px ${memColor}60`,
                  },
                },
                '& .MuiSlider-markLabel': {
                  color: '#484F58',
                  fontSize: '0.7rem',
                },
              }}
            />
          </Box>
        </Grid>
      </Grid>

      {rec && (
        <Typography
          variant="caption"
          sx={{
            mt: 2.5,
            display: 'block',
            color: '#484F58',
            fontSize: '0.75rem',
            lineHeight: 1.5,
          }}
        >
          Recommended for this analysis: {rec.rec_threads} threads, {rec.rec_mem_gb} GB RAM.
          Minimum requirements: {rec.min_threads} threads, {rec.min_mem_gb} GB RAM.
        </Typography>
      )}
    </Paper>
  );
}
