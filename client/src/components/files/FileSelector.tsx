import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Stack,
} from '@mui/material';
import {
  FolderOpen as FolderOpenIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import type { FileEntry } from '@/types';
import ServerFileBrowser from './ServerFileBrowser';

interface FileSelectorProps {
  value: FileEntry[];
  onChange: (files: FileEntry[]) => void;
  multiple: boolean;
  filters?: string[];
  initialPath?: string;
}

export default function FileSelector({ value = [], onChange, multiple = false, filters, initialPath }: FileSelectorProps) {
  const safeValue = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<FileEntry[]>(safeValue);

  const handleOpen = () => {
    setPendingSelection(safeValue);
    setOpen(true);
  };

  const handleConfirm = () => {
    onChange(pendingSelection);
    setOpen(false);
  };

  const handleRemove = (path: string) => {
    onChange(safeValue.filter((f) => f.path !== path));
  };

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<FolderOpenIcon />}
        onClick={handleOpen}
        sx={{
          mb: 2,
          borderRadius: '8px',
          borderColor: '#30363D',
          color: '#C9D1D9',
          fontWeight: 500,
          px: 2.5,
          py: 1,
          transition: 'all 200ms ease',
          '&:hover': {
            borderColor: '#58A6FF',
            bgcolor: 'rgba(88, 166, 255, 0.06)',
            color: '#58A6FF',
          },
        }}
      >
        {multiple ? 'Select Files' : 'Select File'}
      </Button>

      {safeValue.length > 0 && (
        <List
          dense
          sx={{
            bgcolor: '#161B22',
            borderRadius: '8px',
            border: '1px solid #21262D',
            overflow: 'hidden',
          }}
        >
          {safeValue.map((file, idx) => (
            <ListItem
              key={file.path}
              sx={{
                py: 1,
                px: 2,
                transition: 'background 200ms ease',
                '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.04)' },
                ...(idx < safeValue.length - 1 && {
                  borderBottom: '1px solid #21262D',
                }),
              }}
            >
              <FileIcon sx={{ mr: 1.5, color: '#484F58', fontSize: 18 }} />
              <ListItemText
                primary={file.name}
                secondary={file.path}
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: { color: '#C9D1D9', fontWeight: 500, fontSize: '0.85rem' },
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: { color: '#484F58', fontSize: '0.72rem', fontFamily: 'monospace' },
                }}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleRemove(file.path)}
                  sx={{
                    color: '#484F58',
                    transition: 'all 200ms ease',
                    '&:hover': {
                      color: '#F85149',
                      bgcolor: 'rgba(248, 81, 73, 0.1)',
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {safeValue.length === 0 && (
        <Box
          sx={{
            py: 3,
            px: 2,
            textAlign: 'center',
            borderRadius: '8px',
            border: '1px dashed #30363D',
            bgcolor: '#0D1117',
          }}
        >
          <Typography variant="body2" sx={{ color: '#484F58' }}>
            No files selected. Click the button above to browse.
          </Typography>
        </Box>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0D1117',
            backgroundImage: 'none',
            border: '1px solid #21262D',
            borderRadius: '12px',
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: '1px solid #21262D',
            pb: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'rgba(88, 166, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderOpenIcon sx={{ color: '#58A6FF', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" sx={{ color: '#C9D1D9', fontWeight: 600 }}>
              Browse Server Files
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <ServerFileBrowser
            onSelect={setPendingSelection}
            multiple={multiple}
            allowedExtensions={filters}
            initialPath={initialPath}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #21262D', px: 3, py: 2 }}>
          <Button
            onClick={() => setOpen(false)}
            sx={{
              color: '#8B949E',
              borderRadius: '8px',
              px: 2,
              transition: 'all 200ms ease',
              '&:hover': { bgcolor: '#21262D', color: '#C9D1D9' },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              borderRadius: '8px',
              px: 2.5,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #58A6FF, #388BFD)',
              boxShadow: '0 2px 8px rgba(88, 166, 255, 0.3)',
              transition: 'all 200ms ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #79B8FF, #58A6FF)',
                boxShadow: '0 4px 12px rgba(88, 166, 255, 0.4)',
              },
            }}
          >
            Confirm Selection ({pendingSelection.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
