import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, Tooltip, CircularProgress, Stack,
} from '@mui/material';
import {
  ArrowBack, Print, Download, Article, Refresh,
} from '@mui/icons-material';
import { getReport, getReportStatus, generateReport } from '@/api/reports';
import { fetchJob } from '@/api/jobs';
import type { Job } from '@/types';

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

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  /* ---- Load job metadata ---- */
  useEffect(() => {
    if (!numericJobId) return;
    fetchJob(numericJobId)
      .then(setJob)
      .catch(() => setError('Failed to load job details'));
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
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 1.5,
          background: 'rgba(17, 24, 39, 0.6)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}
      >
        <Tooltip title="Back to Jobs">
          <IconButton onClick={() => navigate('/jobs')} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <ArrowBack />
          </IconButton>
        </Tooltip>

        <Article sx={{ color: 'rgba(0, 229, 255, 0.8)', fontSize: 22 }} />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {job?.name ?? `Job #${jobId}`}
          <Typography
            component="span"
            sx={{ ml: 1.5, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 400 }}
          >
            Report
          </Typography>
        </Typography>

        {reportHtml && (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={loadReport} sx={{ color: 'rgba(0, 229, 255, 0.7)' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton onClick={handlePrint} sx={{ color: 'rgba(0, 229, 255, 0.7)' }}>
                <Print />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download HTML">
              <IconButton onClick={handleDownload} sx={{ color: 'rgba(0, 229, 255, 0.7)' }}>
                <Download />
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
              background: 'rgba(17, 24, 39, 0.6)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              overflowY: 'auto',
              py: 2,
              px: 1,
              flexShrink: 0,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,229,255,0.2)', borderRadius: 2 },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(0, 229, 255, 0.6)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                px: 1,
                mb: 1,
                display: 'block',
              }}
            >
              Contents
            </Typography>
            {headings.map((h) => (
              <Box
                key={h.id}
                onClick={() => scrollToHeading(h.id)}
                sx={{
                  px: 1,
                  py: 0.6,
                  pl: h.level === 3 ? 3 : 1,
                  cursor: 'pointer',
                  borderRadius: 1,
                  fontSize: h.level === 2 ? '0.82rem' : '0.76rem',
                  fontWeight: h.level === 2 ? 600 : 400,
                  color: h.level === 2 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.15s',
                  '&:hover': {
                    background: 'rgba(0, 229, 255, 0.08)',
                    color: 'rgba(0, 229, 255, 1)',
                  },
                }}
              >
                {h.text}
              </Box>
            ))}
          </Box>
        )}

        {/* Report content */}
        <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress sx={{ color: 'rgba(0, 229, 255, 0.6)' }} />
            </Box>
          ) : generating ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
              <CircularProgress sx={{ color: 'rgba(0, 229, 255, 0.6)' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Generating report...
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
                Polling for status every 3 seconds
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
              <Typography sx={{ color: '#EF4444' }}>{error}</Typography>
              <Button
                variant="outlined"
                onClick={loadReport}
                sx={{ borderColor: 'rgba(0, 229, 255, 0.4)', color: 'rgba(0, 229, 255, 0.8)' }}
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
                color: 'rgba(255,255,255,0.9)',
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1.7,
                '& h1': {
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: '#fff',
                  borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
                  pb: 1,
                  mb: 3,
                },
                '& h2': {
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  color: 'rgba(0, 229, 255, 0.9)',
                  mt: 4,
                  mb: 2,
                },
                '& h3': {
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  mt: 3,
                  mb: 1.5,
                },
                '& p': {
                  mb: 2,
                  color: 'rgba(255,255,255,0.75)',
                },
                '& table': {
                  width: '100%',
                  borderCollapse: 'collapse',
                  mb: 3,
                  fontSize: '0.85rem',
                },
                '& th': {
                  background: 'rgba(0, 229, 255, 0.08)',
                  color: 'rgba(0, 229, 255, 0.9)',
                  fontWeight: 600,
                  padding: '10px 14px',
                  textAlign: 'left',
                  borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
                },
                '& td': {
                  padding: '8px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                },
                '& tr:hover td': {
                  background: 'rgba(0, 229, 255, 0.04)',
                },
                '& img': {
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 1,
                  my: 2,
                },
                '& pre': {
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: 1,
                  p: 2,
                  overflow: 'auto',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.8rem',
                  border: '1px solid rgba(255,255,255,0.06)',
                },
                '& code': {
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.85em',
                  background: 'rgba(0, 229, 255, 0.06)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                },
                '& a': {
                  color: 'rgba(0, 229, 255, 0.8)',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                },
                '& ul, & ol': {
                  pl: 3,
                  mb: 2,
                  color: 'rgba(255,255,255,0.7)',
                },
                '& blockquote': {
                  borderLeft: '3px solid rgba(0, 229, 255, 0.3)',
                  pl: 2,
                  ml: 0,
                  color: 'rgba(255,255,255,0.6)',
                  fontStyle: 'italic',
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
                gap: 3,
              }}
            >
              <Article sx={{ fontSize: 64, color: 'rgba(255,255,255,0.15)' }} />
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                No report available for this job
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)', mb: 1 }}>
                Generate an HTML report from the analysis results
              </Typography>
              <Button
                variant="contained"
                onClick={handleGenerate}
                sx={{
                  background: 'rgba(0, 229, 255, 0.15)',
                  color: 'rgba(0, 229, 255, 1)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  fontWeight: 600,
                  px: 4,
                  py: 1.2,
                  '&:hover': {
                    background: 'rgba(0, 229, 255, 0.25)',
                    border: '1px solid rgba(0, 229, 255, 0.5)',
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
