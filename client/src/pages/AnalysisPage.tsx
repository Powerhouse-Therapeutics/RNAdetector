import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Alert,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Checkbox,
  FormControlLabel,
  Switch,
  CircularProgress,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Science as AnalysisIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  FolderOpen as FolderOpenIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import type { FileEntry, JobType, Reference, Annotation, Job } from '@/types';
import { createJob, submitJob, fetchJobs } from '@/api/jobs';
import { fetchReferences } from '@/api/references';
import { fetchAnnotations } from '@/api/annotations';
import { getErrorMessage } from '@/api/client';
import AnalysisWizard, { type StepConfig } from '@/components/analysis/AnalysisWizard';
import ServerFileBrowser from '@/components/files/ServerFileBrowser';
import ResourceSelector from '@/components/analysis/ResourceSelector';
import { ColorGroupEditor } from '@/components/ui/ColorPicker';

/* ---------- sequencing analysis params ---------- */
interface SeqParams {
  inputType: 'single' | 'paired';
  inputFormat: 'FASTQ' | 'BAM';
  files: FileEntry[];
  algorithm: string;
  referenceId: number | '';
  annotationId: number | '';
  threads: number;
  memoryGB: number;
}

/* ---------- sample group params ---------- */
interface SampleGroupParams {
  selectedJobIds: number[];
}

/* ---------- DEGs params ---------- */
interface Contrast {
  control: string;
  case: string;
}

interface DEGsParams {
  sourceSampleGroup: number | '';
  sampleType: 'gene' | 'transcript';
  statsMethods: string[];
  contrasts: Contrast[];
  pcut: number;
  norm: 'deseq' | 'edger';
  adjustMethod: string;
}

/* ---------- pathway params ---------- */
interface PathwayParams {
  degsAnalysis: number | '';
  organism: 'hsa' | 'mmu' | 'rno';
  degsPCutoff: number;
  degsUseFdr: boolean;
  lfcThreshold: number;
  pathwayPCutoff: number;
  pathwayUseFdr: boolean;
}

// Algorithm display names -> backend values
const ALGO_MAP: Record<string, string> = {
  'STAR': 'star',
  'HISAT2': 'hisat2',
  'Salmon': 'salmon',
  'BWA': 'bwa',
  'CIRI2': 'ciri',
  'DESeq2': 'deseq',
  'edgeR': 'edger',
  'limma-voom': 'limma',
};

// Map client type names to backend job type IDs
const typeMap: Record<string, string> = {
  long_rna: 'long_rna_job_type',
  small_rna: 'small_rna_job_type',
  circ_rna: 'circ_rna_job_type',
  sample_group: 'samples_group_job_type',
  diff_expr: 'diff_expr_analysis_job_type',
  pathway: 'pathway_analysis_job_type',
  full_pipeline: 'long_rna_job_type',
};

const ANALYSIS_CONFIG: Record<
  string,
  { title: string; algorithms: string[]; fileExtensions: string[]; description: string; needsGenome?: boolean }
> = {
  long_rna: {
    title: 'Long RNA-Seq Analysis',
    algorithms: ['STAR', 'HISAT2', 'Salmon'],
    fileExtensions: ['.fastq', '.fq', '.fastq.gz', '.fq.gz', '.bam'],
    description:
      'Quantify gene and transcript expression from long RNA sequencing data. Uses STAR/HISAT2 for alignment or Salmon for quasi-mapping.',
    needsGenome: true,
  },
  small_rna: {
    title: 'Small RNA-Seq Analysis',
    algorithms: ['BWA', 'STAR', 'HISAT2'],
    fileExtensions: ['.fastq', '.fq', '.fastq.gz', '.fq.gz'],
    description:
      'Identify and quantify small RNAs including miRNAs, snoRNAs, and piRNAs using BWA alignment.',
    needsGenome: true,
  },
  circ_rna: {
    title: 'Circular RNA Analysis',
    algorithms: ['CIRI2'],
    fileExtensions: ['.fastq', '.fq', '.fastq.gz', '.fq.gz', '.bam'],
    description:
      'Detect and quantify circular RNA transcripts using CIRI2/CIRIquant with BWA alignment.',
    needsGenome: true,
  },
  diff_expr: {
    title: 'Differential Expression',
    algorithms: ['DESeq2', 'edgeR', 'limma-voom'],
    fileExtensions: [],
    description:
      'Perform differential expression analysis between sample groups. Requires a completed Sample Group job.',
  },
  sample_group: {
    title: 'Sample Group',
    algorithms: [],
    fileExtensions: [],
    description:
      'Group completed sequencing analysis jobs together for downstream differential expression analysis.',
  },
  pathway: {
    title: 'Pathway Analysis',
    algorithms: [],
    fileExtensions: [],
    description:
      'Identify enriched biological pathways using MITHrIL. Requires a completed DEGs analysis job.',
  },
  full_pipeline: {
    title: 'Full Pipeline',
    algorithms: ['STAR', 'HISAT2', 'Salmon'],
    fileExtensions: ['.fastq', '.fq', '.fastq.gz', '.fq.gz'],
    description: 'Complete RNA-seq pipeline: alignment, quantification, differential expression, pathway analysis, and comprehensive HTML report with all figures.',
    needsGenome: true,
  },
};

const isSequencing = (t: string) => ['long_rna', 'small_rna', 'circ_rna', 'full_pipeline'].includes(t);

/* ---------- sample entry for sequencing file input ---------- */
interface SampleEntry {
  name: string;
  r1Path: string;
  r2Path: string; // empty for single-end
}

function inferSampleName(filepath: string): string {
  const basename = filepath.split('/').pop() || '';
  return basename
    .replace(/[._](R[12])[._].*$/, '')
    .replace(/\.fastq\.gz$|\.fq\.gz$|\.fastq$|\.fq$|\.bam$/, '')
    .replace(/_S\d+_L\d+$/, '')
    || basename;
}

