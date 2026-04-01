# RNAdetector Installation Guide

## Requirements

- **Docker** (version 20.10+)
- **4+ CPU cores** (16+ recommended)
- **16 GB RAM** minimum (32+ GB recommended)
- **100 GB disk space** minimum (500+ GB recommended for reference genomes and data)
- A modern web browser (Chrome, Firefox, Edge, Safari)

## Server Installation

### Option 1: Docker Run (Simple)

```bash
docker run -d \
  --name rnadetector \
  -p 9898:80 \
  -v /path/to/your/data:/data \
  -v rnadetector-storage:/rnadetector/ws/storage/app/ \
  -e AUTO_INSTALL_PACKAGES="Mouse_mm10_genome,Mouse_mm10_transcriptome" \
  -e ADMIN_EMAIL="admin@yourdomain.com" \
  -e ADMIN_PASSWORD="your-secure-password" \
  -e BROWSABLE_VOLUMES="/data:Sequencing Data" \
  alaimos/rnadetector:latest
```

### Option 2: Docker Compose (Recommended)

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  rnadetector:
    image: alaimos/rnadetector:latest
    container_name: rnadetector
    ports:
      - "9898:80"
    volumes:
      - rnadetector-storage:/rnadetector/ws/storage/app/
      - /path/to/sequencing/data:/data
      - /path/to/shared/results:/results
    environment:
      - AUTO_INSTALL_PACKAGES=Mouse_mm10_genome,Mouse_mm10_transcriptome
      - ADMIN_EMAIL=admin@yourdomain.com
      - ADMIN_PASSWORD=your-secure-password
      - BROWSABLE_VOLUMES=/data:Sequencing Data,/results:Analysis Results
    restart: unless-stopped

volumes:
  rnadetector-storage:
```

Start the server:

```bash
docker-compose up -d
```

### First Boot

On first startup, the container will:

1. Initialize the MySQL database
2. Create the admin user account
3. Auto-install configured reference genome packages (this may take 30-60 minutes for large genomes)
4. Start the web server and job queue

Monitor progress:

```bash
docker logs -f rnadetector
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@admin` | Admin account email for login |
| `ADMIN_PASSWORD` | `password123` | Admin account password |
| `AUTO_INSTALL_PACKAGES` | *(empty)* | Comma-separated genome packages to install on first boot |
| `BROWSABLE_VOLUMES` | `/data:Data Files` | Comma-separated `path:label` pairs for the file browser |
| `APP_DEBUG` | `false` | Enable debug mode (set to `true` for troubleshooting) |

### Available Genome Packages

| Package Name | Description | Size |
|-------------|-------------|------|
| `Human_hg19_genome` | Human hg19 with BWA/STAR/HISAT2 indexes | ~15 GB |
| `Human_hg19_transcriptome` | Human hg19 Salmon index (GENCODE v19) | ~2 GB |
| `Human_hg38_genome` | Human hg38 with BWA/STAR/HISAT2 indexes | ~15 GB |
| `Human_hg38_gencode_32_transcriptome` | Human hg38 Salmon index (GENCODE v32) | ~2 GB |
| `Mouse_mm10_genome` | Mouse mm10 with BWA/STAR/HISAT2 indexes | ~12 GB |
| `Mouse_mm10_transcriptome` | Mouse mm10 Salmon index (GENCODE vM23) | ~2 GB |
| `Mouse_mm39_genome` | Mouse mm39 with BWA/STAR/HISAT2 indexes | ~12 GB |
| `Mouse_mm39_transcriptome` | Mouse mm39 Salmon index (GENCODE vM32) | ~2 GB |

## Web Client Setup

### Production (Served by Server)

The Docker container serves the web client at `http://your-server:9898`. No additional setup needed.

### Development

```bash
cd client
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies API requests to `http://localhost:9898`.

## Data Volumes

Mount your sequencing data directories into the container so the file browser can access them:

```bash
-v /path/to/fastq/files:/data/fastq
-v /path/to/another/project:/data/project2
```

Configure which directories are browsable:

```bash
-e BROWSABLE_VOLUMES="/data/fastq:FASTQ Files,/data/project2:Project 2"
```

## Accessing the Web Interface

1. Open `http://your-server:9898` in your browser
2. Log in with the admin credentials you configured
3. The dashboard shows server status and available resources
4. Navigate to **Analysis** to start processing data

## Updating

```bash
docker pull alaimos/rnadetector:latest
docker stop rnadetector
docker rm rnadetector
# Re-run the docker run command (your data persists in the volume)
```

## Troubleshooting

### Container won't start
```bash
docker logs rnadetector
```

### Database issues
The database is stored in the storage volume. If corrupted, remove the volume and recreate:
```bash
docker volume rm rnadetector-storage
```

### Permission issues
Ensure your data directories are readable by the container:
```bash
chmod -R 755 /path/to/your/data
```

### Memory errors during STAR alignment
STAR requires significant RAM. Ensure the container has access to at least 32 GB. Adjust the memory allocation in the analysis wizard's Resource Configuration panel.
