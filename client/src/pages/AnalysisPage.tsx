import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper,
  Chip,
  Alert,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Science as AnalysisIcon } from '@mui/icons-material';
import type { FileEntry, JobType, Reference, Annotation } from '@/types';
import { createJob, submitJob } from '@/api/jobs';
import { fetchReferences } from '@/api/references';
import { fetchAnnotations } from '@/api/annotations';
import AnalysisWizard, { type StepConfig } from '@/components/analysis/AnalysisWizard';
import FileSelector from '@/components/files/FileSelector';
import ResourceSelector from '@/components/analysis/ResourceSelector';

interface AnalysisParams {
  jobName: string;
  inputType: 'single' | 'paired';
  inputFormat: 'FASTQ' | 'BAM';
  files: FileEntry[];
  algorithm: string;
  referenceId: number | '';
  annotationId: number | '';
  threads: number;
  memoryGB: number;
}

const ANALYSIS_CONFIG: Record<
  string,
  { title: string; algorithms: string[]; fileExtensions: string[]; description: string }
> = {
  long_rna: {
    title: 'Long RNA-Seq Analysis',
    algorithms: ['STAR', 'HISAT2', 'Salmon', 'Kallisto'],
    fileExtensions: ['.fastq', '.fq', '.fastq.gz', '.fq.gz', '.bam'],
    description: 'Quantify gene and transcript expression from long RNA sequencing data.',
  },
  small_rna: {
    title: 'Small RNA-Seq Analysis',
    algorithms: ['BWA', 'Bowtie2', 'miRDeep2'],
    fileExtensions: ['.fastq', '.fq', '.fastq.gz', '.fq.gz'],
    description: 'Identify and quantify small RNAs including miRNAs and piRNAs.',
  },
  circ_rna: {
    title: 'Circular RNA Analysis',
    algorithms: ['CIRI2', 'CIRCexplorer2', 'find_circ'],
    fileExtensions: ['.fastq', '.fq', '.fastq.gz', '.fq.gz', '.bam'],
    description: 'Detect and quantify circular RNA transcripts.',
  },
  diff_expr: {
    title: 'Differential Expression',
    algorithms: ['DESeq2', 'edgeR', 'limma-voom'],
    fileExtensions: ['.tsv', '.csv', '.txt'],
    description: 'Perform differential expression analysis between sample groups.',
  },
  pathway: {
    title: 'Pathway Analysis',
    algorithms: ['GSEA', 'GOseq', 'KEGG'],
    fileExtensions: ['.tsv', '.csv', '.txt'],
    description: 'Identify enriched biological pathways and gene ontology terms.',
  },
};