function parseBulkInput(text: string, paired: boolean): SampleEntry[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (!paired) {
    return lines.map(path => ({ name: inferSampleName(path), r1Path: path, r2Path: '' }));
  }
  const r1Files = lines.filter(l => /_R1[_.]/.test(l) || /\.R1\./.test(l) || /_1\.f/.test(l));
  const r2Files = lines.filter(l => /_R2[_.]/.test(l) || /\.R2\./.test(l) || /_2\.f/.test(l));
  const samples: SampleEntry[] = [];
  for (const r1 of r1Files) {
    const name = inferSampleName(r1);
    const r2 = r2Files.find(f => inferSampleName(f) === name) || '';
    samples.push({ name, r1Path: r1, r2Path: r2 });
  }
  // Add any unpaired lines that weren't matched as R1 or R2
  const unmatched = lines.filter(
    l => !r1Files.includes(l) && !r2Files.includes(l)
  );
  for (const path of unmatched) {
    samples.push({ name: inferSampleName(path), r1Path: path, r2Path: '' });
  }
  return samples;
}

const paperSx = {
  p: 2,
  background: '#161B22',
  border: '1px solid #21262D',
  borderRadius: '12px',
};

const tableHeadCellSx = {
  color: '#8B949E',
  fontWeight: 600,
  fontSize: '0.78rem',
  borderBottom: '1px solid #21262D',
  letterSpacing: '0.02em',
};

const tableBodyCellSx = {
  borderBottom: '1px solid #21262D',
};

