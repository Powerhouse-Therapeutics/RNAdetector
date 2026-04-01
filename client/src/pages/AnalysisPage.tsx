import React from 'react';
import { Box, Typography, Card, CardContent, Button, Stack } from '@mui/material';
import { PlayArrow, Science } from '@mui/icons-material';
import type { JobType } from '@/types';

const typeInfo: Record<JobType, { title: string; description: string }> = {
  long_rna: {
    title: 'RNA-seq Analysis',
    description: 'Perform long RNA sequencing analysis including alignment, quantification, and quality control.',
  },
  small_rna: {
    title: 'Small RNA Analysis',
    description: 'Analyze small RNA (miRNA, piRNA, siRNA) with specialized mapping and quantification pipelines.',
  },
  circ_rna: {
    title: 'Circular RNA Analysis',
    description: 'Detect and quantify circular RNA molecules using back-splice junction identification.',
  },
  sample_group: {
    title: 'Sample Groups',
    description: 'Create and manage sample groups for downstream differential expression or pathway analysis.',
  },
  diff_expr: {
    title: 'Differential Expression Analysis',
    description: 'Identify differentially expressed genes between sample groups using DESeq2 or edgeR.',
  },
  pathway: {
    title: 'Pathway Analysis',
    description: 'Perform gene set enrichment and pathway analysis on differential expression results.',
  },
};

interface AnalysisPageProps {
  type: JobType;
}

export default function AnalysisPage({ type }: AnalysisPageProps) {
  const info = typeInfo[type];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        {info.title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {info.description}
      </Typography>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Science sx={{ color: 'primary.main', fontSize: 40 }} />
              <Box>
                <Typography variant="h6">New {info.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure parameters and submit a new analysis job.
                </Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Analysis configuration wizard coming soon. Use the API directly to create jobs in the meantime.
            </Typography>

            <Box>
              <Button variant="contained" startIcon={<PlayArrow />} disabled>
                Start Analysis
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
