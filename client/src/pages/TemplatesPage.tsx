import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as TemplateIcon,
  PlayArrow as UseIcon,
  Delete as DeleteIcon,
  Science as AnalysisIcon,
} from '@mui/icons-material';
import type { Template } from '@/types';
import {
  listTemplates,
  downloadTemplate,
  listAnalysisTemplates,
  deleteAnalysisTemplate,
  type AnalysisTemplate,
} from '@/api/templates';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

// Map analysis type keys to URL-friendly names
const typeToUrl: Record<string, string> = {
  long_rna: 'long-rna',
  small_rna: 'small-rna',
  circ_rna: 'circ-rna',
  sample_group: 'sample-group',
  diff_expr: 'diff-expr',
  pathway: 'pathway',
  full_pipeline: 'full-pipeline',
};

const typeLabels: Record<string, string> = {
  long_rna: 'RNA-seq',
  small_rna: 'Small RNA',
  circ_rna: 'CircRNA',
  diff_expr: 'DEGs Analysis',
  pathway: 'Pathway',
  sample_group: 'Sample Group',
  full_pipeline: 'Full Pipeline',
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [analysisTemplates, setAnalysisTemplates] = useState<AnalysisTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    Promise.all([
      listTemplates(signal).catch(() => []),
      listAnalysisTemplates(signal).catch(() => []),
    ])
      .then(([metaTemplates, savedTemplates]) => {
        if (!signal.aborted) {
          setTemplates(Array.isArray(metaTemplates) ? metaTemplates : []);
          setAnalysisTemplates(Array.isArray(savedTemplates) ? savedTemplates : []);
        }
      })
      .catch(() => {
        if (!signal.aborted) setError('Failed to load templates.');
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleDownload = async (name: string) => {
    setDownloading(name);
    try {
      await downloadTemplate(name);
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteAnalysisTemplate = async (id: string) => {
    if (!window.confirm('Delete this analysis template?')) return;
    try {
      await deleteAnalysisTemplate(id);
      setAnalysisTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleUseTemplate = (tpl: AnalysisTemplate) => {
    const urlType = typeToUrl[tpl.type] || tpl.type.replace(/_/g, '-');
    navigate(`/analysis/${urlType}`);
  };

  if (loading) return <LoadingSkeleton variant="card" rows={6} />;

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Saved Analysis Templates Section */}
      {analysisTemplates.length > 0 && (
        <>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <AnalysisIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h4">Saved Analysis Templates</Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Previously saved analysis configurations. Click &quot;Use&quot; to start a new analysis
            with these settings.
          </Typography>

          <Grid container spacing={3} sx={{ mb: 6 }}>
            {analysisTemplates.map((tpl) => (
              <Grid item xs={12} sm={6} md={4} key={tpl.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#161B22',
                    border: '1px solid rgba(240, 246, 252, 0.1)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'rgba(88, 166, 255, 0.2)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 1.5 }}
                    >
                      <Typography variant="h6" fontWeight={600}>
                        {tpl.name}
                      </Typography>
                      <Tooltip title="Delete template">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAnalysisTemplate(tpl.id)}
                          sx={{
                            color: '#F85149',
                            opacity: 0.5,
                            '&:hover': { opacity: 1 },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    {tpl.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {tpl.description}
                      </Typography>
                    )}
                    <Chip
                      label={typeLabels[tpl.type] || tpl.type.replace(/_/g, ' ')}
                      size="small"
                      variant="outlined"
                      sx={{
                        mt: 2,
                        textTransform: 'capitalize',
                        borderColor: 'rgba(88, 166, 255,0.2)',
                        color: 'text.secondary',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', mt: 1, color: '#484F58' }}
                    >
                      Created {new Date(tpl.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<UseIcon />}
                      onClick={() => handleUseTemplate(tpl)}
                      fullWidth
                      sx={{
                        bgcolor: 'rgba(88, 166, 255, 0.15)',
                        color: '#58A6FF',
                        '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.25)' },
                      }}
                    >
                      Use Template
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ borderColor: '#21262D', mb: 4 }} />
        </>
      )}

      {/* Sample (Metadata) Templates Section */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <TemplateIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h4">Sample Templates</Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Download pre-formatted template files for preparing your analysis input data.
      </Typography>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.name}>
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
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1.5 }}
                >
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
