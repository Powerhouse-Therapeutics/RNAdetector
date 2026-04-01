import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Folder } from '@mui/icons-material';

export default function FileBrowserPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        File Browser
      </Typography>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <Folder sx={{ fontSize: 48, color: 'primary.main' }} />
          <Box>
            <Typography variant="h6">File Browser</Typography>
            <Typography variant="body2" color="text.secondary">
              Browse and manage uploaded files, input data, and analysis outputs.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
