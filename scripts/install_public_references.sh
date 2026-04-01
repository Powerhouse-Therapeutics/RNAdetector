#!/usr/bin/env bash
# install_public_references.sh - Download and index reference genomes from public repositories
# Sources: GENCODE, UCSC, Ensembl
# Usage: ./install_public_references.sh <package_name> [references_dir]
#
# Supported packages:
#   Human_hg38_genome, Human_hg19_genome
#   Mouse_mm10_genome, Mouse_mm39_genome
#   Human_hg38_transcriptome, Human_hg19_transcriptome
#   Mouse_mm10_transcriptome, Mouse_mm39_transcriptome
#   Human_hg38_small_ncRNAs, Human_hg19_small_ncRNAs
#   Mouse_mm10_smallRNA, Mouse_mm39_smallRNA
#   Human_hg38_circRNAs, Human_hg19_circRNAs
#   Mouse_mm10_circRNA, Mouse_mm39_circRNA

set -euo pipefail

PACKAGE="${1:?Usage: $0 <package_name> [references_dir]}"
REF_DIR="${2:-/rnadetector/ws/storage/app/references}"
THREADS="${3:-16}"
TMP_DIR="${REF_DIR}/${PACKAGE}_tmp"
PKG_DIR="${REF_DIR}/${PACKAGE}"

echo "============================================"
echo "Installing: ${PACKAGE}"
echo "Target dir: ${PKG_DIR}"
echo "Threads:    ${THREADS}"
echo "============================================"

mkdir -p "${TMP_DIR}" "${PKG_DIR}"

# ---- Download helpers ----
download() {
    local url="$1" dest="$2"
    echo "[download] ${url} -> ${dest}"
    if [ -f "${dest}" ]; then
        echo "[download] Already exists, skipping."
        return
    fi
    curl -fSL --retry 3 --retry-delay 10 -o "${dest}" "${url}"
}

# ---- GENCODE URLs ----
# Human
GENCODE_HUMAN_V44="https://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_44"
GENCODE_HUMAN_V19="https://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_19"
# Mouse
GENCODE_MOUSE_M33="https://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_mouse/release_M33"
GENCODE_MOUSE_M25="https://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_mouse/release_M25"

# ---- Genome FASTA URLs (from UCSC / GENCODE) ----
declare -A GENOME_URLS=(
    ["hg38"]="${GENCODE_HUMAN_V44}/GRCh38.primary_assembly.genome.fa.gz"
    ["hg19"]="https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.fa.gz"
    ["mm10"]="https://hgdownload.soe.ucsc.edu/goldenPath/mm10/bigZips/mm10.fa.gz"
    ["mm39"]="${GENCODE_MOUSE_M33}/GRCm39.primary_assembly.genome.fa.gz"
)

# ---- Gene annotation GTF URLs ----
declare -A GTF_URLS=(
    ["hg38"]="${GENCODE_HUMAN_V44}/gencode.v44.annotation.gtf.gz"
    ["hg19"]="${GENCODE_HUMAN_V19}/gencode.v19.annotation.gtf.gz"
    ["mm10"]="${GENCODE_MOUSE_M25}/gencode.vM25.annotation.gtf.gz"
    ["mm39"]="${GENCODE_MOUSE_M33}/gencode.vM33.annotation.gtf.gz"
)

# ---- Transcriptome FASTA URLs ----
declare -A TX_URLS=(
    ["hg38"]="${GENCODE_HUMAN_V44}/gencode.v44.transcripts.fa.gz"
    ["hg19"]="${GENCODE_HUMAN_V19}/gencode.v19.pc_transcripts.fa.gz"
    ["mm10"]="${GENCODE_MOUSE_M25}/gencode.vM25.transcripts.fa.gz"
    ["mm39"]="${GENCODE_MOUSE_M33}/gencode.vM33.transcripts.fa.gz"
)

# ---- lncRNA annotation URLs ----
declare -A LNCRNA_GTF_URLS=(
    ["hg38"]="${GENCODE_HUMAN_V44}/gencode.v44.long_noncoding_RNAs.gtf.gz"
    ["hg19"]="${GENCODE_HUMAN_V19}/gencode.v19.long_noncoding_RNAs.gtf.gz"
    ["mm10"]="${GENCODE_MOUSE_M25}/gencode.vM25.long_noncoding_RNAs.gtf.gz"
    ["mm39"]="${GENCODE_MOUSE_M33}/gencode.vM33.long_noncoding_RNAs.gtf.gz"
)

