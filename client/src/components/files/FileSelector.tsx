import React, { useState } from 'react';
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
}

export default function FileSelector({ value, onChange, multiple, filters }: FileSelectorProps) {
  const [open, setOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<FileEntry[]>(value);

  const handleOpen = () => {
    setPendingSelection(value);
    setOpen(true);
  };

  const handleConfirm = () => {
    onChange(pendingSelection);
    setOpen(false);
  };

  const handleRemove = (path: string) => {
    onChange(value.filter((f) => f.path !== path));
  };

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<FolderOpenIcon />}
        onClick={handleOpen}
        sx={{ mb: 2 }}
      >
        {multiple ? 'Select Files' : 'Select File'}
      </Button>

      {value.length > 0 && (
        <List dense sx={{ bgcolor: 'rgba(17, 24, 39, 0.5)', borderRadius: 2 }}>
          {value.map((file) => (
            <ListItem key={file.path}>
              <FileIcon sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }} />
              <ListItemText
                primary={file.name}
                secondary={file.path}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleRemove(file.path)}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {value.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No files selected.
        </Typography>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#111827',
            backgroundImage: 'none',
            border: '1px solid rgba(0, 229, 255, 0.15)',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(0, 229, 255, 0.08)' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <FolderOpenIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6">Browse Server Files</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <ServerFileBrowser
            onSelect={setPendingSelection}
            multiple={multiple}
            allowedExtensions={filters}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(0, 229, 255, 0.08)', px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirm}>
            Confirm Selection ({pendingSelection.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
