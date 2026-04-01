# RNAdetector Backend (WS)

Laravel PHP backend providing the REST API, job queue management, and bioinformatics pipeline orchestration for RNAdetector.

## Structure

```
app/
  Console/Commands/     Artisan commands (AutoInstallPackages, FirstBoot, etc.)
  Http/
    Controllers/Api/    REST API controllers
    Middleware/          JWT auth, CSRF, etc.
    Resources/           API resource transformers
  Jobs/
    Types/              Analysis job type implementations
      Traits/           Shared traits (alignment, counting, parameters)
    InstallPackage.php  Background package installation
    Request.php         Job execution dispatcher
  Models/              Eloquent models (User, Job, Reference, Annotation)
  Packages.php         Reference genome package manager
  SystemInfo.php       Server resource monitoring
  Utils/
    JwtUtil.php        JWT token encode/decode
config/
  rnadetector.php      Pipeline paths, browsable volumes, resource defaults
database/
  seeds/               Database seeders including DefaultAdminSeeder
routes/
  api.php              All API route definitions
resources/
  templates/           Downloadable TSV templates for metadata
```

## API Endpoints

### Public
- `GET /api/ping` -- Health check
- `POST /api/auth/login` -- JWT authentication
- `POST /api/auth/refresh` -- Token refresh

### Authenticated (Bearer token required)
- `GET /api/auth/me` -- Current user
- `POST /api/auth/logout` -- Invalidate token
- `GET /api/sys-info` -- Server resources and recommendations
- CRUD: `/api/jobs`, `/api/users`, `/api/references`, `/api/annotations`
- File browser: `/api/files/volumes`, `/api/files/browse`, `/api/files/search`
- Server admin: `/api/server/status`, `/api/server/packages`
- Templates: `/api/templates`, `/api/templates/{name}/download`

## Authentication

Two auth mechanisms are supported:
1. **JWT** (new) -- `POST /api/auth/login` returns access + refresh tokens
2. **API Token** (legacy) -- Static `api_token` field on user model

The JWT middleware (`JwtAuthenticate`) validates Bearer tokens using HMAC-SHA256 with the Laravel `APP_KEY` as secret.

## Job Types

| Type | Class | Description |
|------|-------|-------------|
| Long RNA | `LongRnaJobType` | STAR/HISAT2/Salmon alignment + featureCounts/HTSeq counting |
| Small RNA | `SmallRnaJobType` | BWA alignment for miRNA/piRNA/snoRNA |
| CircRNA | `CircRnaJobType` | CIRI2/CIRIquant circular RNA detection |
| DEGs | `DiffExprAnalysisJobType` | DESeq2/edgeR/limma differential expression |
| Pathway | `PathwayAnalysisJobType` | MITHrIL2 + GO enrichment + GSEA |
| Sample Group | `SamplesGroupJobType` | Group samples for comparison |

Default resources: 16 threads, 32 GB RAM (configurable per job).

## Setup

```bash
composer install
cp .env.docker .env   # or .env.example for development
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=9898
```

## Environment Variables

See `.env.docker` for all available configuration options including database, genome paths, admin credentials, and browsable volumes.