# ---- Parse package name to extract build ----
parse_build() {
    case "${PACKAGE}" in
        *hg38*) echo "hg38" ;;
        *hg19*) echo "hg19" ;;
        *mm10*) echo "mm10" ;;
        *mm39*) echo "mm39" ;;
        *) echo "unknown"; return 1 ;;
    esac
}

BUILD=$(parse_build)
echo "[info] Detected genome build: ${BUILD}"

# ---- Index building functions ----

build_genome_indexes() {
    local genome_fa="${PKG_DIR}/genome.fa"
    local gtf="${PKG_DIR}/annotation.gtf"

    echo "[step] Downloading genome FASTA..."
    download "${GENOME_URLS[$BUILD]}" "${TMP_DIR}/genome.fa.gz"
    echo "[step] Decompressing genome..."
    gunzip -c "${TMP_DIR}/genome.fa.gz" > "${genome_fa}"

    echo "[step] Downloading gene annotation GTF..."
    download "${GTF_URLS[$BUILD]}" "${TMP_DIR}/annotation.gtf.gz"
    gunzip -c "${TMP_DIR}/annotation.gtf.gz" > "${gtf}"

    echo "[step] Creating samtools faidx..."
    samtools faidx "${genome_fa}"

    echo "[step] Building BWA index..."
    bwa index -a bwtsw "${genome_fa}" 2>&1 | tail -5

    echo "[step] Building HISAT2 index..."
    mkdir -p "${PKG_DIR}/hisat2_index"
    hisat2-build -p "${THREADS}" "${genome_fa}" "${PKG_DIR}/hisat2_index/genome" 2>&1 | tail -5

    echo "[step] Building STAR index..."
    mkdir -p "${PKG_DIR}/star_index"
    STAR --runMode genomeGenerate \
        --genomeDir "${PKG_DIR}/star_index" \
        --genomeFastaFiles "${genome_fa}" \
        --sjdbGTFfile "${gtf}" \
        --runThreadN "${THREADS}" \
        --sjdbOverhang 100 2>&1 | tail -10

    # Download lncRNA annotation if available
    if [ -n "${LNCRNA_GTF_URLS[$BUILD]:-}" ]; then
        echo "[step] Downloading lncRNA annotation..."
        download "${LNCRNA_GTF_URLS[$BUILD]}" "${TMP_DIR}/lncrna.gtf.gz"
        gunzip -c "${TMP_DIR}/lncrna.gtf.gz" > "${PKG_DIR}/lncrna_annotation.gtf"
    fi

    echo "[done] Genome indexes complete."
}

build_transcriptome_index() {
    local tx_fa="${PKG_DIR}/transcriptome.fa"

    echo "[step] Downloading transcriptome FASTA..."
    download "${TX_URLS[$BUILD]}" "${TMP_DIR}/transcriptome.fa.gz"
    gunzip -c "${TMP_DIR}/transcriptome.fa.gz" > "${tx_fa}"

    # Need genome for Salmon decoy-aware index
    local genome_fa="${TMP_DIR}/genome.fa"
    if [ ! -f "${genome_fa}" ]; then
        download "${GENOME_URLS[$BUILD]}" "${TMP_DIR}/genome.fa.gz"
        gunzip -c "${TMP_DIR}/genome.fa.gz" > "${genome_fa}"
    fi

    echo "[step] Building Salmon index (decoy-aware)..."
    # Create decoy list from genome
    grep "^>" "${genome_fa}" | cut -d " " -f 1 | sed 's/>//' > "${TMP_DIR}/decoys.txt"
    cat "${tx_fa}" "${genome_fa}" > "${TMP_DIR}/gentrome.fa"
    mkdir -p "${PKG_DIR}/salmon_index"
    salmon index \
        -t "${TMP_DIR}/gentrome.fa" \
        -d "${TMP_DIR}/decoys.txt" \
        -p "${THREADS}" \
        -i "${PKG_DIR}/salmon_index" 2>&1 | tail -10

    echo "[done] Transcriptome index complete."
}

