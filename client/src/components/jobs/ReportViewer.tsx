import { useState, useRef } from 'react';
import {
  Box, Paper, IconButton, Toolbar, Typography, Tooltip, Stack
} from '@mui/material';
import {
  Fullscreen, FullscreenExit, Download, OpenInNew, Code, CodeOff
} from '@mui/icons-material';

interface ReportViewerProps {
  reportUrl: string;
  title?: string;
  downloadUrl?: string;
}

export default function ReportViewer({ reportUrl, title = 'Analysis Report', downloadUrl }: ReportViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [codeVisible, setCodeVisible] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const toggleCode = () => {
    // Toggle code visibility via postMessage to iframe
    const newState = !codeVisible;
    setCodeVisible(newState);
    try {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (iframeDoc) {
        const codeBlocks = iframeDoc.querySelectorAll('pre.r, pre.python, .sourceCode');
        codeBlocks.forEach((block: Element) => {
          (block as HTMLElement).style.display = newState ? 'block' : 'none';
        });
      }
    } catch (e) {
      // Cross-origin restriction - cannot modify iframe content
    }
  };

  const handleDownload = () => {
    const url = downloadUrl || reportUrl;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.html`;
    a.click();
  };

  const openInNewTab = () => {
    window.open(reportUrl, '_blank');
  };

  return (
    <Paper
      sx={{
        height: isFullscreen ? '100vh' : '80vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(17, 24, 39, 0.8)',
        border: '1px solid rgba(0, 229, 255, 0.1)',
        overflow: 'hidden',
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          minHeight: 48,
          bgcolor: 'rgba(10, 14, 23, 0.9)',
          borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
        }}
      >
        <Typography variant="subtitle2" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {title}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={codeVisible ? 'Hide code blocks' : 'Show code blocks'}>
            <IconButton size="small" onClick={toggleCode} sx={{ color: 'text.secondary' }}>
              {codeVisible ? <CodeOff fontSize="small" /> : <Code fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Download report">
            <IconButton size="small" onClick={handleDownload} sx={{ color: 'text.secondary' }}>
              <Download fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open in new tab">
            <IconButton size="small" onClick={openInNewTab} sx={{ color: 'text.secondary' }}>
              <OpenInNew fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton size="small" onClick={toggleFullscreen} sx={{ color: 'text.secondary' }}>
              {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          src={reportUrl}
          title={title}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#1a1a2e',
          }}
        />
      </Box>
    </Paper>
  );
}