export default function AnalysisPage() {
  const { type: rawType } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const type = (rawType || 'long-rna').replace(/-/g, '_');
  const config = ANALYSIS_CONFIG[type] || ANALYSIS_CONFIG.long_rna;
  const analysisType = (type || 'long_rna') as JobType;

  /* ----- common state ----- */
  const [jobName, setJobName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ----- sequencing state ----- */
  const [seqParams, setSeqParams] = useState<SeqParams>({
    inputType: 'single',
    inputFormat: 'FASTQ',
    files: [],
    algorithm: config.algorithms[0] || '',
    referenceId: '',
    annotationId: '',
    threads: 32,
    memoryGB: 64,
  });
  /* ----- sample management state ----- */
  const [samples, setSamples] = useState<SampleEntry[]>([]);
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [browseTarget, setBrowseTarget] = useState<{ sampleIdx: number; field: 'r1' | 'r2' | 'both' } | null>(null);
  const [browsePending, setBrowsePending] = useState<FileEntry[]>([]);

  const [groupColors, setGroupColors] = useState<{name: string; color: string}[]>([
    { name: 'Control', color: '#3B82F6' },
    { name: 'Treatment', color: '#F85149' },
  ]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  /* ----- jobs list for downstream analyses ----- */
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  /* ----- sample group state ----- */
  const [sgParams, setSgParams] = useState<SampleGroupParams>({ selectedJobIds: [] });

  /* ----- DEGs state ----- */
  const [degsParams, setDegsParams] = useState<DEGsParams>({
    sourceSampleGroup: '',
    sampleType: 'gene',
    statsMethods: ['deseq'],
    contrasts: [{ control: '', case: '' }],
    pcut: 0.05,
    norm: 'deseq',
    adjustMethod: 'BH',
  });

  /* ----- pathway state ----- */
  const [pwParams, setPwParams] = useState<PathwayParams>({
    degsAnalysis: '',
    organism: 'hsa',
    degsPCutoff: 0.05,
    degsUseFdr: true,
    lfcThreshold: 0,
    pathwayPCutoff: 0.05,
    pathwayUseFdr: true,
  });

  /* ----- fetch references & annotations for sequencing types ----- */
  useEffect(() => {
    if (isSequencing(analysisType)) {
      fetchReferences().then(setReferences).catch(() => {});
      fetchAnnotations().then(setAnnotations).catch(() => {});
    }
  }, [analysisType]);

  /* ----- fetch completed jobs for non-sequencing types ----- */
  useEffect(() => {
    if (!isSequencing(analysisType)) {
      setLoadingJobs(true);
      // Fetch a large page to get all jobs; paginate if needed
      fetchJobs(1, 200, { field: 'created_at', direction: 'desc' })
        .then((res) => setAllJobs(Array.isArray(res.data) ? res.data : []))
        .finally(() => setLoadingJobs(false));
    }
  }, [analysisType]);

  /* ----- reset algorithm when type changes ----- */
  useEffect(() => {
    const c = ANALYSIS_CONFIG[type || ''];
    if (c && c.algorithms.length > 0) {
      setSeqParams((prev) => ({ ...prev, algorithm: c.algorithms[0] }));
    }
  }, [type]);

  /* ----- reset all form state when analysis type changes ----- */
  useEffect(() => {
    setJobName('');
    setSubmitError(null);
    setSamples([]);
    setBulkText('');
    setShowBulkInput(false);
    setSgParams({ selectedJobIds: [] });
    setDegsParams({ sourceSampleGroup: '', sampleType: 'gene', statsMethods: ['deseq'], contrasts: [{ control: '', case: '' }], pcut: 0.05, norm: 'deseq', adjustMethod: 'BH' });
    setPwParams({ degsAnalysis: '', organism: 'hsa', degsPCutoff: 0.05, degsUseFdr: true, lfcThreshold: 0, pathwayPCutoff: 0.05, pathwayUseFdr: true });
  }, [type]);

  /* ----- filtered job lists ----- */
  const completedSeqJobs = useMemo(
    () =>
      allJobs.filter(
        (j) =>
          j.status === 'completed' &&
          ['long_rna_job_type', 'small_rna_job_type', 'circ_rna_job_type'].includes(j.type),
      ),
    [allJobs],
  );

  const completedSampleGroupJobs = useMemo(
    () => allJobs.filter((j) => j.status === 'completed' && j.type === 'samples_group_job_type'),
    [allJobs],
  );

  const completedDEGsJobs = useMemo(
    () => allJobs.filter((j) => j.status === 'completed' && j.type === 'diff_expr_analysis_job_type'),
    [allJobs],
  );

  const selectedRefName = seqParams.referenceId
    ? references.find((r) => r.id === seqParams.referenceId)?.name ?? ''
    : '';
  const filteredAnnotations = selectedRefName
    ? annotations.filter((a) => a.name.startsWith(selectedRefName))
    : annotations;

  /* ----- helpers ----- */
  const updateSeq = <K extends keyof SeqParams>(key: K, value: SeqParams[K]) =>
    setSeqParams((prev) => ({ ...prev, [key]: value }));

  const addSample = () =>
    setSamples((prev) => [...prev, { name: '', r1Path: '', r2Path: '' }]);

  const removeSample = (idx: number) =>
    setSamples((prev) => prev.filter((_, i) => i !== idx));

  const updateSample = (idx: number, field: keyof SampleEntry, value: string) =>
    setSamples((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

  const handleBrowseSelect = (files: FileEntry[]) => {
    if (!browseTarget || files.length === 0) {
      setBrowseTarget(null);
      return;
    }
    const { sampleIdx, field } = browseTarget;

    if (field === 'both') {
      // Sort selected files into R1 and R2 by filename
      let r1 = '';
      let r2 = '';
      for (const f of files) {
        const name = f.name.toLowerCase();
        if (/_r1[_.]|\.r1\.|_1\.f/.test(name)) r1 = f.path;
        else if (/_r2[_.]|\.r2\.|_2\.f/.test(name)) r2 = f.path;
        else if (!r1) r1 = f.path;
        else if (!r2) r2 = f.path;
      }
      setSamples((prev) =>
        prev.map((s, i) => {
          if (i !== sampleIdx) return s;
          return {
            ...s,
            r1Path: r1 || s.r1Path,
            r2Path: r2 || s.r2Path,
            name: s.name || inferSampleName(r1 || r2),
          };
        }),
      );
    } else {
      const file = files[0];
      setSamples((prev) =>
        prev.map((s, i) => {
          if (i !== sampleIdx) return s;
          const updated = { ...s, [field === 'r1' ? 'r1Path' : 'r2Path']: file.path };
          if (!s.name && field === 'r1') {
            updated.name = inferSampleName(file.path);
          }
          return updated;
        }),
      );
    }
    setBrowseTarget(null);
  };

  const handleBulkImport = () => {
    const parsed = parseBulkInput(bulkText, seqParams.inputType === 'paired');
    setSamples((prev) => [...prev, ...parsed]);
    setBulkText('');
    setShowBulkInput(false);
  };

  const toggleSeqJob = useCallback(
    (jobId: number) => {
      setSgParams((prev) => {
        const ids = prev.selectedJobIds.includes(jobId)
          ? prev.selectedJobIds.filter((id) => id !== jobId)
          : [...prev.selectedJobIds, jobId];
        return { selectedJobIds: ids };
      });
    },
    [],
  );

  const addContrast = () =>
    setDegsParams((prev) => ({
      ...prev,
      contrasts: [...prev.contrasts, { control: '', case: '' }],
    }));

  const removeContrast = (idx: number) =>
    setDegsParams((prev) => ({
      ...prev,
      contrasts: prev.contrasts.filter((_, i) => i !== idx),
    }));

  const updateContrast = (idx: number, field: 'control' | 'case', value: string) =>
    setDegsParams((prev) => ({
      ...prev,
      contrasts: prev.contrasts.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    }));

  /* ============================================================
   *  SUBMIT
   * ============================================================ */
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      let backendParams: Record<string, unknown> = {};

      if (isSequencing(analysisType)) {
        const algoBackend = ALGO_MAP[seqParams.algorithm] || seqParams.algorithm.toLowerCase();
        backendParams = {
          paired: seqParams.inputType === 'paired',
          inputType: seqParams.inputFormat === 'BAM' ? 'BAM' : 'fastq',
          firstInputFile: samples[0]?.r1Path ?? '',
          algorithm: algoBackend,
          threads: seqParams.threads,
          samples: samples.map((s) => ({ name: s.name, r1: s.r1Path, r2: s.r2Path })),
        };
        if (seqParams.inputType === 'paired' && samples[0]?.r2Path) {
          backendParams.secondInputFile = samples[0].r2Path;
        }
        const ref = seqParams.referenceId ? references.find((r) => r.id === seqParams.referenceId) : null;
        if (ref) backendParams.genome = ref.name;
        const ann = seqParams.annotationId ? annotations.find((a) => a.id === seqParams.annotationId) : null;
        if (ann) backendParams.annotation = ann.name;
        if (algoBackend === 'salmon' && ref) backendParams.transcriptome = ref.name;
        if (algoBackend !== 'salmon') backendParams.countingAlgorithm = 'feature-counts';
        backendParams.generate_report = true;
        backendParams.group_colors = groupColors;
      } else if (analysisType === 'sample_group') {
        backendParams = { jobs: sgParams.selectedJobIds };
      } else if (analysisType === 'diff_expr') {
        backendParams = {
          source_sample_group: degsParams.sourceSampleGroup || undefined,
          sample_type: degsParams.sampleType,
          condition_variables: ['condition'],
          contrasts: degsParams.contrasts.map((c) => ({ control: c.control, case: c.case })),
          parameters: {
            pcut: degsParams.pcut,
            norm: degsParams.norm,
            stats: degsParams.statsMethods,
            adjust_method: degsParams.adjustMethod,
            when_apply_filter: 'prenorm',
          },
        };
        backendParams.generate_report = true;
        backendParams.group_colors = groupColors;
      } else if (analysisType === 'pathway') {
        backendParams = {
          degs_analysis: pwParams.degsAnalysis || undefined,
          degs: {
            p_cutoff: pwParams.degsPCutoff,
            p_use_fdr: pwParams.degsUseFdr,
            lfc_threshold: pwParams.lfcThreshold,
          },
          pathways: {
            organism: pwParams.organism,
            p_cutoff: pwParams.pathwayPCutoff,
            p_use_fdr: pwParams.pathwayUseFdr,
          },
        };
      }

      const job = await createJob({
        name: jobName,
        type: (typeMap[analysisType] || analysisType) as any,
        parameters: backendParams,
      });
      await submitJob(job.id);
      navigate('/jobs');
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Failed to submit analysis job.'));
    } finally {
      setSubmitting(false);
    }
  };

  /* ============================================================
   *  STEP BUILDERS
   * ============================================================ */

  // -- Step: Setup (shared by all types) --
  const setupStep: StepConfig = {
    label: 'Setup',
    validate: () => {
      if (!jobName.trim()) return 'Please enter a job name.';
      return true;
    },
    content: (
      <Stack spacing={3}>
        <Paper sx={{ ...paperSx, p: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#8B949E', lineHeight: 1.6 }}>
            {config.description}
          </Typography>
        </Paper>
        <TextField
          label="Job Name"
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
          fullWidth
          required
          placeholder={`e.g. ${analysisType}_run1`}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#30363D',
                transition: 'border-color 200ms ease',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#58A6FF' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#58A6FF' },
            },
            '& .MuiInputLabel-root': { color: '#8B949E' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#58A6FF' },
          }}
        />
        {isSequencing(analysisType) && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#8B949E' }}>Input Type</InputLabel>
                <Select
                  value={seqParams.inputType}
                  label="Input Type"
                  onChange={(e) => updateSeq('inputType', e.target.value as 'single' | 'paired')}
                  sx={{
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#30363D', transition: 'border-color 200ms ease' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#58A6FF' },
                  }}
                >
                  <MenuItem value="single">Single-end</MenuItem>
                  <MenuItem value="paired">Paired-end</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#8B949E' }}>Input Format</InputLabel>
                <Select
                  value={seqParams.inputFormat}
                  label="Input Format"
                  onChange={(e) => updateSeq('inputFormat', e.target.value as 'FASTQ' | 'BAM')}
                  sx={{
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#30363D', transition: 'border-color 200ms ease' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#58A6FF' },
                  }}
                >
                  <MenuItem value="FASTQ">FASTQ</MenuItem>
                  <MenuItem value="BAM">BAM</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}
      </Stack>
    ),
  };

  // -- Step: Input Files (sequencing only) --
  const isPaired = seqParams.inputType === 'paired';
  const inputFilesStep: StepConfig = {
    label: 'Input Files',
    validate: () => {
      if (samples.length === 0) return 'Please add at least one sample.';
      for (let i = 0; i < samples.length; i++) {
        if (!samples[i].r1Path) return `Sample ${i + 1}: R1 file path is required.`;
        if (isPaired && !samples[i].r2Path) return `Sample ${i + 1}: R2 file path is required for paired-end.`;
      }
      return true;
    },
    content: (
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Add your {seqParams.inputFormat} samples. Each sample needs a name and file path(s).
        </Typography>

        {/* Sample table */}
        {samples.length > 0 && (
          <TableContainer component={Paper} sx={{ ...paperSx, p: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeadCellSx}>#</TableCell>
                  <TableCell sx={tableHeadCellSx}>Sample Name</TableCell>
                  <TableCell sx={tableHeadCellSx}>R1 File</TableCell>
                  {isPaired && (
                    <TableCell sx={tableHeadCellSx}>R2 File</TableCell>
                  )}
                  <TableCell sx={{ ...tableHeadCellSx, width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {samples.map((sample, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      '&:last-child td': { borderBottom: 0 },
                      transition: 'background 200ms ease',
                      '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.03)' },
                    }}
                  >
                    <TableCell sx={{ ...tableBodyCellSx, color: '#484F58', fontWeight: 500 }}>{idx + 1}</TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, minWidth: 160 }}>
                      <TextField
                        value={sample.name}
                        onChange={(e) => updateSample(idx, 'name', e.target.value)}
                        size="small"
                        variant="outlined"
                        placeholder="Sample name"
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '0.85rem',
                            borderRadius: '6px',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#30363D', transition: 'border-color 200ms ease' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#58A6FF' },
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, minWidth: 200 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          value={sample.r1Path}
                          onChange={(e) => updateSample(idx, 'r1Path', e.target.value)}
                          size="small"
                          variant="outlined"
                          placeholder="/path/to/file_R1.fastq.gz"
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.8rem',
                              fontFamily: 'monospace',
                              borderRadius: '6px',
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#30363D', transition: 'border-color 200ms ease' },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#58A6FF' },
                            },
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => setBrowseTarget({ sampleIdx: idx, field: 'r1' })}
                          sx={{
                            color: '#58A6FF',
                            flexShrink: 0,
                            transition: 'all 200ms ease',
                            '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.1)' },
                          }}
                          title="Browse server files"
                        >
                          <FolderOpenIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    {isPaired && (
                      <TableCell sx={{ ...tableBodyCellSx, minWidth: 200 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            value={sample.r2Path}
                            onChange={(e) => updateSample(idx, 'r2Path', e.target.value)}
                            size="small"
                            variant="outlined"
                            placeholder="/path/to/file_R2.fastq.gz"
                            fullWidth
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                fontSize: '0.8rem',
                                fontFamily: 'monospace',
                                borderRadius: '6px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#30363D', transition: 'border-color 200ms ease' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#58A6FF' },
                              },
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => setBrowseTarget({ sampleIdx: idx, field: 'r2' })}
                            sx={{
                              color: '#58A6FF',
                              flexShrink: 0,
                              transition: 'all 200ms ease',
                              '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.1)' },
                            }}
                            title="Browse server files"
                          >
                            <FolderOpenIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    )}
                    <TableCell sx={tableBodyCellSx}>
                      <Stack direction="row" spacing={0} alignItems="center">
                        {seqParams.inputType === 'paired' && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setBrowseTarget({ sampleIdx: idx, field: 'both' })}
                            sx={{
                              minWidth: 'auto',
                              fontSize: '0.7rem',
                              color: '#58A6FF',
                              borderRadius: '6px',
                              transition: 'all 200ms ease',
                              '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.1)' },
                            }}
                          >
                            Select Both
                          </Button>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => removeSample(idx)}
                          sx={{
                            color: '#484F58',
                            transition: 'all 200ms ease',
                            '&:hover': { color: '#F85149', bgcolor: 'rgba(248, 81, 73, 0.1)' },
                          }}
                          title="Remove sample"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Action buttons */}
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addSample}
            sx={{
              borderColor: '#30363D',
              color: '#C9D1D9',
              borderRadius: '8px',
              fontWeight: 500,
              px: 2,
              transition: 'all 200ms ease',
              '&:hover': { borderColor: '#58A6FF', color: '#58A6FF', bgcolor: 'rgba(88, 166, 255, 0.06)' },
            }}
          >
            Add Sample
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => setShowBulkInput(!showBulkInput)}
            sx={{
              borderColor: '#30363D',
              color: '#C9D1D9',
              borderRadius: '8px',
              fontWeight: 500,
              px: 2,
              transition: 'all 200ms ease',
              '&:hover': { borderColor: '#58A6FF', color: '#58A6FF', bgcolor: 'rgba(88, 166, 255, 0.06)' },
            }}
          >
            Bulk Import
          </Button>
        </Stack>

        {/* Bulk import textarea */}
        {showBulkInput && (
          <Paper sx={{ ...paperSx, p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Paste file paths (one per line)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {isPaired
                ? 'Paste R1 and R2 paths. Files will be auto-paired by matching sample names (e.g., _R1_ and _R2_ patterns).'
                : 'Paste one file path per line. Sample names will be inferred from filenames.'}
            </Typography>
            <TextField
              multiline
              rows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              fullWidth
              placeholder={isPaired
                ? '/data/fastq/sample1_R1_001.fastq.gz\n/data/fastq/sample1_R2_001.fastq.gz\n/data/fastq/sample2_R1_001.fastq.gz\n/data/fastq/sample2_R2_001.fastq.gz'
                : '/data/fastq/sample1.fastq.gz\n/data/fastq/sample2.fastq.gz'}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.85rem',
                  fontFamily: '"JetBrains Mono", monospace',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#30363D' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#58A6FF' },
                },
              }}
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                onClick={handleBulkImport}
                disabled={!bulkText.trim()}
                sx={{
                  borderRadius: '8px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #58A6FF, #388BFD)',
                  transition: 'all 200ms ease',
                  '&:hover': { background: 'linear-gradient(135deg, #79B8FF, #58A6FF)' },
                  '&.Mui-disabled': { background: '#21262D', color: '#484F58' },
                }}
              >
                Import
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => { setShowBulkInput(false); setBulkText(''); }}
                sx={{ color: '#8B949E', borderRadius: '8px', transition: 'all 200ms ease', '&:hover': { bgcolor: '#21262D' } }}
              >
                Cancel
              </Button>
            </Stack>
          </Paper>
        )}

        {samples.length === 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            No samples added yet. Click &quot;Add Sample&quot; to add files individually, or use &quot;Bulk Import&quot; to paste multiple file paths at once.
          </Alert>
        )}

      </Stack>
    ),
  };

  // -- Step: Parameters (sequencing only) --
  const seqParametersStep: StepConfig = {
    label: 'Parameters',
    validate: () => {
      if (!seqParams.algorithm) return 'Please select an algorithm.';
      if (config.needsGenome && !seqParams.referenceId) return 'Please select a reference genome.';
      return true;
    },
    content: (
      <Stack spacing={3}>
        <FormControl fullWidth>
          <InputLabel>Algorithm</InputLabel>
          <Select
            value={seqParams.algorithm}
            label="Algorithm"
            onChange={(e) => updateSeq('algorithm', e.target.value)}
          >
            {config.algorithms.map((algo) => (
              <MenuItem key={algo} value={algo}>
                {algo}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Reference Genome</InputLabel>
              <Select
                value={seqParams.referenceId}
                label="Reference Genome"
                onChange={(e) => updateSeq('referenceId', e.target.value as number)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {references
                  .filter((ref) => {
                    const algo = (ALGO_MAP[seqParams.algorithm] || seqParams.algorithm || '').toLowerCase();
                    const name = ref.name.toLowerCase();
                    // Salmon needs transcriptome packages; alignment tools need genome packages
                    if (algo === 'salmon') return name.includes('transcriptome');
                    return name.includes('genome');
                  })
                  .map((ref) => (
                    <MenuItem key={ref.id} value={ref.id}>
                      {ref.name} ({ref.species}{ref.genome_build ? ` - ${ref.genome_build}` : ''})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Annotation</InputLabel>
              <Select
                value={seqParams.annotationId}
                label="Annotation"
                onChange={(e) => updateSeq('annotationId', e.target.value as number)}
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

        <ResourceSelector
          analysisType={analysisType as any}
          threads={seqParams.threads}
          memoryGB={seqParams.memoryGB}
          onThreadsChange={(v) => updateSeq('threads', v)}
          onMemoryChange={(v) => updateSeq('memoryGB', v)}
        />
      </Stack>
    ),
  };

  // -- Step: Select Jobs (sample_group) --
  const selectJobsStep: StepConfig = {
    label: 'Select Jobs',
    validate: () => {
      if (sgParams.selectedJobIds.length === 0) return 'Please select at least one completed job.';
      return true;
    },
    content: (
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Select completed sequencing analysis jobs to group together.
        </Typography>
        {loadingJobs ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : completedSeqJobs.length === 0 ? (
          <Alert severity="info">
            No completed sequencing jobs found. Run a Long RNA, Small RNA, or Circular RNA analysis first.
          </Alert>
        ) : (
          <Paper sx={paperSx}>
            <Stack spacing={0}>
              {completedSeqJobs.map((job) => (
                <FormControlLabel
                  key={job.id}
                  control={
                    <Checkbox
                      checked={sgParams.selectedJobIds.includes(job.id)}
                      onChange={() => toggleSeqJob(job.id)}
                      sx={{ color: '#30363D', '&.Mui-checked': { color: '#58A6FF' }, transition: 'color 200ms ease' }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {job.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {job.id} | Type: {job.type.replace(/_/g, ' ')} | Created:{' '}
                        {new Date(job.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    mx: 0,
                    py: 1,
                    px: 1.5,
                    borderBottom: '1px solid #21262D',
                    borderRadius: '6px',
                    mb: 0.5,
                    transition: 'background 200ms ease',
                    '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.04)' },
                    '&:last-child': { borderBottom: 'none' },
                  }}
                />
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>
    ),
  };

  // -- Step: Select Sample Group (diff_expr) --
  const selectSampleGroupStep: StepConfig = {
    label: 'Select Sample Group',
    validate: () => {
      if (!degsParams.sourceSampleGroup) return 'Please select a completed Sample Group job.';
      return true;
    },
    content: (
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Select a completed Sample Group job as input for differential expression analysis.
        </Typography>
        {loadingJobs ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : completedSampleGroupJobs.length === 0 ? (
          <Alert severity="info">
            No completed Sample Group jobs found. Create a Sample Group analysis first.
          </Alert>
        ) : (
          <FormControl fullWidth>
            <InputLabel>Sample Group Job</InputLabel>
            <Select
              value={degsParams.sourceSampleGroup}
              label="Sample Group Job"
              onChange={(e) =>
                setDegsParams((prev) => ({ ...prev, sourceSampleGroup: e.target.value as number }))
              }
            >
              <MenuItem value="">
                <em>Select a job...</em>
              </MenuItem>
              {completedSampleGroupJobs.map((job) => (
                <MenuItem key={job.id} value={job.id}>
                  {job.name} (ID: {job.id}) - {new Date(job.created_at).toLocaleDateString()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>
    ),
  };

  // -- Step: Statistical Parameters (diff_expr) --
  const degsParametersStep: StepConfig = {
    label: 'Statistical Parameters',
    validate: () => {
      if (degsParams.statsMethods.length === 0) return 'Please select at least one statistical method.';
      if (degsParams.contrasts.length === 0) return 'Please define at least one contrast.';
      for (const c of degsParams.contrasts) {
        if (!c.control.trim() || !c.case.trim())
          return 'All contrasts must have both control and case group names.';
      }
      return true;
    },
    content: (
      <Stack spacing={3}>
        {/* Sample type */}
        <FormControl fullWidth>
          <InputLabel>Sample Type</InputLabel>
          <Select
            value={degsParams.sampleType}
            label="Sample Type"
            onChange={(e) =>
              setDegsParams((prev) => ({ ...prev, sampleType: e.target.value as 'gene' | 'transcript' }))
            }
          >
            <MenuItem value="gene">Gene</MenuItem>
            <MenuItem value="transcript">Transcript</MenuItem>
          </Select>
        </FormControl>

        {/* Statistical methods (multi-select via checkboxes) */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Statistical Method(s)
          </Typography>
          <Stack direction="row" spacing={2}>
            {(['DESeq2', 'edgeR', 'limma-voom'] as const).map((method) => {
              const backendVal = ALGO_MAP[method];
              return (
                <FormControlLabel
                  key={method}
                  control={
                    <Checkbox
                      checked={degsParams.statsMethods.includes(backendVal)}
                      onChange={(e) => {
                        setDegsParams((prev) => {
                          const methods = e.target.checked
                            ? [...prev.statsMethods, backendVal]
                            : prev.statsMethods.filter((m) => m !== backendVal);
                          return { ...prev, statsMethods: methods };
                        });
                      }}
                      sx={{ color: '#30363D', '&.Mui-checked': { color: '#58A6FF' }, transition: 'color 200ms ease' }}
                    />
                  }
                  label={method}
                />
              );
            })}
          </Stack>
        </Box>

        {/* Normalization */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Normalization Method</InputLabel>
              <Select
                value={degsParams.norm}
                label="Normalization Method"
                onChange={(e) =>
                  setDegsParams((prev) => ({ ...prev, norm: e.target.value as 'deseq' | 'edger' }))
                }
              >
                <MenuItem value="deseq">DESeq2 normalization</MenuItem>
                <MenuItem value="edger">edgeR normalization (TMM)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>P-value Adjustment Method</InputLabel>
              <Select
                value={degsParams.adjustMethod}
                label="P-value Adjustment Method"
                onChange={(e) =>
                  setDegsParams((prev) => ({ ...prev, adjustMethod: e.target.value }))
                }
              >
                <MenuItem value="BH">Benjamini-Hochberg (BH)</MenuItem>
                <MenuItem value="bonferroni">Bonferroni</MenuItem>
                <MenuItem value="holm">Holm</MenuItem>
                <MenuItem value="BY">Benjamini-Yekutieli (BY)</MenuItem>
                <MenuItem value="none">None</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* P-value cutoff */}
        <TextField
          label="P-value Cutoff"
          type="number"
          value={degsParams.pcut}
          onChange={(e) => setDegsParams((prev) => ({ ...prev, pcut: parseFloat(e.target.value) || 0.05 }))}
          inputProps={{ step: 0.01, min: 0, max: 1 }}
          fullWidth
        />

        {/* Contrasts */}
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Contrasts</Typography>
            <IconButton
              size="small"
              onClick={addContrast}
              sx={{
                color: '#58A6FF',
                transition: 'all 200ms ease',
                '&:hover': { bgcolor: 'rgba(88, 166, 255, 0.1)' },
              }}
            >
              <AddIcon />
            </IconButton>
          </Stack>
          <Stack spacing={2}>
            {degsParams.contrasts.map((contrast, idx) => (
              <Paper key={idx} sx={{ ...paperSx, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <TextField
                      label="Control Group"
                      value={contrast.control}
                      onChange={(e) => updateContrast(idx, 'control', e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="e.g. control"
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      label="Case Group"
                      value={contrast.case}
                      onChange={(e) => updateContrast(idx, 'case', e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="e.g. treatment"
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    {degsParams.contrasts.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={() => removeContrast(idx)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Stack>
    ),
  };

  // -- Step: Select DEGs Analysis (pathway) --
  const selectDEGsStep: StepConfig = {
    label: 'Select DEGs Analysis',
    validate: () => {
      if (!pwParams.degsAnalysis) return 'Please select a completed DEGs analysis job.';
      return true;
    },
    content: (
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Select a completed Differential Expression analysis job as input.
        </Typography>
        {loadingJobs ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : completedDEGsJobs.length === 0 ? (
          <Alert severity="info">
            No completed Differential Expression jobs found. Run a DEGs analysis first.
          </Alert>
        ) : (
          <FormControl fullWidth>
            <InputLabel>DEGs Analysis Job</InputLabel>
            <Select
              value={pwParams.degsAnalysis}
              label="DEGs Analysis Job"
              onChange={(e) =>
                setPwParams((prev) => ({ ...prev, degsAnalysis: e.target.value as number }))
              }
            >
              <MenuItem value="">
                <em>Select a job...</em>
              </MenuItem>
              {completedDEGsJobs.map((job) => (
                <MenuItem key={job.id} value={job.id}>
                  {job.name} (ID: {job.id}) - {new Date(job.created_at).toLocaleDateString()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>
    ),
  };

  // -- Step: Pathway Parameters --
  const pathwayParametersStep: StepConfig = {
    label: 'Parameters',
    content: (
      <Stack spacing={3}>
        {/* Organism */}
        <FormControl fullWidth>
          <InputLabel>Organism</InputLabel>
          <Select
            value={pwParams.organism}
            label="Organism"
            onChange={(e) =>
              setPwParams((prev) => ({ ...prev, organism: e.target.value as 'hsa' | 'mmu' | 'rno' }))
            }
          >
            <MenuItem value="hsa">Human (hsa)</MenuItem>
            <MenuItem value="mmu">Mouse (mmu)</MenuItem>
            <MenuItem value="rno">Rat (rno)</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="subtitle2">DEGs Filtering</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="DEGs P-value Cutoff"
              type="number"
              value={pwParams.degsPCutoff}
              onChange={(e) =>
                setPwParams((prev) => ({ ...prev, degsPCutoff: parseFloat(e.target.value) || 0.05 }))
              }
              inputProps={{ step: 0.01, min: 0, max: 1 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Log FC Threshold"
              type="number"
              value={pwParams.lfcThreshold}
              onChange={(e) =>
                setPwParams((prev) => ({ ...prev, lfcThreshold: parseFloat(e.target.value) || 0 }))
              }
              inputProps={{ step: 0.1, min: 0 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={pwParams.degsUseFdr}
                  onChange={(e) => setPwParams((prev) => ({ ...prev, degsUseFdr: e.target.checked }))}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#58A6FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'rgba(88, 166, 255, 0.4)' } }}
                />
              }
              label="Use FDR for DEGs"
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle2">Pathway Enrichment</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Pathway P-value Cutoff"
              type="number"
              value={pwParams.pathwayPCutoff}
              onChange={(e) =>
                setPwParams((prev) => ({ ...prev, pathwayPCutoff: parseFloat(e.target.value) || 0.05 }))
              }
              inputProps={{ step: 0.01, min: 0, max: 1 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={pwParams.pathwayUseFdr}
                  onChange={(e) =>
                    setPwParams((prev) => ({ ...prev, pathwayUseFdr: e.target.checked }))
                  }
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#58A6FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'rgba(88, 166, 255, 0.4)' } }}
                />
              }
              label="Use FDR for Pathways"
            />
          </Grid>
        </Grid>
      </Stack>
    ),
  };

  /* ============================================================
   *  REVIEW STEP (dynamic based on type)
   * ============================================================ */
  const buildSummaryItems = (): { label: string; value: string }[] => {
    const items: { label: string; value: string }[] = [
      { label: 'Job Name', value: jobName },
      { label: 'Analysis Type', value: config.title },
    ];

    if (isSequencing(analysisType)) {
      items.push(
        { label: 'Input Type', value: seqParams.inputType === 'single' ? 'Single-end' : 'Paired-end' },
        { label: 'Input Format', value: seqParams.inputFormat },
        { label: 'Samples', value: `${samples.length} sample(s)` },
        { label: 'Algorithm', value: seqParams.algorithm },
        {
          label: 'Reference',
          value: references.find((r) => r.id === seqParams.referenceId)?.name || 'None',
        },
        {
          label: 'Annotation',
          value: annotations.find((a) => a.id === seqParams.annotationId)?.name || 'None',
        },
        { label: 'Resources', value: `${seqParams.threads} threads, ${seqParams.memoryGB} GB RAM` },
      );
    } else if (analysisType === 'sample_group') {
      const names = sgParams.selectedJobIds
        .map((id) => {
          const j = allJobs.find((job) => job.id === id);
          return j ? `${j.name} (#${j.id})` : `#${id}`;
        })
        .join(', ');
      items.push({ label: 'Selected Jobs', value: `${sgParams.selectedJobIds.length} job(s): ${names}` });
    } else if (analysisType === 'diff_expr') {
      const sgJob = allJobs.find((j) => j.id === degsParams.sourceSampleGroup);
      items.push(
        { label: 'Sample Group', value: sgJob ? `${sgJob.name} (#${sgJob.id})` : 'None' },
        { label: 'Sample Type', value: degsParams.sampleType },
        { label: 'Statistical Methods', value: degsParams.statsMethods.join(', ') },
        { label: 'Normalization', value: degsParams.norm === 'deseq' ? 'DESeq2' : 'edgeR (TMM)' },
        { label: 'P-value Cutoff', value: String(degsParams.pcut) },
        { label: 'Adjustment Method', value: degsParams.adjustMethod },
        {
          label: 'Contrasts',
          value: degsParams.contrasts.map((c) => `${c.case} vs ${c.control}`).join('; '),
        },
      );
    } else if (analysisType === 'pathway') {
      const degsJob = allJobs.find((j) => j.id === pwParams.degsAnalysis);
      const orgLabels: Record<string, string> = { hsa: 'Human', mmu: 'Mouse', rno: 'Rat' };
      items.push(
        { label: 'DEGs Analysis', value: degsJob ? `${degsJob.name} (#${degsJob.id})` : 'None' },
        { label: 'Organism', value: `${orgLabels[pwParams.organism]} (${pwParams.organism})` },
        { label: 'DEGs P-value Cutoff', value: String(pwParams.degsPCutoff) },
        { label: 'Use FDR (DEGs)', value: pwParams.degsUseFdr ? 'Yes' : 'No' },
        { label: 'Log FC Threshold', value: String(pwParams.lfcThreshold) },
        { label: 'Pathway P-value Cutoff', value: String(pwParams.pathwayPCutoff) },
        { label: 'Use FDR (Pathways)', value: pwParams.pathwayUseFdr ? 'Yes' : 'No' },
      );
    }

    return items;
  };

  const reviewStep: StepConfig = {
    label: 'Review & Submit',
    content: (
      <Stack spacing={3}>
        {submitError && (
          <Alert severity="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        )}
        <Paper sx={{ ...paperSx, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#C9D1D9', fontWeight: 600 }}>
            Analysis Summary
          </Typography>
          <List dense>
            {buildSummaryItems().map((item, idx) => (
              <Box key={idx}>
                {idx > 0 && <Divider sx={{ borderColor: '#21262D' }} />}
                <SummaryItem label={item.label} value={item.value} />
              </Box>
            ))}
          </List>

          {/* Show samples table for sequencing types */}
          {isSequencing(analysisType) && samples.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Samples:
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...tableHeadCellSx, py: 0.5, fontSize: '0.75rem' }}>Name</TableCell>
                      <TableCell sx={{ ...tableHeadCellSx, py: 0.5, fontSize: '0.75rem' }}>R1</TableCell>
                      {seqParams.inputType === 'paired' && (
                        <TableCell sx={{ ...tableHeadCellSx, py: 0.5, fontSize: '0.75rem' }}>R2</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {samples.map((s, idx) => (
                      <TableRow key={idx} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ borderBottom: '1px solid #21262D', fontSize: '0.8rem', py: 0.5, color: '#C9D1D9' }}>{s.name || '(unnamed)'}</TableCell>
                        <TableCell sx={{ borderBottom: '1px solid #21262D', fontSize: '0.75rem', py: 0.5, fontFamily: '"JetBrains Mono", monospace', color: '#8B949E' }}>{s.r1Path.split('/').pop()}</TableCell>
                        {seqParams.inputType === 'paired' && (
                          <TableCell sx={{ borderBottom: '1px solid #21262D', fontSize: '0.75rem', py: 0.5, fontFamily: '"JetBrains Mono", monospace', color: '#8B949E' }}>{s.r2Path.split('/').pop()}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>
      </Stack>
    ),
  };

  /* ============================================================
   *  COLORS STEP (sequencing, diff_expr, full_pipeline)
   * ============================================================ */
  const colorsStep: StepConfig = {
    label: 'Colors',
    content: (
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Configure colors for sample groups and figure outputs. These colors will be used in all generated plots and the HTML report.
        </Typography>
        <ColorGroupEditor groups={groupColors} onChange={setGroupColors} />
      </Stack>
    ),
  };

  /* ============================================================
   *  BUILD DYNAMIC STEPS
   * ============================================================ */
  const steps: StepConfig[] = useMemo(() => {
    if (isSequencing(analysisType)) {
      // Setup -> Input Files -> Parameters -> Colors -> Review
      return [setupStep, inputFilesStep, seqParametersStep, colorsStep, reviewStep];
    }
    if (analysisType === 'sample_group') {
      // Setup -> Select Jobs -> Review
      return [setupStep, selectJobsStep, reviewStep];
    }
    if (analysisType === 'diff_expr') {
      // Setup -> Select Sample Group -> Statistical Parameters -> Colors -> Review
      return [setupStep, selectSampleGroupStep, degsParametersStep, colorsStep, reviewStep];
    }
    if (analysisType === 'pathway') {
      // Setup -> Select DEGs Analysis -> Parameters -> Review
      return [setupStep, selectDEGsStep, pathwayParametersStep, reviewStep];
    }
    // fallback
    return [setupStep, reviewStep];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisType, jobName, seqParams, sgParams, degsParams, pwParams, groupColors, references, annotations, allJobs, loadingJobs, submitError, config, samples, showBulkInput, bulkText]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.15), rgba(56, 139, 253, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnalysisIcon sx={{ color: '#58A6FF', fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ color: '#C9D1D9', fontWeight: 700 }}>{config.title}</Typography>
          <Typography variant="body2" sx={{ color: '#484F58', mt: 0.25 }}>Configure and submit your analysis</Typography>
        </Box>
      </Stack>
      <AnalysisWizard steps={steps} onSubmit={handleSubmit} submitting={submitting} />

      {/* File browse dialog - rendered outside wizard to avoid re-memoization lag */}
      <Dialog
        open={browseTarget !== null}
        onClose={() => { setBrowseTarget(null); setBrowsePending([]); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0D1117', backgroundImage: 'none', border: '1px solid #21262D', borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #21262D', pb: 2 }}>
          <Typography variant="h6" sx={{ color: '#C9D1D9', fontWeight: 600 }}>
            {browseTarget?.field === 'both' ? 'Select R1 & R2 Files' : `Select ${browseTarget?.field === 'r2' ? 'R2' : 'R1'} File`}
          </Typography>
          {browseTarget !== null && samples[browseTarget.sampleIdx]?.name && (
            <Typography variant="caption" sx={{ color: '#484F58', display: 'block', mt: 0.5 }}>
              for sample: {samples[browseTarget.sampleIdx].name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {browseTarget !== null && (
            <ServerFileBrowser
              onSelect={setBrowsePending}
              multiple={browseTarget.field === 'both'}
              allowedExtensions={config.fileExtensions}
              initialPath="/data/GSFintake"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #21262D', px: 3, py: 2 }}>
          <Typography variant="body2" sx={{ flex: 1, color: browsePending.length > 0 ? '#58A6FF' : '#484F58', fontWeight: 500, fontSize: '0.85rem' }}>
            {browsePending.length > 0 ? `${browsePending.length} file(s) selected` : 'Click a file to select it'}
          </Typography>
          <Button
            onClick={() => { setBrowseTarget(null); setBrowsePending([]); }}
            sx={{ color: '#8B949E', borderRadius: '8px', transition: 'all 200ms ease', '&:hover': { bgcolor: '#21262D', color: '#C9D1D9' } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={browsePending.length === 0}
            onClick={() => { handleBrowseSelect(browsePending); setBrowsePending([]); }}
            sx={{
              borderRadius: '8px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #58A6FF, #388BFD)',
              boxShadow: '0 2px 8px rgba(88, 166, 255, 0.3)',
              transition: 'all 200ms ease',
              '&:hover': { background: 'linear-gradient(135deg, #79B8FF, #58A6FF)', boxShadow: '0 4px 12px rgba(88, 166, 255, 0.4)' },
              '&.Mui-disabled': { background: '#21262D', color: '#484F58', boxShadow: 'none' },
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <ListItem sx={{ py: 1 }}>
      <ListItemText
        primary={label}
        secondary={value}
        primaryTypographyProps={{
          variant: 'caption',
          sx: { color: '#484F58', fontSize: '0.72rem', letterSpacing: '0.03em', textTransform: 'uppercase' },
        }}
        secondaryTypographyProps={{
          variant: 'body2',
          sx: { color: '#C9D1D9', fontWeight: 500, mt: 0.25 },
        }}
      />
    </ListItem>
  );
}
