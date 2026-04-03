import { useEffect, useState } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import client from '@/api/client';

interface PlotViewerProps {
  src: string;
  title: string;
  height?: number;
}

/**
 * Loads an interactive HTML plot from an authenticated API endpoint
 * and renders it in an iframe via srcdoc (to pass JWT auth).
 */
export default function PlotViewer({ src, title, height = 500 }: PlotViewerProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHtml(null);

    // Fetch the plot HTML via the authenticated client
    client
      .get(src, { responseType: 'text', headers: { Accept: 'text/html' } })
      .then((res) => {
        if (!cancelled) {
          setHtml(typeof res.data === 'string' ? res.data : String(res.data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Plot not available');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  // Don't render anything if the plot failed to load (not generated yet is normal)
  if (!loading && error) {
    return null;
  }

  return (
    <Box
      sx={{
        background: '#161B22',
        borderRadius: '12px',
        border: '1px solid rgba(240, 246, 252, 0.1)',
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(88, 166, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: '#8B949E',
            fontWeight: 600,
            fontSize: '0.78rem',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Typography>
        {html && (
          <Typography
            component="a"
            href={`data:text/html;charset=utf-8,${encodeURIComponent(html)}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{
              color: '#58A6FF',
              textDecoration: 'none',
              fontSize: '0.72rem',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Open in new tab
          </Typography>
        )}
      </Box>

      {loading ? (
        <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 0 }} />
      ) : html ? (
        <Box
          component="iframe"
          srcDoc={html}
          title={title}
          sandbox="allow-scripts allow-same-origin"
          sx={{
            width: '100%',
            height,
            border: 'none',
            display: 'block',
            bgcolor: '#0D1117',
          }}
        />
      ) : null}
    </Box>
  );
}
