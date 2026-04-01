import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface JobLogViewerProps {
  log: string;
  autoScroll?: boolean;
}

export default function JobLogViewer({ log, autoScroll = true }: JobLogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [log, autoScroll]);

  return (
    <Paper
      sx={{
        background: 'rgba(10, 14, 23, 0.95)',
        border: '1px solid rgba(0, 229, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
          bgcolor: 'rgba(0, 229, 255, 0.04)',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Job Output Log
        </Typography>
      </Box>
      <Box
        ref={containerRef}
        sx={{
          p: 2,
          maxHeight: 500,
          overflow: 'auto',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.8rem',
          lineHeight: 1.8,
          color: '#D1D5DB',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: '#0A0E17' },
          '&::-webkit-scrollbar-thumb': {
            background: '#1F2937',
            borderRadius: 3,
          },
        }}
      >
        {log || 'No log output yet.'}
      </Box>
    </Paper>
  );
}
