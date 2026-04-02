# RNAdetector User Guide

This guide provides an overview of the RNAdetector platform, descriptions of each analysis type, step-by-step walkthroughs, and guidance on interpreting results.

---

## Table of Contents

- [Platform Overview](#platform-overview)
- [Getting Started](#getting-started)
- [Supported Analyses](#supported-analyses)
  - [Long RNA-seq Analysis](#long-rna-seq-analysis)
  - [Small RNA-seq Analysis](#small-rna-seq-analysis)
  - [Circular RNA Analysis](#circular-rna-analysis)
  - [Sample Group Management](#sample-group-management)
  - [Differential Expression Analysis](#differential-expression-analysis)
  - [Pathway Analysis](#pathway-analysis)
- [Step-by-Step Walkthrough: Complete RNA-seq Experiment](#step-by-step-walkthrough-complete-rna-seq-experiment)
- [Understanding Results](#understanding-results)
- [Resource Management](#resource-management)
- [Metadata Templates](#metadata-templates)
- [Frequently Asked Questions](#frequently-asked-questions)

---

## Platform Overview

RNAdetector is a web-based platform for analyzing RNA sequencing data. It provides a guided wizard interface for configuring analyses, a job management system for tracking progress, and automated report generation with publication-ready content.

### Key Features

- **Multiple RNA classes**: mRNA, lncRNA, miRNA, piRNA, snoRNA, tRF, tsRNA, and circRNA
- **Multiple aligners**: STAR, HISAT2, BWA, and Salmon
- **Three DEG methods**: DESeq2, edgeR, and limma-voom
- **Pathway analysis**: KEGG (MITHrIL2), GO enrichment, and GSEA
- **HTML reports**: Interactive plots, reproducible R code, Materials and Methods text, BibTeX citations
- **File browser**: Browse and select server-side sequencing files directly
- **Resource management**: Configure CPU and RAM allocation per job with visual recommendations

### General Workflow

The typical RNA-seq analysis follows this sequence:

```
1. Long/Small/Circ RNA Analysis (per sample)
       |
2. Sample Group (combine samples)
       |
3. Differential Expression Analysis
       |
4. Pathway Analysis
```

Each step builds on the outputs of the previous step. Individual sequencing analyses must be completed before creating a sample group, which must be created before running differential expression, which must be completed before running pathway analysis.

---

## Getting Started

### Logging In

1. Open the RNAdetector URL in your web browser (e.g., `http://your-server:9898`).
2. Enter your email and password on the login page.
3. You will be directed to the Dashboard.

### Dashboard

The Dashboard displays:
- Server resource usage (CPU, RAM, disk)
- Job queue status (queued, processing, completed, failed)
- Quick links to start new analyses

### Navigation

The main navigation menu provides access to:

| Page | Purpose |
|------|---------|
| Dashboard | Server status and quick actions |
| Analysis | Start a new analysis (select type from submenu) |
| Jobs | View and manage all analysis jobs |
| Files | Browse server-side data files |
| References | View installed reference genomes |
| Annotations | View installed genome annotations |
| Templates | Download metadata template files |
| Server Admin | System management and package installation |

---

## Supported Analyses

### Long RNA-seq Analysis

**Purpose**: Align and quantify mRNA and lncRNA expression from RNA-seq data.

**Input**: FASTQ files (single-end or paired-end) or pre-aligned BAM files.

**Alignment/Quantification Options**:

| Algorithm | Type | Best For |
|-----------|------|----------|
| STAR | Genome alignment | High accuracy, splice junction detection. Requires ~30 GB RAM. |
| HISAT2 | Genome alignment | Lower memory usage (~8 GB). Good general-purpose aligner. |
| Salmon | Transcript quantification | Fast, alignment-free. Transcript-level and gene-level counts. |

**Counting Options** (for STAR and HISAT2):

| Counter | Description |
|---------|-------------|
| featureCounts | Fast and recommended for most use cases. Default. |
| HTSeq | Slower but handles complex overlap situations. |
| Salmon | Quantify from BAM using Salmon's EM algorithm. |

**Parameters**:
- **Input type**: Single-end or paired-end sequencing
- **Input format**: FASTQ or BAM
- **Reference genome**: Select from installed genomes (e.g., hg38, mm10)
- **Annotation**: GTF annotation file for gene/transcript definitions
- **Trim Galore**: Optional quality and adapter trimming (recommended for raw FASTQ)
  - Quality threshold (default: 20 PHRED)
  - Minimum read length (default: 14 bp)
- **Threads and memory**: CPU and RAM allocation

**Output**: Gene and/or transcript expression count tables, harmonized count matrices, alignment BAM files.

---

### Small RNA-seq Analysis

**Purpose**: Align and quantify small non-coding RNA expression (miRNA, piRNA, snoRNA, tRF, tsRNA).

**Input**: FASTQ files (typically single-end, 18-35 bp reads) or BAM files.

**Method**: BWA alignment to a small RNA reference, followed by featureCounts for quantification. Supports the same aligner options as long RNA (STAR, HISAT2, Salmon) for flexibility, though BWA is typically used for small RNA.

**Parameters**:
- **Input type**: Single-end or paired-end
- **Reference genome**: Select from installed small RNA references
- **Annotation**: Small RNA GTF annotation
- **Trim Galore**: Adapter removal is particularly important for small RNA-seq due to adapter read-through
  - Quality threshold (default: 20 PHRED)
  - Minimum read length (default: 14 bp)
- **Threads and memory**: CPU and RAM allocation

**Output**: Small RNA expression count tables, harmonized count matrices.

---

### Circular RNA Analysis

**Purpose**: Detect and quantify circular RNA (circRNA) from RNA-seq data.

**Input**: FASTQ files (paired-end recommended for better detection) or BAM files.

**Detection Methods**:

| Method | Description |
|--------|-------------|
| CIRI2 | Identifies back-splice junctions from BWA alignment. Default method. |
| CIRIquant | More advanced quantification using both linear and circular RNA mapping. Requires a BED annotation of known circRNA junctions. |

**Parameters**:
- **Input type**: Paired-end recommended
- **Reference genome**: Genome build (e.g., hg38)
- **Annotation**: GTF annotation for gene structures
- **BED annotation**: Required for CIRIquant mode; defines known circRNA junctions
- **CIRI spanning distance**: Maximum distance for back-splice junction detection (default: 200,000 bp)
- **CIRI version**: CIRI 1 or CIRI 2 (default: CIRI 2)
- **Trim Galore**: Optional quality trimming
- **Threads and memory**: CPU and RAM allocation

**Output**: CircRNA detection results with junction coordinates, read counts, and host gene information.

---

### Sample Group Management

**Purpose**: Combine multiple individual analysis jobs into a single sample group for downstream differential expression analysis.

**Input**: A set of completed analysis jobs of the same type (all Long RNA, all Small RNA, or all CircRNA).

**Parameters**:
- **Jobs**: Select two or more completed analysis jobs to group together
- **Sample description**: Upload a TSV file containing sample metadata (conditions, replicates, covariates)
- **De novo mode**: Optionally ignore pre-built sample descriptions and define groups manually

**How it works**: The sample group job collects the count matrices from all selected individual jobs, verifies they are compatible (same job type, same reference), and produces a combined count matrix with sample metadata ready for differential expression analysis.

**Output**: Combined count matrix, sample metadata, and a list of valid sample codes.

**Metadata TSV format**: Download a template from the Templates page. The file should contain at least the following columns:
- `sample`: Sample identifier (must match the sample code from individual jobs)
- `condition`: Experimental condition (e.g., "treated", "control")

Additional columns for covariates (batch, sex, age, etc.) can be included.

---

### Differential Expression Analysis

**Purpose**: Identify genes or transcripts that are significantly differentially expressed between experimental conditions.

**Input**: A completed Sample Group job.

**Statistical Methods**:

| Method | Description | Best For |
|--------|-------------|----------|
| DESeq2 | Negative binomial GLM with shrinkage estimation | Small sample sizes (3-5 per group), robust default choice |
| edgeR | Empirical Bayes with negative binomial models | Flexible, good for complex experimental designs |
| limma-voom | Linear models with precision weights | Large sample sizes, fastest computation |

You can select one or more methods. When multiple methods are selected, results can be combined using meta-analysis.

**Parameters**:
- **Source sample group**: The sample group to analyze
- **Sample type**: Gene-level or transcript-level expression
- **Statistical methods**: One or more of DESeq2, edgeR, limma-voom
- **Contrasts**: Define pairwise comparisons (e.g., Treated vs. Control)
- **Normalization**: DESeq2 or edgeR normalization (TMM, RLE, upper-quartile, etc.)
- **P-value cutoff**: Significance threshold (default: 0.05)
- **Multiple testing correction**: BH (Benjamini-Hochberg), Bonferroni, q-value, and others
- **Filtering options**:
  - Expression filter: Remove lowly expressed genes
  - Presence filter: Require minimum counts in a fraction of samples
  - Length filter: Remove short transcripts

**Output**: Lists of differentially expressed genes with log-fold changes, p-values, and adjusted p-values. QC plots including MA plots, volcano plots, PCA, heatmaps, and dispersion estimates.

---

### Pathway Analysis

**Purpose**: Identify biological pathways and Gene Ontology terms enriched among differentially expressed genes.

**Input**: A completed Differential Expression Analysis job.

**Analysis Components**:

| Component | Tool | Description |
|-----------|------|-------------|
| KEGG Pathway Analysis | MITHrIL2 | Topology-aware pathway analysis incorporating pathway structure and gene interactions |
| GO Enrichment | clusterProfiler | Over-representation analysis for Biological Process (BP), Molecular Function (MF), and Cellular Component (CC) |
| GSEA | fgsea / clusterProfiler | Gene Set Enrichment Analysis using ranked gene lists |

**Supported Organisms**:

| Code | Organism |
|------|----------|
| `hsa` | Human |
| `mmu` | Mouse |
| `rno` | Rat |

**Parameters**:
- **DEGs analysis**: Select the differential expression job to use as input
- **DEG filtering**:
  - P-value cutoff (default: 0.05)
  - Use FDR-adjusted p-values (default: yes)
  - Log-fold change threshold (default: 0, meaning no LFC filter)
- **Pathway analysis**:
  - Organism (hsa, mmu, or rno)
  - P-value cutoff (default: 0.05)
  - Use FDR-adjusted p-values (default: yes)
- **GO enrichment**: Enable/disable, select ontology (BP, MF, CC, or ALL)
- **GSEA**: Enable/disable

**Output**: MITHrIL2 pathway results with accumulator and perturbation scores, GO term enrichment tables with dot plots, GSEA ridge plots and individual enrichment plots, enrichment maps showing GO term relationships.

---

## Step-by-Step Walkthrough: Complete RNA-seq Experiment

This walkthrough demonstrates a complete analysis from raw FASTQ files to pathway results, using a paired-end human RNA-seq experiment comparing treated and control conditions with 3 replicates each.

### Step 1: Install Reference Genomes

1. Navigate to **Server Admin**.
2. Install `Human_hg38_genome` and `Human_hg38_transcriptome`.
3. Wait for installation to complete (monitor progress on the admin page).

### Step 2: Run Long RNA Analysis for Each Sample

For each of the 6 samples (3 treated, 3 control):

1. Navigate to **Analysis** and select **Long RNA**.
2. **Name**: Enter a descriptive name (e.g., "Treated_Rep1").
3. **Sample Code**: Enter a unique code (e.g., "treated_1"). This code links the sample to metadata later.
4. **Input Configuration**:
   - Input type: Paired-end
   - Input format: FASTQ
   - Use the file browser to select the forward (R1) and reverse (R2) FASTQ files
5. **Algorithm**: Select STAR (or HISAT2 for lower memory usage, or Salmon for speed).
6. **Reference**: Select Human hg38 genome and annotation.
7. **Trim Galore**: Enable with default settings (quality=20, min length=14).
8. **Resources**: Adjust threads and memory to match your server capacity.
9. **Submit** the job.

Repeat for all 6 samples. Jobs run sequentially through the queue.

### Step 3: Create a Sample Group

1. Navigate to **Analysis** and select **Sample Group**.
2. **Name**: Enter a name (e.g., "Treated_vs_Control").
3. **Select jobs**: Choose all 6 completed Long RNA jobs.
4. **Upload metadata**: Prepare a TSV file with sample codes and conditions:

```
sample      condition
treated_1   treated
treated_2   treated
treated_3   treated
control_1   control
control_2   control
control_3   control
```

5. **Submit** the job.

### Step 4: Run Differential Expression Analysis

1. Navigate to **Analysis** and select **Differential Expression**.
2. **Name**: Enter a name (e.g., "DEGs_Treated_vs_Control").
3. **Source sample group**: Select the sample group from Step 3.
4. **Sample type**: Gene (or Transcript if transcript-level analysis is desired).
5. **Methods**: Select DESeq2 (recommended default). Optionally add edgeR or limma-voom.
6. **Contrasts**: Add a contrast with Case = "treated" and Control = "control".
7. **P-value cutoff**: 0.05 (or adjust as needed).
8. **Normalization**: DESeq2 (default).
9. **Submit** the job.

### Step 5: Run Pathway Analysis

1. Navigate to **Analysis** and select **Pathway Analysis**.
2. **Name**: Enter a name (e.g., "Pathways_Treated_vs_Control").
3. **DEGs analysis**: Select the differential expression job from Step 4.
4. **Organism**: Human (hsa).
5. **DEG filtering**: P-value cutoff 0.05, use FDR, LFC threshold 0 (or set to 1 for stricter filtering).
6. **Enable**: GO enrichment (ALL ontologies) and GSEA.
7. **Submit** the job.

### Step 6: Review Results

1. Navigate to **Jobs** to see all completed jobs.
2. Click on a job to view its details, log output, and status.
3. Click **View Report** to open the interactive HTML report in a new tab.
4. Reports can be downloaded for offline viewing or sharing.

---

## Understanding Results

### Long RNA / Small RNA / CircRNA Analysis Output

- **Count table**: Raw expression counts per gene/transcript/circRNA per sample
- **Harmonized count table**: Standardized format with gene identifiers mapped to common nomenclature
- **Alignment statistics**: Total reads, mapped reads, mapping rate, uniquely mapped reads
- **Trimming statistics**: Reads before/after trimming, adapter content, quality scores

### Differential Expression Results

- **DEG table**: Each row is a gene with columns for log-fold change, p-value, adjusted p-value, base mean expression
- **Significant DEGs**: Genes passing both the p-value and log-fold change thresholds
- **QC Plots**:
  - **PCA plot**: Shows sample clustering and separation between conditions
  - **MA plot**: Log-fold change vs. mean expression; significant genes are highlighted
  - **Volcano plot**: Statistical significance vs. fold change magnitude
  - **Heatmap**: Expression patterns of top DEGs across all samples
  - **Dispersion plot**: Estimated vs. fitted dispersion (DESeq2)
  - **BCV plot**: Biological coefficient of variation (edgeR)

### Pathway Analysis Results

- **MITHrIL2 KEGG pathways**: Ranked list of impacted pathways with accumulator scores (overall impact) and perturbation scores (direction of effect). Heatmaps show pathway-level patterns.
- **GO enrichment**: Over-represented GO terms with gene ratios, p-values, and counts. Dot plots visualize the top enriched terms per ontology. Enrichment maps show relationships between GO terms.
- **GSEA**: Ranked gene list analysis without arbitrary cutoffs. Ridge plots show enrichment score distributions. Individual enrichment plots show the running enrichment score for top gene sets.

### Interpreting Key Metrics

| Metric | Interpretation |
|--------|---------------|
| log2FoldChange | Positive = upregulated in case vs. control; negative = downregulated |
| padj / FDR | Adjusted p-value accounting for multiple testing; < 0.05 is typically significant |
| baseMean | Average expression across all samples; very low values may be unreliable |
| NES (GSEA) | Normalized enrichment score; positive = enriched in upregulated genes |
| GeneRatio (GO) | Fraction of DEGs annotated to a GO term relative to total DEGs tested |

---

## Resource Management

The Analysis Wizard includes a Resource Configuration panel with interactive sliders for CPU threads and memory (RAM in GB).

### Color-Coded Recommendations

- **Green zone**: Recommended allocation for the selected workflow. Provides good performance without overcommitting resources.
- **Yellow zone**: Acceptable but may result in slower processing or leave less room for other tasks.
- **Red zone**: Exceeds available system capacity. The job may fail with out-of-memory errors or degrade server performance.

### Typical Resource Requirements

| Analysis Type | CPU Threads | RAM |
|---------------|-------------|-----|
| Long RNA (STAR) | 8-16 | 30-32 GB |
| Long RNA (HISAT2) | 8-16 | 8-16 GB |
| Long RNA (Salmon) | 8-16 | 8-12 GB |
| Small RNA (BWA) | 4-8 | 4-8 GB |
| Circular RNA (CIRI2) | 4-8 | 8-16 GB |
| Differential Expression | 1-4 | 4-8 GB |
| Pathway Analysis | 1 | 4-8 GB |

### Tips

- Run only one STAR alignment at a time on machines with limited RAM.
- Salmon is significantly faster than STAR or HISAT2 and uses less memory.
- Differential expression and pathway analysis are computationally light and can run concurrently with alignments.

---

## Metadata Templates

Download pre-formatted TSV template files from the **Templates** page in the web interface or via the API.

| Template | Purpose |
|----------|---------|
| `metadata_single_end.tsv` | Sample metadata for single-end sequencing experiments |
| `metadata_paired_end.tsv` | Sample metadata for paired-end sequencing experiments |
| `sample_groups.tsv` | Sample group definitions mapping samples to conditions |
| `contrasts.tsv` | Contrast definitions specifying case vs. control comparisons |

Fill in the templates with your experiment-specific information and upload them during the appropriate analysis step.

---

## Frequently Asked Questions

### What input file formats are supported?

RNAdetector accepts FASTQ files (`.fastq`, `.fq`, `.fastq.gz`, `.fq.gz`) and BAM files (`.bam`). FASTQ files can be gzip-compressed. For paired-end data, provide separate R1 and R2 files.

### Can I use a custom genome not in the pre-built packages?

Yes. Navigate to the **References** page and upload your own genome FASTA, transcriptome FASTA, and GTF annotation files. RNAdetector will build the required aligner indexes automatically.

### How long does an analysis take?

Typical processing times depend on sequencing depth, organism, and available resources:

| Analysis | Typical Time |
|----------|-------------|
| Trim Galore (30M reads) | 5-15 minutes |
| STAR alignment (30M reads, human) | 15-30 minutes |
| HISAT2 alignment (30M reads, human) | 20-40 minutes |
| Salmon quantification (30M reads) | 5-10 minutes |
| Differential expression (6 samples) | 5-15 minutes |
| Pathway analysis | 10-30 minutes |

### Can I run multiple analyses simultaneously?

Yes. Jobs are queued and processed by the Beanstalkd queue worker. However, be cautious about running multiple memory-intensive jobs (e.g., STAR alignments) simultaneously, as they may exceed available RAM.

### What should I do if a job fails?

1. Check the job log by clicking on the job in the **Jobs** page and expanding the log panel.
2. Common causes include: insufficient memory (especially for STAR), missing reference genome, or corrupted input files.
3. Fix the issue and create a new job. Failed jobs cannot be resubmitted.

### How do I download results?

Reports are viewable in the browser via the Report Viewer page. The underlying data files (count tables, BAM files, etc.) are stored in the job directory on the server and can be accessed through the file browser or directly from the server filesystem.

### What organisms are supported for pathway analysis?

Pathway analysis (MITHrIL2 KEGG, GO enrichment, GSEA) currently supports Human (hsa), Mouse (mmu), and Rat (rno). The sequencing analysis itself (alignment and counting) supports any organism with a reference genome.

### Do I need to trim my reads?

Trim Galore is recommended for most datasets, especially for:
- **Small RNA-seq**: Adapter read-through is very common due to short insert sizes
- **Low-quality data**: Removing low-quality bases improves alignment rates
- **Data with adapter contamination**: Trim Galore auto-detects and removes common adapters

For high-quality data from modern sequencers, trimming may have a minimal effect but is still generally recommended.

### Can multiple users share the same server?

Yes. The admin can create additional user accounts. Each user sees only their own jobs unless they have admin privileges. All users share the same installed reference genomes and server resources.

### How are reports generated?

Reports are generated using R Markdown and rendered to HTML. They include all analysis code (visible via code folding), interactive plots (using plotly and DT), and a BibTeX bibliography automatically generated from the tools used in the analysis. Reports are styled with a dark theme consistent with the web interface.
