import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { AdminPanelSettings } from '@mui/icons-material';

export default function ServerAdminPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Server Administration
      </Typography>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <AdminPanelSettings sx={{ fontSize: 48, color: 'primary.main' }} />
          <Box>
            <Typography variant="h6">Admin Panel</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage server configuration, users, Docker containers, and system resources.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
