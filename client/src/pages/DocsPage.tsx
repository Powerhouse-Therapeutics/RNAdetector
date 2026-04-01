import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Tabs, Tab, Stack, Divider, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip,
} from '@mui/material';
import {
  MenuBook as DocsIcon,
  ArrowBack as BackIcon,
  Science, BubbleChart, AcUnit, CompareArrows, AccountTree,
  Storage, Settings, Work, Folder, AdminPanelSettings,
} from '@mui/icons-material';
import useAuthStore from '@/stores/authStore';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2, color: 'primary.main' }}>
      {children}
    </Typography>
  );
}

function SubSection({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1.5 }}>
      {children}
    </Typography>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8, color: 'text.secondary' }}>
      {children}
    </Typography>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <Paper
      sx={{
        p: 2, mb: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem',
        bgcolor: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 229, 255, 0.08)',
        whiteSpace: 'pre-wrap', overflowX: 'auto',
      }}
    >
      {children}
    </Paper>
  );
}

export default function DocsPage() {
  const [tab, setTab] = useState(0);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Tooltip title="Go back">
          <IconButton onClick={() => navigate(isAuthenticated ? '/' : '/login')} sx={{ color: 'primary.main' }}>
            <BackIcon />
          </IconButton>
        </Tooltip>
        <DocsIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Documentation</Typography>
      </Stack>

      <Paper
        sx={{
          background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.1)',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(0, 229, 255, 0.08)', px: 2 }}
        >
          <Tab label="Getting Started" />
          <Tab label="Analysis Workflows" />
          <Tab label="Reference Genomes" />
          <Tab label="Administration" />
          <Tab label="FAQ" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Getting Started */}
          <TabPanel value={tab} index={0}>
            <SectionTitle>Welcome to RNAdetector</SectionTitle>
            <Paragraph>
              RNAdetector is a comprehensive RNA-Seq data analysis platform that provides end-to-end processing
              from raw FASTQ files to publication-ready results. It runs as a Docker-based server controlled
              through this web interface.
            </Paragraph>

            <SubSection>Quick Start</SubSection>
            <Paragraph>
              1. <strong>Login</strong> with your credentials. Check "Remember me" to stay logged in across browser sessions.
            </Paragraph>
            <Paragraph>
              2. <strong>Browse files</strong> using the File Browser to locate your FASTQ or BAM data on the server.
            </Paragraph>
            <Paragraph>
              3. <strong>Start an analysis</strong> from the Analysis menu: choose your RNA type, select input files,
              configure the aligner and parameters, then submit the job.
            </Paragraph>
            <Paragraph>
              4. <strong>Monitor jobs</strong> on the Jobs page. Running jobs update automatically every 10 seconds.
            </Paragraph>
            <Paragraph>
              5. <strong>Review results</strong> once jobs complete. HTML reports with publication-ready figures and
              reproducible R code are generated automatically.
            </Paragraph>

            <Divider sx={{ my: 3, borderColor: 'rgba(0, 229, 255, 0.08)' }} />

            <SubSection>Supported Analysis Types</SubSection>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Analysis</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Input</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tools</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Output</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ['RNA-seq (long RNA)', 'FASTQ/BAM', 'STAR, HISAT2, Salmon, featureCounts', 'Gene/transcript counts'],
                    ['Small RNA-seq', 'FASTQ', 'BWA, featureCounts', 'miRNA, piRNA, snoRNA counts'],
                    ['Circular RNA', 'FASTQ/BAM', 'BWA, CIRI2, CIRIquant', 'CircRNA detection & quantification'],
                    ['Differential Expression', 'Sample Group job', 'DESeq2, edgeR, limma-voom', 'DEG lists, QC plots, reports'],
                    ['Pathway Analysis', 'DEGs job', 'MITHrIL2, clusterProfiler', 'KEGG pathways, GO terms'],
                  ].map(([analysis, input, tools, output]) => (
                    <TableRow key={analysis}>
                      <TableCell>{analysis}</TableCell>
                      <TableCell>{input}</TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>{tools}</Typography></TableCell>
                      <TableCell>{output}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 3, borderColor: 'rgba(0, 229, 255, 0.08)' }} />

            <SubSection>Supported Organisms</SubSection>
            <Paragraph>
              Pre-built genome and transcriptome packages are available for:
            </Paragraph>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip label="Human hg19" size="small" sx={{ bgcolor: 'rgba(0, 229, 255, 0.1)', color: 'primary.main' }} />
              <Chip label="Human hg38" size="small" sx={{ bgcolor: 'rgba(0, 229, 255, 0.1)', color: 'primary.main' }} />
              <Chip label="Mouse mm10" size="small" sx={{ bgcolor: 'rgba(0, 229, 255, 0.1)', color: 'primary.main' }} />
              <Chip label="Mouse mm39" size="small" sx={{ bgcolor: 'rgba(0, 229, 255, 0.1)', color: 'primary.main' }} />
            </Stack>
            <Paragraph>
              Custom organisms can be added by uploading genome FASTA, transcriptome, and annotation files
              through the reference upload workflow.
            </Paragraph>
          </TabPanel>

          {/* Analysis Workflows */}
          <TabPanel value={tab} index={1}>
            <SectionTitle>Analysis Workflows</SectionTitle>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><Science fontSize="small" sx={{ color: 'primary.main' }} /> Long RNA-seq</Stack></SubSection>
            <Paragraph>
              Quantify gene and transcript expression from mRNA and lncRNA sequencing data.
            </Paragraph>
            <Paragraph>
              <strong>Algorithms:</strong> STAR (splice-aware alignment), HISAT2 (memory-efficient alignment),
              or Salmon (quasi-mapping, fastest). When using STAR or HISAT2, a counting step with featureCounts
              or HTSeq is automatically added.
            </Paragraph>
            <Paragraph>
              <strong>Parameters:</strong> Select single-end or paired-end, choose your reference genome and
              annotation, set thread count. For paired-end, select both R1 and R2 FASTQ files.
            </Paragraph>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><AcUnit fontSize="small" sx={{ color: 'primary.main' }} /> Small RNA-seq</Stack></SubSection>
            <Paragraph>
              Identify and quantify small non-coding RNAs: miRNAs, piRNAs, snoRNAs, and tRNA fragments.
              Uses alignment-based counting against small ncRNA annotations.
            </Paragraph>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><BubbleChart fontSize="small" sx={{ color: 'primary.main' }} /> Circular RNA</Stack></SubSection>
            <Paragraph>
              Detect and quantify circular RNA transcripts using CIRI2. Requires paired-end data for
              CIRIquant quantification. Back-splice junctions are identified from BWA alignments.
            </Paragraph>

            <SubSection>Sample Groups</SubSection>
            <Paragraph>
              Group completed analysis jobs together for downstream comparison. A Sample Group combines
              multiple individual RNA-seq jobs into a unified count matrix for differential expression.
            </Paragraph>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><CompareArrows fontSize="small" sx={{ color: 'primary.main' }} /> Differential Expression</Stack></SubSection>
            <Paragraph>
              Compare gene expression between conditions using DESeq2, edgeR, or limma-voom.
              Requires a completed Sample Group job as input. Configure contrasts (control vs. treatment),
              normalization method, statistical thresholds, and multiple testing correction.
            </Paragraph>
            <Paragraph>
              <strong>Key parameters:</strong>
            </Paragraph>
            <Stack component="ul" sx={{ color: 'text.secondary', pl: 2, mb: 2 }}>
              <li><strong>p-value cutoff:</strong> Default 0.05</li>
              <li><strong>Normalization:</strong> DESeq2 (median of ratios) or edgeR (TMM)</li>
              <li><strong>Statistical tests:</strong> DESeq2 (Wald test), edgeR (exact/GLM), limma-voom</li>
              <li><strong>Adjustment method:</strong> Benjamini-Hochberg (BH) recommended</li>
            </Stack>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><AccountTree fontSize="small" sx={{ color: 'primary.main' }} /> Pathway Analysis</Stack></SubSection>
            <Paragraph>
              Identify enriched biological pathways from DEGs results. Uses MITHrIL for KEGG pathway
              analysis and clusterProfiler/fgsea for Gene Ontology enrichment and GSEA.
              Requires a completed DEGs analysis job as input.
            </Paragraph>
            <Paragraph>
              <strong>Organism codes:</strong> hsa (Human), mmu (Mouse), rno (Rat)
            </Paragraph>
          </TabPanel>

          {/* Reference Genomes */}
          <TabPanel value={tab} index={2}>
            <SectionTitle>Reference Genomes & Annotations</SectionTitle>
            <Paragraph>
              Reference genomes are downloaded from public repositories (GENCODE, UCSC, Ensembl) and
              indexed for each supported aligner. Install packages from the Admin page.
            </Paragraph>

            <SubSection>Available Packages</SubSection>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Package</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Species</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Build</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Contents</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ['Genome packages', 'Human / Mouse', 'hg19, hg38, mm10, mm39', 'FASTA + STAR, HISAT2, BWA indexes + GTF annotation'],
                    ['Transcriptome packages', 'Human / Mouse', 'hg19, hg38, mm10, mm39', 'Salmon decoy-aware index from GENCODE transcripts'],
                    ['Small ncRNA packages', 'Human / Mouse', 'hg19, hg38, mm10, mm39', 'miRNA, snoRNA, snRNA annotations from GENCODE + miRBase'],
                    ['CircRNA packages', 'Human / Mouse', 'hg19, hg38, mm10', 'CircRNA annotations from GENCODE + circBase'],
                  ].map(([pkg, species, build, contents]) => (
                    <TableRow key={pkg}>
                      <TableCell sx={{ fontWeight: 500 }}>{pkg}</TableCell>
                      <TableCell>{species}</TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>{build}</Typography></TableCell>
                      <TableCell>{contents}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <SubSection>Data Sources</SubSection>
            <Stack component="ul" sx={{ color: 'text.secondary', pl: 2, mb: 2 }}>
              <li><strong>GENCODE:</strong> Gene annotations and transcript sequences (v44 for hg38, v19 for hg19, M33 for mm39, M25 for mm10)</li>
              <li><strong>UCSC:</strong> Genome FASTA assemblies (hg19, mm10)</li>
              <li><strong>miRBase:</strong> microRNA annotations (hsa, mmu)</li>
              <li><strong>circBase:</strong> Circular RNA database (hg19)</li>
            </Stack>

            <SubSection>Installing Packages</SubSection>
            <Paragraph>
              Navigate to <strong>Admin &gt; Package Manager</strong> and click "Install" next to the desired
              package. Genome packages are large (25-35 GB) and may take 1-2 hours to download and index.
              Annotation packages (small RNA, circRNA) are much smaller and install in minutes.
              Progress is shown in real-time on the admin page.
            </Paragraph>
          </TabPanel>

          {/* Administration */}
          <TabPanel value={tab} index={3}>
            <SectionTitle>Administration</SectionTitle>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><AdminPanelSettings fontSize="small" sx={{ color: 'primary.main' }} /> User Management</Stack></SubSection>
            <Paragraph>
              Administrators can create and delete user accounts from the <strong>Admin</strong> page.
              Each user has a name, email, password, and an optional administrator flag. Non-admin users
              can only see and manage their own jobs. Admins see all jobs across users.
            </Paragraph>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><Storage fontSize="small" sx={{ color: 'primary.main' }} /> Server Status</Stack></SubSection>
            <Paragraph>
              The Admin page and Dashboard show real-time server metrics: CPU cores, RAM usage,
              container uptime, and Docker status. Use this to monitor resource availability before
              submitting large jobs.
            </Paragraph>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><Folder fontSize="small" sx={{ color: 'primary.main' }} /> File Browser</Stack></SubSection>
            <Paragraph>
              The file browser shows directories mounted into the Docker container via the
              BROWSABLE_VOLUMES environment variable. Each volume appears as a selectable entry.
              You can browse subdirectories, search for files by pattern (e.g., *.fastq.gz),
              and select files for analysis.
            </Paragraph>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><Settings fontSize="small" sx={{ color: 'primary.main' }} /> Settings</Stack></SubSection>
            <Paragraph>
              The Settings page lets you update your display name, email address, and password.
              The current password is required for password changes.
            </Paragraph>

            <SubSection><Stack direction="row" alignItems="center" spacing={1}><Work fontSize="small" sx={{ color: 'primary.main' }} /> Job Management</Stack></SubSection>
            <Paragraph>
              The Jobs page shows all submitted analyses with their status (ready, queued, processing,
              completed, failed). Jobs auto-refresh every 10 seconds. You can filter by status and
              delete jobs that are no longer needed.
            </Paragraph>

            <SubSection>Docker Configuration</SubSection>
            <CodeBlock>{`docker run -d \\
  --name rnadetector \\
  -p 9898:80 \\
  -v /path/to/data:/data \\
  -v rnadetector-storage:/rnadetector/ws/storage/app/ \\
  -e ADMIN_EMAIL="admin@yourdomain.com" \\
  -e ADMIN_PASSWORD="your-secure-password" \\
  -e BROWSABLE_VOLUMES="/data:Sequencing Data" \\
  alaimos/rnadetector:v0.0.3`}</CodeBlock>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Variable</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Default</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ['ADMIN_EMAIL', 'admin@admin', 'Admin login email'],
                    ['ADMIN_PASSWORD', 'password123', 'Admin login password'],
                    ['BROWSABLE_VOLUMES', '/data:Data Files', 'Comma-separated path:label pairs for file browser'],
                    ['AUTO_INSTALL_PACKAGES', '(empty)', 'Comma-separated packages to install on first boot'],
                  ].map(([v, d, desc]) => (
                    <TableRow key={v}>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>{v}</Typography></TableCell>
                      <TableCell>{d}</TableCell>
                      <TableCell>{desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* FAQ */}
          <TabPanel value={tab} index={4}>
            <SectionTitle>Frequently Asked Questions</SectionTitle>

            <SubSection>How do I start an RNA-seq analysis?</SubSection>
            <Paragraph>
              Go to <strong>Analysis &gt; RNA-seq</strong>, enter a job name, select single-end or
              paired-end, choose your FASTQ files from the file browser, pick an aligner (STAR, HISAT2,
              or Salmon), select a reference genome, adjust thread/memory allocation, review your settings,
              then click Submit.
            </Paragraph>

            <SubSection>What's the difference between STAR, HISAT2, and Salmon?</SubSection>
            <Paragraph>
              <strong>STAR:</strong> Splice-aware aligner, most widely used for RNA-seq. Requires ~32GB RAM
              for human genome. Produces BAM files for visualization.
            </Paragraph>
            <Paragraph>
              <strong>HISAT2:</strong> Memory-efficient splice-aware aligner (~8GB RAM). Good alternative
              when RAM is limited.
            </Paragraph>
            <Paragraph>
              <strong>Salmon:</strong> Quasi-mapping approach (no alignment). Fastest option, directly
              produces transcript-level quantification. Does not produce BAM files.
            </Paragraph>

            <SubSection>How do I run differential expression analysis?</SubSection>
            <Paragraph>
              DEGs analysis requires two prior steps: (1) Run individual RNA-seq jobs for each sample,
              then (2) create a Sample Group combining those jobs. Only then can you run DEGs analysis,
              selecting the Sample Group as input and defining contrasts (control vs treatment).
            </Paragraph>

            <SubSection>Why is my job stuck in "queued" status?</SubSection>
            <Paragraph>
              Jobs are processed sequentially by the queue worker. If another job is currently running,
              yours will wait. Check the Jobs page for any currently "processing" jobs. Large genome
              alignments can take hours.
            </Paragraph>

            <SubSection>How much memory does STAR need?</SubSection>
            <Paragraph>
              STAR genome indexing requires ~32GB RAM for human and ~16GB for mouse. During alignment,
              STAR loads the entire index into memory. If the server doesn't have enough RAM, use HISAT2
              (~8GB) or Salmon (~8GB) instead.
            </Paragraph>

            <SubSection>Can I use my own reference genome?</SubSection>
            <Paragraph>
              Yes. Use the reference upload workflow to upload a genome FASTA file and GTF annotation.
              The system will build the necessary indexes for the aligners you select.
            </Paragraph>

            <SubSection>Where are my results stored?</SubSection>
            <Paragraph>
              Results are stored in the Docker container's storage volume. Access them through the
              Jobs page once the job is completed. HTML reports, count tables, and other outputs
              can be viewed and downloaded from the web interface.
            </Paragraph>

            <SubSection>How do I install genome packages?</SubSection>
            <Paragraph>
              Go to <strong>Admin &gt; Package Manager</strong>. Available packages are listed with
              an "Install" button. Packages are downloaded from GENCODE, UCSC, and Ensembl public
              repositories and indexed automatically. Large genome packages (~25-35GB) may take
              1-2 hours to complete.
            </Paragraph>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
