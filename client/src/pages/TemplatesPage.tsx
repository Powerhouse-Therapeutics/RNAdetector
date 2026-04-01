import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { ViewModule } from '@mui/icons-material';

export default function TemplatesPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Templates
      </Typography>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <ViewModule sx={{ fontSize: 48, color: 'primary.main' }} />
          <Box>
            <Typography variant="h6">Analysis Templates</Typography>
            <Typography variant="body2" color="text.secondary">
              Save and reuse analysis configurations as templates for reproducible workflows.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
