import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Typography,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import type { FileEntry, Volume } from '@/types';
import { listVolumes, browseDirectory, searchFiles } from '@/api/files';

const FILE_FILTERS: Record<string, string[]> = {
  All: [],
  FASTQ: ['.fastq', '.fq', '.fastq.gz', '.fq.gz'],
  BAM: ['.bam', '.sam', '.cram'],
  TSV: ['.tsv', '.csv', '.txt'],
};

interface ServerFileBrowserProps {
  onSelect: (files: FileEntry[]) => void;
  multiple: boolean;
  allowedExtensions?: string[];
  initialPath?: string;
}

export default function ServerFileBrowser({
  onSelect,
  multiple,
  allowedExtensions,
  initialPath,
}: ServerFileBrowserProps) {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolume, setSelectedVolume] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileEntry[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listVolumes().then((vols: Volume[]) => {
      setVolumes(vols);
      if (initialPath) {
        // Find the volume that contains this path
        const match = vols.find((v) => initialPath.startsWith(v.path));
        setSelectedVolume(match?.path ?? vols[0]?.path ?? '');
        setCurrentPath(initialPath);
      } else if (vols.length > 0) {
        // Default to last volume (typically the data volume)
        const defaultVol = vols[vols.length - 1];
        setSelectedVolume(defaultVol.path);
        setCurrentPath(defaultVol.path);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const browse = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const result = await browseDirectory(path);
      setEntries(result.data ?? result);
      setCurrentPath(path);
      setSearchQuery('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPath) {
      browse(currentPath);
    }
  }, [currentPath, browse]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      browse(currentPath);
      return;
    }
    setLoading(true);
    try {
      const results = await searchFiles(currentPath, searchQuery);
      setEntries(results);
    } finally {
      setLoading(false);
    }
  };

  const handleVolumeChange = (volumePath: string) => {
    setSelectedVolume(volumePath);
    setCurrentPath(volumePath);
    setSelectedFiles([]);
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleFileToggle = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      handleNavigate(entry.path);
      return;
    }

    if (!multiple) {
      const next = [entry];
      setSelectedFiles(next);
      onSelect(next);
      return;
    }

    const exists = selectedFiles.find((f) => f.path === entry.path);
    const next = exists
      ? selectedFiles.filter((f) => f.path !== entry.path)
      : [...selectedFiles, entry];
    setSelectedFiles(next);
    onSelect(next);
  };

  const handleRemoveFile = (path: string) => {
    const next = selectedFiles.filter((f) => f.path !== path);
    setSelectedFiles(next);
    onSelect(next);
  };

  const pathSegments = currentPath.split('/').filter(Boolean);

  const activeExtensions = allowedExtensions || FILE_FILTERS[filter] || [];

  const filteredEntries = entries.filter((entry) => {
    if (entry.type === 'directory') return true;
    if (activeExtensions.length === 0) return true;
    return activeExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext));
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  return (
    <Paper
      sx={{
        p: 2,
        background: 'rgba(17, 24, 39, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 229, 255, 0.1)',
        minHeight: 400,
      }}
    >
      {/* Controls */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Volume</InputLabel>
          <Select
            value={selectedVolume}
            label="Volume"
            onChange={(e) => handleVolumeChange(e.target.value)}
          >
            {volumes.map((v) => (
              <MenuItem key={v.id} value={v.path}>
                {v.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!allowedExtensions && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select value={filter} label="Filter" onChange={(e) => setFilter(e.target.value)}>
              {Object.keys(FILE_FILTERS).map((key) => (
                <MenuItem key={key} value={key}>
                  {key}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          size="small"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    browse(currentPath);
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Stack>

      {/* Breadcrumbs */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton
          size="small"
          onClick={() => {
            const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
            if (parent.length >= selectedVolume.length) handleNavigate(parent);
          }}
          disabled={currentPath === selectedVolume}
          sx={{ color: 'primary.main' }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Breadcrumbs sx={{ '& .MuiBreadcrumbs-separator': { color: 'text.secondary' } }}>
          {pathSegments.map((segment, idx) => {
            const segPath = '/' + pathSegments.slice(0, idx + 1).join('/');
            const isLast = idx === pathSegments.length - 1;
            return isLast ? (
              <Typography key={segPath} variant="body2" color="primary.main" fontWeight={600}>
                {segment}
              </Typography>
            ) : (
              <Link
                key={segPath}
                component="button"
                variant="body2"
                underline="hover"
                color="text.secondary"
                onClick={() => handleNavigate(segPath)}
              >
                {segment}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Stack>

      {/* File listing */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} sx={{ color: 'primary.main' }} />
        </Box>
      ) : (
        <List
          dense
          sx={{
            maxHeight: 360,
            overflow: 'auto',
            border: '1px solid rgba(0, 229, 255, 0.06)',
            borderRadius: 2,
          }}
        >
          {filteredEntries.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No files found"
                sx={{ textAlign: 'center', color: 'text.secondary' }}
              />
            </ListItem>
          )}
          {filteredEntries.map((entry) => {
            const isSelected = selectedFiles.some((f) => f.path === entry.path);
            return (
              <ListItemButton
                key={entry.path}
                onClick={() => handleFileToggle(entry)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.06)' },
                  ...(isSelected && { bgcolor: 'rgba(0, 229, 255, 0.1)' }),
                }}
              >
                {entry.type === 'file' && multiple && (
                  <Checkbox
                    edge="start"
                    checked={isSelected}
                    size="small"
                    sx={{
                      color: 'rgba(0, 229, 255, 0.4)',
                      '&.Mui-checked': { color: '#00E5FF' },
                    }}
                  />
                )}
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {entry.type === 'directory' ? (
                    <FolderIcon sx={{ color: '#FBBF24' }} />
                  ) : (
                    <FileIcon sx={{ color: 'text.secondary' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={entry.name}
                  secondary={entry.type === 'file' ? formatSize(entry.size) : null}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            );
          })}
        </List>
      )}

      {/* Selected files chips */}
      {selectedFiles.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
          {selectedFiles.map((f) => (
            <Chip
              key={f.path}
              label={f.name}
              size="small"
              onDelete={() => handleRemoveFile(f.path)}
              sx={{
                bgcolor: 'rgba(0, 229, 255, 0.1)',
                color: 'primary.main',
                borderColor: 'rgba(0, 229, 255, 0.3)',
                '& .MuiChip-deleteIcon': { color: 'rgba(0, 229, 255, 0.5)' },
              }}
              variant="outlined"
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
}