export default function AnalysisPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const config = ANALYSIS_CONFIG[type || ''] || ANALYSIS_CONFIG.long_rna;
  const analysisType = (type || 'long_rna') as JobType;

  const [params, setParams] = useState<AnalysisParams>({
    jobName: '',
    inputType: 'single',
    inputFormat: 'FASTQ',
    files: [],
    algorithm: config.algorithms[0],
    referenceId: '',
    annotationId: '',
    threads: 4,
    memoryGB: 8,
  });
  const [references, setReferences] = useState<Reference[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferences().then(setReferences);
    fetchAnnotations().then(setAnnotations);
  }, []);

  // Reset algorithm when type changes
  useEffect(() => {
    const c = ANALYSIS_CONFIG[type || ''];
    if (c) {
      setParams((prev) => ({ ...prev, algorithm: c.algorithms[0] }));
    }
  }, [type]);

  const update = <K extends keyof AnalysisParams>(key: K, value: AnalysisParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const job = await createJob({
        name: params.jobName,
        type: analysisType,
        parameters: {
          input_type: params.inputType,
          input_format: params.inputFormat,
          files: params.files.map((f) => f.path),
          algorithm: params.algorithm,
          reference_id: params.referenceId || undefined,
          annotation_id: params.annotationId || undefined,
          threads: params.threads,
          memory_gb: params.memoryGB,
        },
      });
      await submitJob(job.id);
      navigate('/jobs');
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || 'Failed to submit analysis job.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAnnotations = params.referenceId
    ? annotations.filter((a) => a.reference_id === params.referenceId)
    : annotations;

  const steps: StepConfig[] = [
    {
      label: 'Setup',
      validate: () => {
        if (!params.jobName.trim()) return 'Please enter a job name.';
        return true;
      },
      content: (
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {config.description}
          </Typography>
          <TextField
            label="Job Name"
            value={params.jobName}
            onChange={(e) => update('jobName', e.target.value)}
            fullWidth
            required
            placeholder="e.g. Sample_A_long_rna_run1"
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Input Type</InputLabel>
                <Select
                  value={params.inputType}
                  label="Input Type"
                  onChange={(e) => update('inputType', e.target.value as 'single' | 'paired')}
                >
                  <MenuItem value="single">Single-end</MenuItem>
                  <MenuItem value="paired">Paired-end</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Input Format</InputLabel>
                <Select
                  value={params.inputFormat}
                  label="Input Format"
                  onChange={(e) => update('inputFormat', e.target.value as 'FASTQ' | 'BAM')}
                >
                  <MenuItem value="FASTQ">FASTQ</MenuItem>
                  <MenuItem value="BAM">BAM</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Stack>
      ),
    },
    {
      label: 'Input Files',
      validate: () => {
        if (params.files.length === 0) return 'Please select at least one input file.';
        return true;
      },
      content: (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Select your {params.inputFormat} input files from the server file system.
          </Typography>
          <FileSelector
            value={params.files}
            onChange={(files) => update('files', files)}
            multiple
            filters={config.fileExtensions}
          />
        </Stack>
      ),
    },
    {
      label: 'Parameters',
      validate: () => {
        if (!params.algorithm) return 'Please select an algorithm.';
        return true;
      },
      content: (
        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Algorithm</InputLabel>
            <Select
              value={params.algorithm}
              label="Algorithm"
              onChange={(e) => update('algorithm', e.target.value)}
            >
              {config.algorithms.map((algo) => (
                <MenuItem key={algo} value={algo}>
                  {algo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {['long_rna', 'small_rna', 'circ_rna'].includes(analysisType) && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Reference Genome</InputLabel>
                  <Select
                    value={params.referenceId}
                    label="Reference Genome"
                    onChange={(e) => update('referenceId', e.target.value as number)}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {references.map((ref) => (
                      <MenuItem key={ref.id} value={ref.id}>
                        {ref.name} ({ref.species} - {ref.genome_build})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Annotation</InputLabel>
                  <Select
                    value={params.annotationId}
                    label="Annotation"
                    onChange={(e) => update('annotationId', e.target.value as number)}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {filteredAnnotations.map((ann) => (
                      <MenuItem key={ann.id} value={ann.id}>
                        {ann.name} ({ann.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          <ResourceSelector
            analysisType={analysisType as any}
            threads={params.threads}
            memoryGB={params.memoryGB}
            onThreadsChange={(v) => update('threads', v)}
            onMemoryChange={(v) => update('memoryGB', v)}
          />
        </Stack>
      ),
    },
    {
      label: 'Review & Submit',
      content: (
        <Stack spacing={3}>
          {submitError && (
            <Alert severity="error" onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}
          <Paper
            sx={{
              p: 3,
              background: 'rgba(17, 24, 39, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0, 229, 255, 0.1)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Analysis Summary
            </Typography>
            <List dense>
              <SummaryItem label="Job Name" value={params.jobName} />
              <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.06)' }} />
              <SummaryItem label="Analysis Type" value={config.title} />
              <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.06)' }} />
              <SummaryItem label="Input Type" value={params.inputType === 'single' ? 'Single-end' : 'Paired-end'} />
              <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.06)' }} />
              <SummaryItem label="Input Format" value={params.inputFormat} />
              <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.06)' }} />
              <SummaryItem label="Files" value={`${params.files.length} file(s) selected`} />
              <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.06)' }} />
              <SummaryItem label="Algorithm" value={params.algorithm} />
              <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.06)' }} />
              <SummaryItem label="Reference" value={references.find((r) => r.id === params.referenceId)?.name || 'None'} />
              <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.06)' }} />
              <SummaryItem label="Annotation" value={annotations.find((a) => a.id === params.annotationId)?.name || 'None'} />
              <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.06)' }} />
              <SummaryItem label="Resources" value={`${params.threads} threads, ${params.memoryGB} GB RAM`} />
            </List>

            {params.files.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Selected Files:
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {params.files.map((f) => (
                    <Chip
                      key={f.path}
                      label={f.name}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: 'rgba(0, 229, 255, 0.2)',
                        color: 'text.secondary',
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
        <AnalysisIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h4">{config.title}</Typography>
      </Stack>
      <AnalysisWizard steps={steps} onSubmit={handleSubmit} submitting={submitting} />
    </Box>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <ListItem>
      <ListItemText
        primary={label}
        secondary={value}
        primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
        secondaryTypographyProps={{ variant: 'body2', color: 'text.primary', fontWeight: 500 }}
      />
    </ListItem>
  );
}
