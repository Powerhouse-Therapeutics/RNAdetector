# RNAdetector

A comprehensive RNA-Seq data analysis platform with a modern web interface, server-side processing, and automated pipeline management.

## Overview

RNAdetector provides end-to-end RNA-Seq analysis including quantification, normalization, differential expression, pathway analysis (KEGG, GO, GSEA), and support for multiple RNA classes. It runs as a Docker-based server with a React web client for remote control.

### Supported Analysis Types

- **RNA-seq (long RNA)** -- mRNAs, lncRNAs with STAR, HISAT2, or Salmon alignment/quantification
- **Small RNA-seq** -- miRNAs, piRNAs, snoRNAs, tRFs/tsRNAs with BWA alignment
- **Circular RNA** -- circRNA detection via CIRI2/CIRIquant
- **Differential Expression** -- DESeq2, edgeR, limma-voom with comprehensive QC reports
- **Pathway Analysis** -- MITHrIL2 KEGG pathways, GO term enrichment (BP/MF/CC), and GSEA with enrichment plots
- **Sample Group Management** -- Group samples for multi-condition comparisons

### Supported Organisms

Pre-built genome and transcriptome packages:

| Organism | Genome Builds | Aligners Indexed |
|----------|--------------|-----------------|
| Human | hg19, hg38 | STAR, HISAT2, BWA, Salmon |
| Mouse | mm10, mm39 | STAR, HISAT2, BWA, Salmon |

Custom organisms can be added by uploading genome FASTA, transcriptome, and annotation files.

## Architecture

```
client/          React web app (Vite + React 18 + MUI v6)
WS/              Laravel PHP backend (API server)
scripts/         Bioinformatics pipeline scripts (Bash, R)
scripts/base/    Docker build files
```

- **Server**: Docker container running Apache, MySQL, PHP, R, and all bioinformatics tools
- **Client**: Modern React SPA connecting to the server via REST API with JWT authentication
- **Pipeline**: Bash/R scripts orchestrated by Laravel queue workers

## Quick Start

### Server Deployment

```bash
# Pull and run the Docker container
docker run -d \
  --name rnadetector \
  -p 9898:80 \
  -v /path/to/data:/data \
  -v /path/to/storage:/rnadetector/ws/storage/app/ \
  -e AUTO_INSTALL_PACKAGES="Mouse_mm10_genome,Mouse_mm10_transcriptome" \
  -e ADMIN_EMAIL="admin@yourdomain.com" \
  -e ADMIN_PASSWORD="your-secure-password" \
  -e BROWSABLE_VOLUMES="/data:Sequencing Data" \
  alaimos/rnadetector:latest
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_INSTALL_PACKAGES` | *(empty)* | Comma-separated package names to auto-install on first boot |
| `ADMIN_EMAIL` | `admin@admin` | Default admin account email |
| `ADMIN_PASSWORD` | `password123` | Default admin account password |
| `BROWSABLE_VOLUMES` | `/data:Data Files` | Comma-separated `path:label` pairs for file browser |

### Client Setup

```bash
cd client
npm install
npm run dev
```

The client dev server proxies API requests to `http://localhost:9898` by default. Configure via `VITE_API_URL` environment variable.

### Login

Navigate to `http://localhost:5173` (dev) or your deployed URL. Log in with the admin credentials configured above.

## API Reference

### Authentication

```
POST /api/auth/login      # Email/password login, returns JWT
POST /api/auth/refresh    # Refresh expired token
POST /api/auth/logout     # Invalidate token
GET  /api/auth/me         # Current user info
```

### File Browser

```
GET /api/files/volumes    # List configured data volumes
GET /api/files/browse     # Browse directory (path param)
GET /api/files/search     # Search files (path, pattern params)
```

### Jobs

```
GET    /api/jobs           # List jobs (paginated)
POST   /api/jobs           # Create job
GET    /api/jobs/{id}      # Get job details
DELETE /api/jobs/{id}      # Delete job
GET    /api/jobs/{id}/submit  # Submit job for execution
```

### Server Management

```
GET  /api/server/status              # Server health and resources
GET  /api/server/packages            # List available packages
POST /api/server/packages/{name}/install  # Install a package
GET  /api/server/packages/{name}/status   # Installation progress
```

### Templates

```
GET /api/templates                  # List available templates
GET /api/templates/{name}/download  # Download template file
```

### References & Annotations

```
GET /api/references          # List reference genomes
GET /api/references/packages # List downloadable packages
GET /api/annotations         # List annotations
```

## Resource Configuration

Default analysis settings: **16 threads, 32 GB RAM**. The server reports available resources and per-workflow recommendations via the `/api/sys-info` endpoint. The web UI provides interactive sliders with color-coded zones (green=recommended, yellow=acceptable, red=exceeds capacity).

## Reports

Each analysis generates an HTML report with:

- **Materials and Methods** -- Publication-ready text with tool citations
- **All R code visible** -- Reproducible with `code_folding: show`
- **BibTeX bibliography** -- Auto-generated references for all tools used
- **QC metrics** -- Read counts, mapping rates, trimming statistics
- **Interactive tables and plots** -- Filterable, sortable result tables
- **Session info** -- Full R session information for reproducibility
- **Dark theme** -- Consistent with the web UI aesthetic

### Pathway Analysis Reports Include

- MITHrIL2 KEGG pathway topology analysis with heatmaps
- GO term enrichment (Biological Process, Molecular Function, Cellular Component) with dot plots
- GSEA with ridge plots and individual enrichment plots for top pathways
- Enrichment maps for GO term relationships

## Metadata Templates

Download pre-formatted TSV templates from the web UI or API:

- `metadata_single_end.tsv` -- Single-end experiment sample metadata
- `metadata_paired_end.tsv` -- Paired-end experiment sample metadata
- `sample_groups.tsv` -- Sample group definitions
- `contrasts.tsv` -- Contrast definitions for differential expression

## Tech Stack

### Server
- **Runtime**: PHP 7.4, R 4.x, Python 3
- **Framework**: Laravel 7
- **Database**: MySQL
- **Queue**: Beanstalkd
- **Web Server**: Apache 2

### Bioinformatics Tools
STAR, HISAT2, BWA, Salmon, StringTie, featureCounts, HTSeq, Trim Galore, FastQC, SAMtools, BEDTools, CIRI2, CIRIquant, DESeq2, edgeR, limma, clusterProfiler, enrichplot, fgsea, MITHrIL2

### Client
- **Framework**: React 18 with TypeScript
- **Build**: Vite 5
- **UI**: MUI v6 (Material UI) with dark futuristic theme
- **State**: Zustand
- **HTTP**: Axios with JWT interceptors

## Development

### Backend

```bash
cd WS
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=9898
```

### Frontend

```bash
cd client
npm install
npm run dev      # Development server with HMR
npm run build    # Production build
```

## License

This project is licensed under the MIT License.
