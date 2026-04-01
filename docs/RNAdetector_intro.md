# RNAdetector Introduction

## What is RNAdetector?

RNAdetector is a comprehensive RNA-Seq data analysis platform that provides end-to-end processing from raw FASTQ files to publication-ready results. It runs as a Docker-based server controlled through a modern web interface.

## Key Capabilities

### Analysis Types

| Analysis | Input | Tools | Output |
|----------|-------|-------|--------|
| RNA-seq (long RNA) | FASTQ/BAM | STAR, HISAT2, Salmon, featureCounts, HTSeq | Gene/transcript expression counts |
| Small RNA-seq | FASTQ/BAM | BWA, featureCounts | miRNA, piRNA, snoRNA, tRF counts |
| Circular RNA | FASTQ/BAM | BWA, CIRI2, CIRIquant | CircRNA detection and quantification |
| Differential Expression | Count matrices | DESeq2, edgeR, limma-voom | DEG lists, QC plots, HTML reports |
| Pathway Analysis | DEG results | MITHrIL2, clusterProfiler, fgsea | KEGG pathways, GO terms, GSEA plots |

### Supported RNA Classes

**Protein-coding**: mRNAs

**Small non-coding RNAs**: miRNAs, piRNAs, snoRNAs, tRFs, tsRNAs

**Long non-coding RNAs**: lncRNAs, circRNAs

### Supported Organisms

Pre-built packages available for Human (hg19, hg38) and Mouse (mm10, mm39). Any organism with a sequenced genome can be added by uploading reference files.

## Architecture

RNAdetector uses a client-server architecture:

1. **Server** (Docker container): Runs all bioinformatics tools, manages the database, processes jobs via a queue system
2. **Web Client** (React SPA): Provides the user interface for configuring and monitoring analyses
3. **API** (REST + JWT): Connects client to server with secure token-based authentication

## Workflow

1. **Deploy** the Docker container on your server
2. **Login** to the web interface
3. **Browse** server files to locate your FASTQ data
4. **Configure** your analysis (select aligner, genome, parameters, resource allocation)
5. **Submit** the job to the processing queue
6. **Monitor** progress in the Jobs dashboard
7. **Review** results in interactive HTML reports with Materials & Methods
8. **Download** reports, count tables, and other outputs

## Reports

Every analysis generates comprehensive HTML reports including:

- Publication-ready Materials and Methods text
- All R code visible and reproducible
- BibTeX citations for every tool used
- Interactive plots and filterable data tables
- Session information for full reproducibility

## Resource Management

The server reports available CPU cores and RAM. The web interface provides interactive sliders to allocate resources per analysis, with color-coded recommendations for each workflow type. Defaults: 16 threads, 32 GB RAM.
