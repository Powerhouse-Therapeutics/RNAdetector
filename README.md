# RNAdetector

A comprehensive RNA-Seq data analysis platform with a modern web interface, server-side processing, and automated bioinformatics pipelines.

## Overview

RNAdetector provides end-to-end RNA-Seq analysis including quality control, read alignment, quantification, normalization, differential expression, and pathway analysis. It supports multiple RNA classes (mRNA, lncRNA, miRNA, piRNA, snoRNA, tRF, circRNA) and produces publication-ready HTML reports with Materials and Methods text, interactive plots, and BibTeX citations.

The platform runs as a Docker-based server controlled through a React web client via a REST API with JWT authentication.

---

## Table of Contents

- [Supported Analysis Pipelines](#supported-analysis-pipelines)
- [Supported Organisms](#supported-organisms)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Reports](#reports)
- [Metadata Templates](#metadata-templates)
- [Tech Stack](#tech-stack)
- [Development Setup](#development-setup)
- [Directory Structure](#directory-structure)
- [License](#license)

---

## Supported Analysis Pipelines

### Long RNA-seq (mRNA, lncRNA)

Alignment and quantification of protein-coding and long non-coding RNAs. Supports three alignment/quantification strategies:

- **STAR** -- Splice-aware genome alignment followed by featureCounts or HTSeq counting
- **HISAT2** -- Splice-aware genome alignment followed by featureCounts or HTSeq counting
- **Salmon** -- Alignment-free transcript quantification using a transcriptome index

Inputs: FASTQ (single-end or paired-end) or BAM files. Optional quality trimming with Trim Galore.

### Small RNA-seq (miRNA, piRNA, snoRNA, tRF, tsRNA)

Alignment and quantification of small non-coding RNAs using BWA alignment followed by featureCounts. Designed for reads typically 18-35 nucleotides in length.

Inputs: FASTQ (single-end or paired-end) or BAM files. Optional adapter and quality trimming.

### Circular RNA (circRNA)

Detection and quantification of circular RNAs using CIRI2 (or optionally CIRIquant). Requires BWA alignment to a reference genome with a GTF annotation.

Inputs: FASTQ (paired-end recommended) or BAM files. Optionally provide a BED annotation of known circRNA junctions for CIRIquant mode.

### Sample Group Management

Combines multiple individual analysis jobs (of the same type) into a single sample group for downstream comparison. Upload a sample metadata TSV file describing conditions, replicates, and covariates.

### Differential Expression Analysis (DEGs)

Statistical identification of differentially expressed genes or transcripts across conditions. Three methods available:

- **DESeq2** -- Negative binomial generalized linear models with shrinkage estimation
- **edgeR** -- Empirical Bayes estimation with negative binomial models (classic or GLM mode)
- **limma-voom** -- Linear models with precision weights from the mean-variance relationship

Supports multiple contrast definitions, several normalization strategies (TMM, RLE, upper-quartile), flexible filtering criteria, and multiple testing correction methods (BH, Bonferroni, q-value, and others). Meta-analysis of multiple DEG methods is also supported.

### Pathway Analysis

Functional enrichment analysis of differentially expressed genes. Includes:

- **MITHrIL2** -- KEGG pathway topology-aware analysis with accumulator and perturbation scores
- **GO Enrichment** -- Gene Ontology term over-representation analysis for Biological Process, Molecular Function, and Cellular Component
- **GSEA** -- Gene Set Enrichment Analysis with ridge plots and individual enrichment plots for top gene sets

Supported organisms for pathway analysis: Human (hsa), Mouse (mmu), Rat (rno).

---

## Supported Organisms

Pre-built genome and transcriptome packages:

| Organism | Genome Builds | Aligners Indexed |
|----------|--------------|-----------------|
| Human | hg19, hg38 | STAR, HISAT2, BWA, Salmon |
| Mouse | mm10, mm39 | STAR, HISAT2, BWA, Salmon |

Custom organisms can be added by uploading a genome FASTA, transcriptome, and GTF annotation files through the web interface.

---

## Architecture

```
RNAdetector/
  client/          React web application (Vite + React 18 + MUI v6)
  WS/              Laravel PHP backend (REST API server)
  scripts/         Bioinformatics pipeline scripts (Bash, R)
  scripts/base/    Docker build files
  docs/            Documentation
```

### Component Diagram

```
+-----------------------+          +----------------------------+
|   Web Client (React)  |  <---->  |   Laravel API (PHP 7.4)    |
|   Vite + MUI v6       |  REST    |   JWT Authentication       |
|   Port 5173 (dev)     |  /api/*  |   Port 9898                |
+-----------------------+          +----------------------------+
                                          |
                                   +------+------+
                                   |             |
                              +----v----+   +----v----+
                              | MySQL   |   | Queue   |
                              | Database|   | Worker  |
                              +---------+   | (Beanstalkd)
                                            +----+----+
                                                 |
                                          +------v------+
                                          | Pipeline    |
                                          | Scripts     |
                                          | (Bash / R)  |
                                          +-------------+
```

- **Server**: Docker container running Apache, MySQL, PHP, R, Python, and all bioinformatics tools
- **Client**: Modern React SPA connecting to the server via REST API with JWT authentication
- **Pipeline**: Bash and R scripts orchestrated by the Laravel queue worker via Beanstalkd
- **Job Lifecycle**: Ready -> Queued -> Processing -> Completed (or Failed)

---

## Quick Start

### 1. Configure Environment

```bash
cp .env.example .env
# Edit .env -- at minimum set ADMIN_EMAIL and ADMIN_PASSWORD
```

### 2. Run the Docker Container

```bash
docker run -d \
  --name rnadetector \
  -p 9898:80 \
  -v /path/to/your/data:/data \
  -v rnadetector-storage:/rnadetector/ws/storage/app/ \
  --env-file .env \
  alaimos/rnadetector:latest
```

### 3. Access the Web Interface

Open `http://your-server:9898` in a web browser and log in with the admin credentials configured in `.env`.

### 4. Install Reference Genomes

Navigate to the **Server Admin** page and install the genome packages required for your organism. Alternatively, set `AUTO_INSTALL_PACKAGES` in `.env` to install them automatically on first boot.

### 5. Run an Analysis

Navigate to **Analysis**, select a pipeline type (e.g., Long RNA), configure your input files, reference genome, and parameters, then submit the job.

For detailed installation instructions, see [docs/RNAdetector_install.md](docs/RNAdetector_install.md).
For a user guide, see [docs/RNAdetector_intro.md](docs/RNAdetector_intro.md).

---

## Environment Variables

Configure these in `.env` or pass them as Docker environment variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@admin` | Admin account email for login |
| `ADMIN_PASSWORD` | `password123` | Admin account password (change this) |
| `DB_DATABASE` | `rnadetector` | Internal MySQL database name |
| `DB_USERNAME` | `rnadetector` | Internal MySQL username |
| `DB_PASSWORD` | *(auto-generated)* | Internal MySQL password |
| `AUTO_INSTALL_PACKAGES` | *(empty)* | Comma-separated genome packages to install on first boot |
| `BROWSABLE_VOLUMES` | `/data:Data Files` | Comma-separated `path:label` pairs for the file browser |
| `APP_DEBUG` | `false` | Enable debug mode (set to `true` for troubleshooting only) |

### Available Genome Packages

```
Human_hg19_genome               Human_hg38_genome
Human_hg19_transcriptome        Human_hg38_transcriptome
Human_hg19_small_ncRNAs         Human_hg38_small_ncRNAs
Human_hg19_circRNAs             Human_hg38_circRNAs
Mouse_mm10_genome               Mouse_mm39_genome
Mouse_mm10_transcriptome        Mouse_mm39_transcriptome
Mouse_mm10_smallRNA             Mouse_mm39_smallRNA
```

---

## API Reference

All API endpoints are under `/api/`. Authenticated endpoints require a JWT bearer token obtained from the login endpoint.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Email/password login, returns JWT token |
| `POST` | `/api/auth/refresh` | Refresh an expired token |
| `POST` | `/api/auth/logout` | Invalidate the current token |
| `GET` | `/api/auth/me` | Return current user information |

### Jobs (Analysis Management)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jobs` | List jobs (paginated, filterable by `deep_type` and `completed`) |
| `POST` | `/api/jobs` | Create a new job (requires `name`, `type`, optional `parameters`) |
| `GET` | `/api/jobs/{id}` | Get job details including status, parameters, and output |
| `PUT` | `/api/jobs/{id}` | Update job parameters (only if status is `ready`) |
| `DELETE` | `/api/jobs/{id}` | Delete a job and its files |
| `GET` | `/api/jobs/{id}/submit` | Submit a job for execution |
| `ANY` | `/api/jobs/{id}/upload/{path}` | Upload files to a job directory (TUS protocol) |

### Job Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/job-types` | List all available job types with descriptions |
| `GET` | `/api/job-types/{type}` | Get parameters and output spec for a job type |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jobs/{id}/report` | Retrieve the HTML report for a completed job |
| `GET` | `/api/jobs/{id}/report/status` | Check if a report is available and its metadata |
| `POST` | `/api/jobs/{id}/report/generate` | Trigger report generation for a completed job |

### File Browser

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/files/volumes` | List configured browsable data volumes |
| `GET` | `/api/files/browse` | Browse a directory (query param: `path`) |
| `GET` | `/api/files/search` | Search files by pattern (query params: `path`, `pattern`) |

### References and Annotations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/references` | List installed reference genomes |
| `GET` | `/api/references/packages` | List downloadable genome packages |
| `GET` | `/api/annotations` | List installed annotations |

### Server Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/server/status` | Server health, CPU/RAM/disk usage, queue statistics |
| `GET` | `/api/server/packages` | List available genome packages (not yet installed) |
| `POST` | `/api/server/packages/{name}/install` | Install a genome package |
| `GET` | `/api/server/packages/{name}/status` | Check installation progress |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | List available metadata template files |
| `GET` | `/api/templates/{name}/download` | Download a template file |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ping` | Health check (unauthenticated) |
| `GET` | `/api/auth-ping` | Authenticated health check |
| `GET` | `/api/sys-info` | System resource information (CPU, RAM) |

---

## Reports

Each analysis generates an HTML report containing:

- **Materials and Methods** -- Publication-ready text with tool citations
- **Reproducible R Code** -- All R code visible with `code_folding: show`
- **BibTeX Bibliography** -- Auto-generated references for all tools used
- **QC Metrics** -- Read counts, mapping rates, trimming statistics
- **Interactive Tables and Plots** -- Filterable, sortable result tables
- **Session Info** -- Full R session information for reproducibility

### Pathway Analysis Reports

- MITHrIL2 KEGG pathway topology analysis with heatmaps
- GO term enrichment (Biological Process, Molecular Function, Cellular Component) with dot plots
- GSEA with ridge plots and individual enrichment plots for top pathways
- Enrichment maps for GO term relationships

---

## Metadata Templates

Download pre-formatted TSV templates from the web UI or API:

| Template | Description |
|----------|-------------|
| `metadata_single_end.tsv` | Sample metadata for single-end experiments |
| `metadata_paired_end.tsv` | Sample metadata for paired-end experiments |
| `sample_groups.tsv` | Sample group definitions with conditions |
| `contrasts.tsv` | Contrast definitions for differential expression |

---

## Tech Stack

### Server

| Component | Technology |
|-----------|-----------|
| Runtime | PHP 7.4, R 4.x, Python 3 |
| Framework | Laravel 7 |
| Database | MySQL |
| Queue | Beanstalkd |
| Web Server | Apache 2 |
| Container | Docker (Ubuntu 18.04 base) |

### Bioinformatics Tools

| Category | Tools |
|----------|-------|
| Alignment | STAR, HISAT2, BWA, Salmon |
| Counting | featureCounts, HTSeq, StringTie |
| QC/Trimming | Trim Galore, FastQC |
| Utilities | SAMtools, BEDTools |
| Circular RNA | CIRI2, CIRIquant |
| Differential Expression | DESeq2, edgeR, limma-voom |
| Pathway/Enrichment | MITHrIL2, clusterProfiler, enrichplot, fgsea |

### Client

| Component | Technology |
|-----------|-----------|
| Framework | React 18 with TypeScript |
| Build Tool | Vite 5 |
| UI Library | MUI v6 (Material UI) with dark theme |
| State Management | Zustand |
| HTTP Client | Axios with JWT interceptors |

---

## Development Setup

### Prerequisites

- Docker (for running the server)
- Node.js 18+ and npm (for the client)
- PHP 7.4 and Composer (for backend development without Docker)

### Backend Development

```bash
cd WS
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=9898
```

The backend expects MySQL, Beanstalkd, and the bioinformatics tools to be available. For most development purposes, running the full Docker container is recommended.

### Frontend Development

```bash
cd client
npm install
npm run dev      # Development server with HMR at http://localhost:5173
npm run build    # Production build to dist/
```

The Vite dev server proxies API requests to `http://localhost:9898` by default. Override with the `VITE_API_URL` environment variable.

### Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Server status overview and quick actions |
| `/analysis/:type` | Analysis Wizard | Configure and submit analysis jobs |
| `/jobs` | Jobs | List, monitor, and manage all analysis jobs |
| `/files` | File Browser | Browse and select server-side data files |
| `/references` | References | View installed reference genomes |
| `/annotations` | Annotations | View installed genome annotations |
| `/templates` | Templates | Download metadata template files |
| `/admin` | Server Admin | System status, package management |
| `/jobs/:jobId/report` | Report Viewer | View generated HTML reports |
| `/settings` | Settings | User settings |
| `/docs` | Documentation | In-app documentation |

---

## Directory Structure

```
RNAdetector/
|-- .env.example                 # Environment variable template
|-- README.md                    # This file
|-- docs/                        # Documentation
|   |-- RNAdetector_install.md   # Installation guide
|   |-- RNAdetector_intro.md     # User guide and walkthrough
|
|-- client/                      # React frontend application
|   |-- src/
|   |   |-- api/                 # API client functions (Axios)
|   |   |-- components/          # Reusable UI components
|   |   |-- pages/               # Page-level components
|   |   |-- stores/              # Zustand state stores
|   |   |-- types/               # TypeScript type definitions
|   |   |-- App.tsx              # Route definitions
|   |   |-- main.tsx             # Application entry point
|   |-- vite.config.ts           # Vite configuration
|   |-- package.json
|
|-- WS/                          # Laravel backend application
|   |-- app/
|   |   |-- Http/Controllers/Api/  # REST API controllers
|   |   |-- Jobs/Types/            # Job type definitions (one per pipeline)
|   |   |-- Models/                # Eloquent models (Job, User, Reference, etc.)
|   |-- routes/api.php             # API route definitions
|   |-- config/                    # Laravel configuration
|   |-- database/                  # Migrations and seeds
|
|-- scripts/                     # Bioinformatics pipeline scripts
|   |-- star.sh                  # STAR alignment
|   |-- hisat.sh                 # HISAT2 alignment
|   |-- bwa.bash                 # BWA alignment
|   |-- salmon_counting.sh       # Salmon quantification
|   |-- featurecounts.bash       # featureCounts counting
|   |-- htseqcount.bash          # HTSeq counting
|   |-- trim_galore.bash         # Quality trimming
|   |-- ciri.bash                # CIRI2 circRNA detection
|   |-- ciri_quant.sh            # CIRIquant quantification
|   |-- de_analysis.R            # Differential expression analysis
|   |-- pathway_analysis.R       # Pathway and enrichment analysis
|   |-- generate_report.R        # HTML report generation
|   |-- harmonize.R              # Count matrix harmonization
|   |-- compose.R                # Sample group composition
|   |-- base/                    # Docker build files
```

---

## Resource Configuration

Default analysis settings: **16 threads, 32 GB RAM**. The server reports available resources via the `/api/sys-info` endpoint. The web UI provides interactive sliders with color-coded zones:

- **Green** -- Recommended allocation for the workflow
- **Yellow** -- Acceptable but may be slower or use more resources than ideal
- **Red** -- Exceeds available capacity; job may fail or cause system instability

---

## License

This project is licensed under the MIT License.
