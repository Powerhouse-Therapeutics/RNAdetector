# RNAdetector Installation Guide

This guide covers how to install, configure, and run the RNAdetector server and web client.

---

## Table of Contents

- [System Requirements](#system-requirements)
- [Docker Installation](#docker-installation)
- [Server Deployment](#server-deployment)
  - [Option 1: Docker Run](#option-1-docker-run-simple)
  - [Option 2: Docker Compose](#option-2-docker-compose-recommended)
- [Environment Configuration](#environment-configuration)
- [First-Time Setup](#first-time-setup)
- [Reference Genome Installation](#reference-genome-installation)
- [Data Volume Configuration](#data-volume-configuration)
- [Web Client Setup](#web-client-setup)
- [Updating](#updating)
- [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 cores | 16+ cores |
| RAM | 16 GB | 32+ GB |
| Disk Space | 100 GB | 500+ GB |
| Docker | 20.10+ | Latest stable |
| Browser | Any modern browser | Chrome, Firefox, Edge, Safari |

### Disk Space Considerations

- **Reference genomes**: Each genome build with all aligner indexes requires approximately 12-15 GB. A single organism (genome + transcriptome) typically requires 15-20 GB.
- **Analysis output**: Each RNA-seq analysis job produces BAM files, count tables, and reports. Plan for 5-20 GB per sample depending on sequencing depth.
- **Docker image**: The RNAdetector image is approximately 8-10 GB.

### RAM Considerations

- **STAR alignment**: Requires approximately 30 GB of RAM per genome loaded. If running STAR, 32 GB RAM is the practical minimum.
- **HISAT2 alignment**: Requires approximately 8 GB of RAM. Can work with 16 GB total system RAM.
- **Salmon quantification**: Requires approximately 8-12 GB of RAM.
- **Differential expression and pathway analysis**: Typically requires 4-8 GB of RAM.

---

## Docker Installation

If Docker is not already installed on your system:

### Ubuntu / Debian

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and log back in for group membership to take effect
```

### CentOS / RHEL

```bash
sudo yum install -y docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

### macOS

Download and install Docker Desktop from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/). Allocate at least 32 GB of RAM to the Docker VM in Docker Desktop preferences.

### Windows

Download and install Docker Desktop with WSL2 backend from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/). Allocate at least 32 GB of RAM in the WSL2 configuration.

---

## Server Deployment

### Option 1: Docker Run (Simple)

```bash
docker run -d \
  --name rnadetector \
  -p 9898:80 \
  -v /path/to/your/data:/data \
  -v rnadetector-storage:/rnadetector/ws/storage/app/ \
  -e ADMIN_EMAIL="admin@yourdomain.com" \
  -e ADMIN_PASSWORD="your-secure-password" \
  -e BROWSABLE_VOLUMES="/data:Sequencing Data" \
  -e AUTO_INSTALL_PACKAGES="Human_hg38_genome,Human_hg38_transcriptome" \
  alaimos/rnadetector:latest
```

### Option 2: Docker Compose (Recommended)

Create a file named `docker-compose.yml`:

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
      - ADMIN_EMAIL=admin@yourdomain.com
      - ADMIN_PASSWORD=your-secure-password
      - BROWSABLE_VOLUMES=/data:Sequencing Data,/results:Analysis Results
      - AUTO_INSTALL_PACKAGES=Human_hg38_genome,Human_hg38_transcriptome
    restart: unless-stopped

volumes:
  rnadetector-storage:
```

Start the server:

```bash
docker-compose up -d
```

Stop the server:

```bash
docker-compose down
```

View logs:

```bash
docker-compose logs -f rnadetector
```

---

## Environment Configuration

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@admin` | Admin account email used for login |
| `ADMIN_PASSWORD` | `password123` | Admin account password. **Change this to a secure value.** |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_DATABASE` | `rnadetector` | Internal MySQL database name |
| `DB_USERNAME` | `rnadetector` | Internal MySQL username |
| `DB_PASSWORD` | *(auto-generated)* | Internal MySQL password |
| `AUTO_INSTALL_PACKAGES` | *(empty)* | Comma-separated genome packages to auto-install on first boot |
| `BROWSABLE_VOLUMES` | `/data:Data Files` | Comma-separated `path:label` pairs for the file browser |
| `APP_DEBUG` | `false` | Enable Laravel debug mode. Set to `true` only for troubleshooting. |

### Security Notes

- Always change `ADMIN_PASSWORD` from the default value before deploying.
- The `DB_PASSWORD` is used only internally within the Docker container. If not set, it is auto-generated on first boot.
- Never commit the `.env` file to version control.
- The `APP_KEY` is auto-generated on first boot. Do not share it.

---

## First-Time Setup

On first startup, the container performs the following initialization steps:

1. **Database initialization** -- Creates the MySQL database schema and seeds default data.
2. **Admin account creation** -- Creates the admin user with the configured email and password.
3. **Package installation** -- If `AUTO_INSTALL_PACKAGES` is set, downloads and installs the specified reference genome packages. This can take 30-60 minutes per genome build depending on network speed.
4. **Service startup** -- Starts Apache (web server), Beanstalkd (job queue), and the Laravel queue worker.

### Monitoring First Boot

```bash
docker logs -f rnadetector
```

Wait until you see log messages indicating that the web server is ready before attempting to access the interface.

### Verifying the Installation

1. Open `http://your-server:9898` in your web browser.
2. Log in with the admin credentials configured in your environment.
3. The Dashboard page should display server status information including CPU, RAM, and disk usage.
4. Navigate to **Server Admin** to verify that any auto-installed packages show as installed.

---

## Reference Genome Installation

Reference genomes can be installed in two ways:

### Method 1: Auto-Install on First Boot

Set the `AUTO_INSTALL_PACKAGES` environment variable before starting the container:

```bash
AUTO_INSTALL_PACKAGES=Human_hg38_genome,Human_hg38_transcriptome,Human_hg38_small_ncRNAs
```

### Method 2: Install via Web Interface

1. Log in to RNAdetector.
2. Navigate to **Server Admin**.
3. Browse the list of available packages.
4. Click **Install** next to the desired package.
5. Monitor the installation progress on the same page.

### Available Packages

| Package Name | Description | Approximate Size |
|-------------|-------------|-----------------|
| `Human_hg19_genome` | Human hg19 with STAR, HISAT2, BWA indexes | ~15 GB |
| `Human_hg19_transcriptome` | Human hg19 Salmon index (GENCODE v19) | ~2 GB |
| `Human_hg19_small_ncRNAs` | Human hg19 small non-coding RNA annotations | ~1 GB |
| `Human_hg19_circRNAs` | Human hg19 circular RNA annotations | ~1 GB |
| `Human_hg38_genome` | Human hg38 with STAR, HISAT2, BWA indexes | ~15 GB |
| `Human_hg38_transcriptome` | Human hg38 Salmon index (GENCODE v32) | ~2 GB |
| `Human_hg38_small_ncRNAs` | Human hg38 small non-coding RNA annotations | ~1 GB |
| `Human_hg38_circRNAs` | Human hg38 circular RNA annotations | ~1 GB |
| `Mouse_mm10_genome` | Mouse mm10 with STAR, HISAT2, BWA indexes | ~12 GB |
| `Mouse_mm10_transcriptome` | Mouse mm10 Salmon index (GENCODE vM23) | ~2 GB |
| `Mouse_mm10_smallRNA` | Mouse mm10 small non-coding RNA annotations | ~1 GB |
| `Mouse_mm39_genome` | Mouse mm39 with STAR, HISAT2, BWA indexes | ~12 GB |
| `Mouse_mm39_transcriptome` | Mouse mm39 Salmon index (GENCODE vM32) | ~2 GB |
| `Mouse_mm39_smallRNA` | Mouse mm39 small non-coding RNA annotations | ~1 GB |

### Custom References

To use a custom organism or annotation not available as a pre-built package, upload your own reference files (genome FASTA, GTF annotation, transcriptome FASTA) through the References page in the web interface.

---

## Data Volume Configuration

Mount your sequencing data directories into the Docker container so the file browser can access them. Each mounted volume can be given a label for display in the web interface.

### Example: Multiple Data Directories

```bash
docker run -d \
  --name rnadetector \
  -p 9898:80 \
  -v rnadetector-storage:/rnadetector/ws/storage/app/ \
  -v /srv/sequencing/project1:/data/project1 \
  -v /srv/sequencing/project2:/data/project2 \
  -v /srv/results:/results \
  -e BROWSABLE_VOLUMES="/data/project1:Project 1 FASTQ,/data/project2:Project 2 FASTQ,/results:Analysis Results" \
  alaimos/rnadetector:latest
```

### Volume Format

The `BROWSABLE_VOLUMES` variable uses the format:

```
/container/path1:Label 1,/container/path2:Label 2
```

Each entry is a comma-separated pair of `path:label` where:
- **path** is the directory path inside the container
- **label** is the human-readable name shown in the file browser

### Storage Volume

The `rnadetector-storage` volume persists the application database, job outputs, and uploaded files. **Do not delete this volume** unless you intend to reset the entire installation.

---

## Web Client Setup

### Production (Served by Docker)

The Docker container serves the web client automatically at `http://your-server:9898`. No additional setup is needed.

### Development Mode

For frontend development with hot module replacement:

```bash
cd client
npm install
npm run dev
```

The development server runs at `http://localhost:5173` and proxies API requests to `http://localhost:9898`. To change the API target, set the `VITE_API_URL` environment variable:

```bash
VITE_API_URL=http://my-server:9898 npm run dev
```

---

## Updating

### Docker Run

```bash
docker pull alaimos/rnadetector:latest
docker stop rnadetector
docker rm rnadetector
# Re-run your original docker run command
# Data persists in the named volume (rnadetector-storage)
```

### Docker Compose

```bash
docker-compose pull
docker-compose up -d
```

Your analysis data, installed genome packages, and job history are preserved across updates because they reside in the persistent Docker volume.

---

## Troubleshooting

### Container Fails to Start

Check the container logs for error messages:

```bash
docker logs rnadetector
```

Common causes:
- Port 9898 is already in use by another service. Change the port mapping (e.g., `-p 8080:80`).
- Insufficient disk space for the Docker image.
- Docker daemon is not running.

### Cannot Access the Web Interface

- Verify the container is running: `docker ps | grep rnadetector`
- Check that port 9898 is not blocked by a firewall.
- If running on a remote server, ensure you are using the server's IP address or hostname, not `localhost`.

### Login Fails

- Verify the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values match what was set when the container was first created.
- If the admin credentials were lost, remove the storage volume and restart to reinitialize: `docker volume rm rnadetector-storage` (this deletes all data).

### Database Errors

The MySQL database is stored in the persistent storage volume. If it becomes corrupted:

```bash
docker stop rnadetector
docker volume rm rnadetector-storage
# Restart the container; the database will be recreated
```

**Warning**: This deletes all job data, results, and installed packages.

### Permission Errors on Data Files

Ensure your sequencing data directories are readable by the Docker container:

```bash
chmod -R 755 /path/to/your/data
```

If the container runs as a non-root user, ensure the files are world-readable or owned by the container's user.

### Memory Errors During STAR Alignment

STAR requires approximately 30 GB of RAM to load a human genome index. Solutions:

- Increase the system RAM to at least 32 GB.
- On Docker Desktop (macOS/Windows), increase the memory allocation in Docker preferences.
- Use HISAT2 instead of STAR, which requires only ~8 GB of RAM.
- Reduce the number of concurrent jobs to avoid memory contention.
- Adjust the resource allocation sliders in the Analysis Wizard to match your available resources.

### Jobs Stuck in "Queued" Status

The Beanstalkd queue worker may have stopped. Restart the container:

```bash
docker restart rnadetector
```

### Genome Package Installation Fails

- Check available disk space: genome packages require several GB each.
- Check network connectivity from the container: the package download requires internet access.
- View installation logs via the Server Admin page or container logs.

### Slow Performance

- Ensure the Docker container has access to sufficient CPU cores. On Docker Desktop, check resource allocation in preferences.
- Avoid running multiple alignment jobs simultaneously if RAM is limited.
- Use Salmon for faster alignment-free quantification when transcript-level counts are acceptable.
- Store sequencing data on SSD storage rather than spinning disks for improved I/O performance.
