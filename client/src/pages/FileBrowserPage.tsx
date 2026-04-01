import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Folder as FolderIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import type { FileEntry } from '@/types';
import ServerFileBrowser from '@/components/files/ServerFileBrowser';

const formatBytes = (bytes: number) => {
  if (!bytes) return '--';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

const getExtension = (name: string) => {
  const parts = name.split('.');
  return parts.length > 1 ? `.${parts.slice(1).join('.')}` : 'N/A';
};

export default function FileBrowserPage() {
  const [selectedFiles, setSelectedFiles] = useState<FileEntry[]>([]);
  const [detailFile, setDetailFile] = useState<FileEntry | null>(null);

  const handleSelect = (files: FileEntry[]) => {
    setSelectedFiles(files);
    if (files.length > 0) {
      setDetailFile(files[files.length - 1]);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <StorageIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h4">File Browser</Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={detailFile ? 8 : 12}>
          <ServerFileBrowser onSelect={handleSelect} multiple />
        </Grid>

        {detailFile && (
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                background: 'rgba(17, 24, 39, 0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(0, 229, 255, 0.1)',
                position: 'sticky',
                top: 24,
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  {detailFile.type === 'directory' ? (
                    <FolderIcon sx={{ color: '#FBBF24', fontSize: 32 }} />
                  ) : (
                    <FileIcon sx={{ color: 'primary.main', fontSize: 32 }} />
                  )}
                  <Typography variant="h6" sx={{ wordBreak: 'break-all' }}>
                    {detailFile.name}
                  </Typography>
                </Stack>

                <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.08)' }} />

                <DetailRow label="Path" value={detailFile.path} />
                <DetailRow label="Type" value={detailFile.type === 'directory' ? 'Directory' : 'File'} />
                {detailFile.type === 'file' && (
                  <>
                    <DetailRow label="Size" value={formatBytes(detailFile.size)} />
                    <DetailRow label="Extension" value={getExtension(detailFile.name)} />
                  </>
                )}
                <DetailRow
                  label="Modified"
                  value={new Date(detailFile.modified_at).toLocaleString()}
                />

                {detailFile.type === 'file' && (
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={getExtension(detailFile.name).toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(0, 229, 255, 0.1)',
                        color: 'primary.main',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                )}

                {selectedFiles.length > 1 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                    {selectedFiles.length} files selected
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Box>
  );
}
