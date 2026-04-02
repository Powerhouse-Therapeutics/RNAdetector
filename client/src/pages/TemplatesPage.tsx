import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as TemplateIcon,
} from '@mui/icons-material';
import type { Template } from '@/types';
import { listTemplates, downloadTemplate } from '@/api/templates';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    listTemplates(signal)
      .then((data) => {
        if (!signal.aborted) setTemplates(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!signal.aborted) setError('Failed to load templates.');
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, []);

  const handleDownload = async (name: string) => {
    setDownloading(name);
    try {
      await downloadTemplate(name);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <LoadingSkeleton variant="card" rows={6} />;

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <TemplateIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h4">Sample Templates</Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Download pre-formatted template files for preparing your analysis input data.
      </Typography>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#161B22',
                border: '1px solid rgba(240, 246, 252, 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'rgba(240, 246, 252, 0.15)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {template.name}
                  </Typography>
                  <Chip
                    label="TSV"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(88, 166, 255,0.1)',
                      color: 'primary.main',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                    }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {template.description}
                </Typography>
                <Chip
                  label={template.type.replace(/_/g, ' ')}
                  size="small"
                  variant="outlined"
                  sx={{
                    mt: 2,
                    textTransform: 'capitalize',
                    borderColor: 'rgba(88, 166, 255,0.2)',
                    color: 'text.secondary',
                  }}
                />
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    downloading === template.name ? (
                      <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                    ) : (
                      <DownloadIcon />
                    )
                  }
                  onClick={() => handleDownload(template.name)}
                  disabled={downloading === template.name}
                  fullWidth
                >
                  {downloading === template.name ? 'Downloading...' : 'Download Template'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {templates.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ py: 8 }}>
              No templates available.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
