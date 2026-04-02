import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, Tooltip, CircularProgress, Stack, keyframes,
} from '@mui/material';
import {
  ArrowBack, Print, Download, Article, Refresh,
} from '@mui/icons-material';
import { getReport, getReportStatus, generateReport } from '@/api/reports';
import { fetchJob } from '@/api/jobs';
import type { Job } from '@/types';

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const gentleSpin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

/* ------------------------------------------------------------------ */
/*  Heading type for sidebar navigation                                */
/* ------------------------------------------------------------------ */

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

function parseHeadings(html: string): Heading[] {
  const headings: Heading[] = [];
  const regex = /<h([23])[^>]*(?:id="([^"]*)")?[^>]*>(.*?)<\/h[23]>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10) as 2 | 3;
    const existingId = match[2];
    const text = match[3].replace(/<[^>]*>/g, '').trim();
    const id = existingId || `heading-${index}`;
    headings.push({ id, text, level });
    index++;
  }

  return headings;
}

/** Inject IDs into heading elements that lack them so sidebar links work. */
function injectHeadingIds(html: string): string {
  let index = 0;
  return html.replace(/<h([23])([^>]*)>(.*?)<\/h[23]>/gi, (full, level, attrs, content) => {
    if (/id="/.test(attrs)) {
      index++;
      return full;
    }
    const id = `heading-${index}`;
    index++;
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
  });
}

/* ------------------------------------------------------------------ */
/*  ReportViewerPage                                                   */
/* ------------------------------------------------------------------ */