build_smallrna_annotations() {
    local gtf="${PKG_DIR}/annotation.gtf"

    echo "[step] Downloading gene annotation GTF..."
    download "${GTF_URLS[$BUILD]}" "${TMP_DIR}/annotation.gtf.gz"
    gunzip -c "${TMP_DIR}/annotation.gtf.gz" > "${gtf}"

    echo "[step] Extracting small ncRNA annotations..."
    # Extract miRNA, snoRNA, snRNA, tRNA, piRNA etc from main GTF
    grep -E 'gene_type "(miRNA|snoRNA|snRNA|scaRNA|rRNA|Mt_rRNA|Mt_tRNA|misc_RNA|ribozyme|sRNA|scRNA|vault_RNA)"' \
        "${gtf}" > "${PKG_DIR}/small_ncRNAs.gtf" || true

    # Also try to get miRBase annotations
    case "${BUILD}" in
        hg38|hg19)
            echo "[step] Downloading miRBase annotations..."
            download "https://www.mirbase.org/download/hsa.gff3" "${PKG_DIR}/mirbase.gff3" || true
            ;;
        mm10|mm39)
            echo "[step] Downloading miRBase annotations..."
            download "https://www.mirbase.org/download/mmu.gff3" "${PKG_DIR}/mirbase.gff3" || true
            ;;
    esac

    echo "[done] Small RNA annotations complete."
}

build_circrna_annotations() {
    echo "[step] Downloading gene annotation GTF for circRNA detection..."
    download "${GTF_URLS[$BUILD]}" "${TMP_DIR}/annotation.gtf.gz"
    gunzip -c "${TMP_DIR}/annotation.gtf.gz" > "${PKG_DIR}/annotation.gtf"

    # circBase annotations
    echo "[step] Downloading circRNA database annotations..."
    case "${BUILD}" in
        hg19)
            download "http://www.circbase.org/download/hsa_hg19_circRNA.txt" "${PKG_DIR}/circRNA_db.txt" || true
            ;;
        hg38)
            # circBase is hg19-based; for hg38, use circAtlas or just the GTF
            echo "[info] Using GENCODE GTF for hg38 circRNA analysis"
            ;;
        mm10|mm39)
            download "http://www.circbase.org/download/mmu_mm9_circRNA.txt" "${PKG_DIR}/circRNA_db.txt" || true
            ;;
    esac

    echo "[done] CircRNA annotations complete."
}

# ---- Create metadata ----
write_metadata() {
    cat > "${PKG_DIR}/metadata.json" << METAEOF
{
    "name": "${PACKAGE}",
    "build": "${BUILD}",
    "source": "GENCODE/UCSC/Ensembl (public repositories)",
    "installed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "indexed_tools": []
}
METAEOF
}

# ---- Main dispatch ----
case "${PACKAGE}" in
    *_genome)
        build_genome_indexes
        write_metadata
        # Update metadata with tools
        sed -i 's/"indexed_tools": \[\]/"indexed_tools": ["STAR", "HISAT2", "BWA"]/' "${PKG_DIR}/metadata.json"
        ;;
    *_transcriptome|*_gencode_*_transcriptome)
        build_transcriptome_index
        write_metadata
        sed -i 's/"indexed_tools": \[\]/"indexed_tools": ["Salmon"]/' "${PKG_DIR}/metadata.json"
        ;;
    *_small_ncRNAs|*_smallRNA|*_sncRNA*)
        build_smallrna_annotations
        write_metadata
        ;;
    *_circRNA*|*_circRNAs*)
        build_circrna_annotations
        write_metadata
        ;;
    *)
        echo "[error] Unknown package: ${PACKAGE}"
        echo "Supported packages:"
        echo "  Human_hg38_genome, Human_hg19_genome, Mouse_mm10_genome, Mouse_mm39_genome"
        echo "  Human_hg38_transcriptome, Human_hg19_transcriptome, Mouse_mm10_transcriptome, Mouse_mm39_transcriptome"
        echo "  Human_hg38_small_ncRNAs, Human_hg19_small_ncRNAs, Mouse_mm10_smallRNA, Mouse_mm39_smallRNA"
        echo "  Human_hg38_circRNAs, Human_hg19_circRNAs, Mouse_mm10_circRNA, Mouse_mm39_circRNA"
        exit 1
        ;;
esac

# Mark as installed
touch "${PKG_DIR}/.installed"

# Register in the database
if command -v php &>/dev/null && [ -f /rnadetector/ws/artisan ]; then
    echo "[step] Registering reference in database..."
    php /rnadetector/ws/artisan tinker --execute="
        \$ref = new App\Models\Reference();
        \$ref->name = '${PACKAGE}';
        \$ref->path = '${PKG_DIR}';
        \$ref->available_for = json_encode(['star' => true, 'hisat' => true, 'bwa' => true, 'salmon' => true]);
        \$ref->save();
        echo 'Registered.';
    " 2>/dev/null || echo "[warn] Could not register in database (non-critical)"
fi

# Cleanup tmp
echo "[step] Cleaning up temporary files..."
rm -rf "${TMP_DIR}"

echo "============================================"
echo "SUCCESS: ${PACKAGE} installed to ${PKG_DIR}"
echo "============================================"
