import { useState, useEffect, useCallback, useRef } from 'react';
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
  Description as TsvIcon,
  DataObject as FastqIcon,
  ViewInAr as BamIcon,
} from '@mui/icons-material';
import type { FileEntry, Volume } from '@/types';
import { listVolumes, browseDirectory, searchFiles } from '@/api/files';

const FILE_FILTERS: Record<string, string[]> = {
  All: [],
  FASTQ: ['.fastq', '.fq', '.fastq.gz', '.fq.gz'],
  BAM: ['.bam', '.sam', '.cram'],
  TSV: ['.tsv', '.csv', '.txt'],
};

const getFileIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.fastq') || lower.endsWith('.fq') || lower.endsWith('.fastq.gz') || lower.endsWith('.fq.gz')) {
    return <FastqIcon sx={{ color: '#58A6FF', fontSize: 20 }} />;
  }
  if (lower.endsWith('.bam') || lower.endsWith('.sam') || lower.endsWith('.cram')) {
    return <BamIcon sx={{ color: '#BC8CFF', fontSize: 20 }} />;
  }
  if (lower.endsWith('.tsv') || lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return <TsvIcon sx={{ color: '#3FB950', fontSize: 20 }} />;
  }
  if (lower.endsWith('.gz') || lower.endsWith('.zip') || lower.endsWith('.tar')) {
    return <FileIcon sx={{ color: '#D29922', fontSize: 20 }} />;
  }
  return <FileIcon sx={{ color: '#484F58', fontSize: 20 }} />;
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

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    listVolumes(signal)
      .then((vols: Volume[]) => {
        if (signal.aborted) return;
        const safeVols = Array.isArray(vols) ? vols : [];
        setVolumes(safeVols);
        if (initialPath) {
          const match = safeVols.find((v) => initialPath.startsWith(v.path));
          setSelectedVolume(match?.path ?? safeVols[0]?.path ?? '');
          setCurrentPath(initialPath);
        } else if (safeVols.length > 0) {
          const defaultVol = safeVols[safeVols.length - 1];
          setSelectedVolume(defaultVol.path);
          setCurrentPath(defaultVol.path);
        }
      })
      .catch(() => {
        if (!signal.aborted) setEntries([]);
      });

    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const browse = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const result = await browseDirectory(path);
      const data = result?.data ?? result;
      setEntries(Array.isArray(data) ? data : []);
      setCurrentPath(path);
      setSearchQuery('');
    } catch {
      setEntries([]);
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
      setEntries(Array.isArray(results) ? results : []);
    } catch {
      setEntries([]);
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
        p: 2.5,
        background: '#0D1117',
        border: '1px solid #21262D',
        borderRadius: '12px',
        minHeight: 400,
      }}
    >
      {/* Controls */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={{ color: '#8B949E' }}>Volume</InputLabel>
          <Select
            value={selectedVolume}
            label="Volume"
            onChange={(e) => handleVolumeChange(e.target.value)}
            sx={{
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#30363D',
                transition: 'border-color 200ms ease',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#58A6FF',
              },
            }}
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
            <InputLabel sx={{ color: '#8B949E' }}>Filter</InputLabel>
            <Select
              value={filter}
              label="Filter"
              onChange={(e) => setFilter(e.target.value)}
              sx={{
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#30363D',
                  transition: 'border-color 200ms ease',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#58A6FF',
                },
              }}
            >
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
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#30363D',
                transition: 'border-color 200ms ease',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#58A6FF',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: '#484F58' }} />
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
                  sx={{ color: '#8B949E' }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Stack>

      {/* Breadcrumbs */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          mb: 2,
          py: 1,
          px: 1.5,
          background: '#161B22',
          borderRadius: '8px',
          border: '1px solid #21262D',
          overflow: 'auto',
        }}
      >
        <IconButton
          size="small"
          onClick={() => {
            const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
            if (parent.length >= selectedVolume.length) handleNavigate(parent);
          }}
          disabled={currentPath === selectedVolume}
          sx={{
            color: '#58A6FF',
            transition: 'all 200ms ease',
            '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.1)' },
            '&.Mui-disabled': { color: '#30363D' },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Breadcrumbs
          sx={{
            '& .MuiBreadcrumbs-separator': { color: '#30363D' },
            '& .MuiBreadcrumbs-li': { whiteSpace: 'nowrap' },
          }}
        >
          {pathSegments.map((segment, idx) => {
            const segPath = '/' + pathSegments.slice(0, idx + 1).join('/');
            const isLast = idx === pathSegments.length - 1;
            return isLast ? (
              <Typography
                key={segPath}
                variant="body2"
                sx={{
                  color: '#C9D1D9',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                }}
              >
                {segment}
              </Typography>
            ) : (
              <Link
                key={segPath}
                component="button"
                variant="body2"
                underline="hover"
                sx={{
                  color: '#8B949E',
                  fontSize: '0.82rem',
                  transition: 'color 200ms ease',
                  '&:hover': { color: '#58A6FF' },
                }}
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
          <CircularProgress size={28} sx={{ color: '#58A6FF' }} />
        </Box>
      ) : (
        <List
          dense
          sx={{
            maxHeight: 360,
            overflow: 'auto',
            borderRadius: '8px',
            border: '1px solid #21262D',
            bgcolor: '#161B22',
            '&::-webkit-scrollbar': {
              width: 6,
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#30363D',
              borderRadius: 3,
            },
          }}
        >
          {filteredEntries.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No files found"
                sx={{ textAlign: 'center', color: '#484F58', py: 4 }}
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
                  borderRadius: '6px',
                  mx: 0.5,
                  mb: 0.25,
                  py: 0.75,
                  transition: 'all 200ms ease',
                  '&:hover': {
                    bgcolor: 'rgba(88, 166, 255, 0.06)',
                  },
                  ...(isSelected && {
                    bgcolor: 'rgba(88, 166, 255, 0.1)',
                    border: '1px solid rgba(88, 166, 255, 0.2)',
                  }),
                  ...(!isSelected && {
                    border: '1px solid transparent',
                  }),
                }}
              >
                {entry.type === 'file' && multiple && (
                  <Checkbox
                    edge="start"
                    checked={isSelected}
                    size="small"
                    sx={{
                      color: '#30363D',
                      transition: 'color 200ms ease',
                      '&.Mui-checked': { color: '#58A6FF' },
                    }}
                  />
                )}
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {entry.type === 'directory' ? (
                    <FolderIcon sx={{ color: '#D29922', fontSize: 20 }} />
                  ) : (
                    getFileIcon(entry.name)
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={entry.name}
                  secondary={entry.type === 'file' ? formatSize(entry.size) : null}
                  primaryTypographyProps={{
                    variant: 'body2',
                    sx: {
                      color: entry.type === 'directory' ? '#C9D1D9' : '#8B949E',
                      fontWeight: entry.type === 'directory' ? 500 : 400,
                      fontSize: '0.85rem',
                    },
                  }}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    sx: { color: '#484F58', fontSize: '0.72rem' },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      )}

      {/* Selected files chips */}
      {selectedFiles.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
          {selectedFiles.map((f) => (
            <Chip
              key={f.path}
              label={f.name}
              size="small"
              onDelete={() => handleRemoveFile(f.path)}
              sx={{
                bgcolor: 'rgba(88, 166, 255, 0.1)',
                color: '#58A6FF',
                borderRadius: '6px',
                border: '1px solid rgba(88, 166, 255, 0.2)',
                fontWeight: 500,
                fontSize: '0.78rem',
                transition: 'all 200ms ease',
                '& .MuiChip-deleteIcon': {
                  color: 'rgba(88, 166, 255, 0.5)',
                  transition: 'color 200ms ease',
                  '&:hover': { color: '#58A6FF' },
                },
              }}
              variant="outlined"
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
}