export default function ReportViewerPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const numericJobId = Number(jobId);

  const [job, setJob] = useState<Job | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  const jobAbortRef = useRef<AbortController | null>(null);

  /* ---- Load job metadata ---- */
  useEffect(() => {
    if (!numericJobId || isNaN(numericJobId)) return;
    jobAbortRef.current = new AbortController();
    const { signal } = jobAbortRef.current;

    fetchJob(numericJobId, signal)
      .then((j) => { if (!signal.aborted) setJob(j); })
      .catch(() => { if (!signal.aborted) setError('Failed to load job details'); });

    return () => { jobAbortRef.current?.abort(); };
  }, [numericJobId]);

  /* ---- Fetch report ---- */
  const loadReport = useCallback(async () => {
    if (!numericJobId) return;
    setLoading(true);
    setError(null);
    try {
      const status = await getReportStatus(numericJobId);
      if (status.generating) {
        setGenerating(true);
        setLoading(false);
        return;
      }
      if (status.available) {
        const html = await getReport(numericJobId);
        setReportHtml(injectHeadingIds(html));
        setGenerating(false);
      } else {
        setReportHtml(null);
        setGenerating(false);
      }
    } catch {
      setReportHtml(null);
    } finally {
      setLoading(false);
    }
  }, [numericJobId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  /* ---- Poll while generating ---- */
  useEffect(() => {
    if (!generating) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const status = await getReportStatus(numericJobId);
        if (!status.generating && status.available) {
          setGenerating(false);
          const html = await getReport(numericJobId);
          setReportHtml(injectHeadingIds(html));
        } else if (!status.generating && !status.available) {
          setGenerating(false);
          setError('Report generation failed.');
        }
      } catch {
        // keep polling
      }
    }, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [generating, numericJobId]);

  /* ---- Generate report ---- */
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await generateReport(numericJobId);
    } catch {
      setGenerating(false);
      setError('Failed to start report generation.');
    }
  };

  /* ---- Print ---- */
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && reportHtml) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  /* ---- Download HTML ---- */
  const handleDownload = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job?.name ?? `job-${jobId}`}-report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ---- Sidebar navigation headings ---- */
  const headings = useMemo(() => {
    if (!reportHtml) return [];
    return parseHeadings(reportHtml);
  }, [reportHtml]);

  const scrollToHeading = (id: string) => {
    const container = reportContainerRef.current;
    if (!container) return;
    const el = container.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeading(id);
    }
  };

  /* ---- Track active heading on scroll ---- */
  useEffect(() => {
    const container = reportContainerRef.current;
    if (!container || headings.length === 0) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let current: string | null = null;
      for (const h of headings) {
        const el = container.querySelector(`#${CSS.escape(h.id)}`);
        if (el && (el as HTMLElement).offsetTop <= scrollTop + 100) {
          current = h.id;
        }
      }
      setActiveHeading(current);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [headings, reportHtml]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const toolbarButtonSx = {
    color: '#8B949E',
    borderRadius: '8px',
    transition: 'all 200ms ease',
    '&:hover': {
      color: '#58A6FF',
      bgcolor: 'rgba(88, 166, 255, 0.08)',
    },
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', animation: `${fadeIn} 300ms ease` }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 1.25,
          background: 'rgba(22, 27, 34, 0.95)',
          borderBottom: '1px solid rgba(88, 166, 255, 0.06)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
        }}
      >
        <Tooltip title="Back to Jobs">
          <IconButton
            onClick={() => navigate('/jobs')}
            sx={{
              color: '#8B949E',
              borderRadius: '8px',
              transition: 'all 200ms ease',
              '&:hover': { color: '#C9D1D9', bgcolor: 'rgba(201, 209, 217, 0.06)' },
            }}
          >
            <ArrowBack sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            bgcolor: 'rgba(88, 166, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Article sx={{ color: '#58A6FF', fontSize: 18 }} />
        </Box>

        <Box sx={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              color: '#C9D1D9',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.95rem',
            }}
          >
            {job?.name ?? `Job #${jobId}`}
          </Typography>
          <Typography variant="caption" sx={{ color: '#484F58', fontSize: '0.72rem' }}>
            Analysis Report
          </Typography>
        </Box>

        {reportHtml && (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Refresh">
              <IconButton onClick={loadReport} sx={toolbarButtonSx}>
                <Refresh sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton onClick={handlePrint} sx={toolbarButtonSx}>
                <Print sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download HTML">
              <IconButton onClick={handleDownload} sx={toolbarButtonSx}>
                <Download sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar navigation */}
        {reportHtml && headings.length > 0 && (
          <Box
            sx={{
              width: 260,
              minWidth: 260,
              background: 'rgba(22, 27, 34, 0.95)',
              borderRight: '1px solid rgba(88, 166, 255, 0.06)',
              overflowY: 'auto',
              py: 2,
              px: 1,
              flexShrink: 0,
              animation: `${fadeIn} 400ms ease`,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(88, 166, 255, 0.12)',
                borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.2)' },
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: '#484F58',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontSize: '0.68rem',
                px: 1,
                mb: 1.5,
                display: 'block',
              }}
            >
              Contents
            </Typography>
            {headings.map((h) => {
              const isActive = activeHeading === h.id;
              return (
                <Box
                  key={h.id}
                  onClick={() => scrollToHeading(h.id)}
                  sx={{
                    px: 1.25,
                    py: 0.6,
                    pl: h.level === 3 ? 3 : 1.25,
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontSize: h.level === 2 ? '0.8rem' : '0.74rem',
                    fontWeight: h.level === 2 ? 600 : 400,
                    color: isActive
                      ? '#58A6FF'
                      : h.level === 2
                        ? '#C9D1D9'
                        : '#8B949E',
                    bgcolor: isActive ? 'rgba(88, 166, 255, 0.08)' : 'transparent',
                    borderLeft: isActive ? '2px solid #58A6FF' : '2px solid transparent',
                    transition: 'all 200ms ease',
                    mb: 0.25,
                    '&:hover': {
                      bgcolor: 'rgba(88, 166, 255, 0.06)',
                      color: '#58A6FF',
                    },
                  }}
                >
                  {h.text}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Report content */}
        <Box
          ref={!reportHtml ? undefined : reportContainerRef}
          sx={{ flex: 1, overflow: 'auto', position: 'relative' }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 2 }}>
              <Box sx={{ animation: `${gentleSpin} 1.2s linear infinite` }}>
                <CircularProgress size={36} thickness={3} sx={{ color: 'rgba(88, 166, 255, 0.5)' }} />
              </Box>
              <Typography variant="body2" sx={{ color: '#484F58' }}>
                Loading report...
              </Typography>
            </Box>
          ) : generating ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2.5,
                animation: `${fadeInUp} 400ms ease`,
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <CircularProgress size={48} thickness={2.5} sx={{ color: 'rgba(88, 166, 255, 0.4)' }} />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <Article sx={{ fontSize: 20, color: '#58A6FF' }} />
                </Box>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" sx={{ color: '#C9D1D9', fontWeight: 500, mb: 0.5 }}>
                  Generating report...
                </Typography>
                <Typography variant="caption" sx={{ color: '#484F58' }}>
                  This may take a moment
                </Typography>
              </Box>
            </Box>
          ) : error ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2,
                animation: `${fadeInUp} 300ms ease`,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: 'rgba(248, 81, 73, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 0.5,
                }}
              >
                <Typography sx={{ fontSize: 24, lineHeight: 1 }}>!</Typography>
              </Box>
              <Typography variant="body1" sx={{ color: '#F85149', fontWeight: 500 }}>{error}</Typography>
              <Button
                variant="outlined"
                onClick={loadReport}
                size="small"
                sx={{
                  borderColor: 'rgba(88, 166, 255, 0.2)',
                  color: '#58A6FF',
                  borderRadius: '8px',
                  px: 3,
                  transition: 'all 200ms ease',
                  '&:hover': {
                    borderColor: 'rgba(88, 166, 255, 0.4)',
                    bgcolor: 'rgba(88, 166, 255, 0.06)',
                  },
                }}
              >
                Retry
              </Button>
            </Box>
          ) : reportHtml ? (
            <Box
              ref={reportContainerRef}
              dangerouslySetInnerHTML={{ __html: reportHtml }}
              sx={{
                p: 4,
                maxWidth: 1100,
                mx: 'auto',
                color: '#C9D1D9',
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1.7,
                animation: `${fadeIn} 400ms ease`,
                '& h1': {
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: '#E6EDF3',
                  borderBottom: '1px solid rgba(88, 166, 255, 0.12)',
                  pb: 1.5,
                  mb: 3,
                  letterSpacing: '-0.01em',
                },
                '& h2': {
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: '#58A6FF',
                  mt: 4,
                  mb: 2,
                  letterSpacing: '-0.005em',
                },
                '& h3': {
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#C9D1D9',
                  mt: 3,
                  mb: 1.5,
                },
                '& p': {
                  mb: 2,
                  color: '#8B949E',
                  fontSize: '0.95rem',
                },
                '& table': {
                  width: '100%',
                  borderCollapse: 'collapse',
                  mb: 3,
                  fontSize: '0.85rem',
                  border: '1px solid rgba(88, 166, 255, 0.06)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                },
                '& th': {
                  background: 'rgba(88, 166, 255, 0.06)',
                  color: '#58A6FF',
                  fontWeight: 600,
                  padding: '10px 16px',
                  textAlign: 'left',
                  borderBottom: '1px solid rgba(88, 166, 255, 0.1)',
                  fontSize: '0.78rem',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                },
                '& td': {
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(88, 166, 255, 0.04)',
                  color: '#8B949E',
                },
                '& tr:hover td': {
                  background: 'rgba(88, 166, 255, 0.03)',
                },
                '& tr:last-child td': {
                  borderBottom: 'none',
                },
                '& img': {
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  my: 2,
                  border: '1px solid rgba(88, 166, 255, 0.06)',
                },
                '& pre': {
                  background: 'rgba(13, 17, 23, 0.8)',
                  borderRadius: '8px',
                  p: 2,
                  overflow: 'auto',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.8rem',
                  border: '1px solid rgba(88, 166, 255, 0.06)',
                  '&::-webkit-scrollbar': { height: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(88, 166, 255, 0.12)', borderRadius: 2 },
                },
                '& code': {
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.85em',
                  background: 'rgba(88, 166, 255, 0.06)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: '#58A6FF',
                },
                '& pre code': {
                  background: 'transparent',
                  padding: 0,
                  color: 'inherit',
                },
                '& a': {
                  color: '#58A6FF',
                  textDecoration: 'none',
                  transition: 'opacity 200ms ease',
                  '&:hover': {
                    opacity: 0.8,
                    textDecoration: 'underline',
                  },
                },
                '& ul, & ol': {
                  pl: 3,
                  mb: 2,
                  color: '#8B949E',
                },
                '& li': {
                  mb: 0.5,
                },
                '& blockquote': {
                  borderLeft: '3px solid rgba(88, 166, 255, 0.2)',
                  pl: 2,
                  ml: 0,
                  color: '#8B949E',
                  fontStyle: 'italic',
                },
                '& hr': {
                  border: 'none',
                  borderTop: '1px solid rgba(88, 166, 255, 0.06)',
                  my: 3,
                },
              }}
            />
          ) : (
            /* No report available - show generate button */
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2.5,
                animation: `${fadeInUp} 400ms ease`,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '20px',
                  bgcolor: 'rgba(88, 166, 255, 0.04)',
                  border: '1px solid rgba(88, 166, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                }}
              >
                <Article sx={{ fontSize: 36, color: '#484F58' }} />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: '#C9D1D9', fontWeight: 600, mb: 0.75 }}>
                  No report available
                </Typography>
                <Typography variant="body2" sx={{ color: '#484F58', maxWidth: 360 }}>
                  Generate an HTML report from the analysis results for this job.
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={handleGenerate}
                sx={{
                  mt: 1,
                  background: 'rgba(88, 166, 255, 0.1)',
                  color: '#58A6FF',
                  border: '1px solid rgba(88, 166, 255, 0.15)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  px: 4,
                  py: 1.25,
                  boxShadow: 'none',
                  transition: 'all 200ms ease',
                  '&:hover': {
                    background: 'rgba(88, 166, 255, 0.15)',
                    borderColor: 'rgba(88, 166, 255, 0.3)',
                    boxShadow: '0 0 20px rgba(88, 166, 255, 0.1)',
                  },
                }}
              >
                Generate Report
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
