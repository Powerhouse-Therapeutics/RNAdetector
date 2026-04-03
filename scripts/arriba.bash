#!/bin/bash
set -o pipefail

##############################################################################
# Fusion Gene Detection with Arriba (or STAR-Fusion as fallback)
# Options:
#   -b BAM_INPUT        STAR-aligned BAM file with chimeric reads
#   -a ANNOTATION_GTF   Gene annotation GTF file
#   -g GENOME_FASTA     Reference genome FASTA file
#   -o OUTPUT_DIR       Output directory for fusion results
#   -t THREADS          Number of threads (default 4)
##############################################################################

while getopts ":b:a:g:o:t:" opt; do
  case $opt in
  b) BAM_INPUT=$OPTARG ;;
  a) ANNOTATION_GTF=$OPTARG ;;
  g) GENOME_FASTA=$OPTARG ;;
  o) OUTPUT_DIR=$OPTARG ;;
  t) THREADS=$OPTARG ;;
  \?)
    echo "Invalid option: -$OPTARG"
    exit 1
    ;;
  :)
    echo "Option -$OPTARG requires an argument."
    exit 2
    ;;
  esac
done

#### Check parameters ####

# Check BAM input file
if [ -z "$BAM_INPUT" ] || [ ! -f "$BAM_INPUT" ]; then
  echo "BAM input file does not exist or was not specified!"
  exit 3
fi

# Check annotation GTF
if [ -z "$ANNOTATION_GTF" ] || [ ! -f "$ANNOTATION_GTF" ]; then
  echo "Annotation GTF file does not exist or was not specified!"
  exit 3
fi

# Check genome FASTA
if [ -z "$GENOME_FASTA" ] || [ ! -f "$GENOME_FASTA" ]; then
  echo "Genome FASTA file does not exist or was not specified!"
  exit 3
fi

# Check number of threads
if [ -z "$THREADS" ]; then
  THREADS=4
fi

# Check output directory
if [ -z "$OUTPUT_DIR" ]; then
  echo "Output directory must be specified!"
  exit 3
fi

# Create output directory if it does not exist
if ! mkdir -p "$OUTPUT_DIR"; then
  echo "Unable to create output directory!"
  exit 3
fi

# Check if output directory is writable
if [ ! -w "$OUTPUT_DIR" ]; then
  echo "Output directory is not writable!"
  exit 3
fi

#### Try Arriba first ####
if command -v arriba &>/dev/null; then
  echo "Running Arriba fusion detection..."

  arriba \
    -x "$BAM_INPUT" \
    -g "$ANNOTATION_GTF" \
    -a "$GENOME_FASTA" \
    -o "$OUTPUT_DIR/fusions.tsv" \
    -O "$OUTPUT_DIR/fusions.discarded.tsv" \
    2>&1

  ARRIBA_EXIT=$?
  if [ $ARRIBA_EXIT -eq 0 ]; then
    echo "Arriba fusion detection completed successfully."
    # Set permissions on output files
    if [ -d "$OUTPUT_DIR" ]; then
      chmod -R a+rwx "$OUTPUT_DIR" 2>/dev/null || true
    fi
    exit 0
  else
    echo "Arriba failed with exit code $ARRIBA_EXIT, trying fallback..."
  fi
fi

#### Try STAR-Fusion as fallback ####
if command -v STAR-Fusion &>/dev/null; then
  echo "Running STAR-Fusion as fallback..."

  # Look for chimeric junction file in the same directory as the BAM
  BAM_DIR="$(dirname "$BAM_INPUT")"
  CHIMERIC_JUNCTIONS=""
  for candidate in "$BAM_DIR/Chimeric.out.junction" "$BAM_DIR/"*"Chimeric.out.junction"; do
    if [ -f "$candidate" ]; then
      CHIMERIC_JUNCTIONS="$candidate"
      break
    fi
  done

  if [ -z "$CHIMERIC_JUNCTIONS" ]; then
    echo "No Chimeric.out.junction file found for STAR-Fusion."
    echo "STAR-Fusion requires chimeric junction output from STAR alignment."
    # Neither tool could run successfully
    exit 4
  fi

  STAR-Fusion \
    --chimeric_junction "$CHIMERIC_JUNCTIONS" \
    --genome_lib_dir "$(dirname "$GENOME_FASTA")" \
    --output_dir "$OUTPUT_DIR" \
    --CPU "$THREADS" \
    2>&1

  SF_EXIT=$?
  if [ $SF_EXIT -eq 0 ]; then
    # Rename STAR-Fusion output to match expected names
    if [ -f "$OUTPUT_DIR/star-fusion.fusion_predictions.tsv" ]; then
      cp "$OUTPUT_DIR/star-fusion.fusion_predictions.tsv" "$OUTPUT_DIR/fusions.tsv"
    fi
    if [ -f "$OUTPUT_DIR/star-fusion.fusion_predictions.abridged.tsv" ]; then
      cp "$OUTPUT_DIR/star-fusion.fusion_predictions.abridged.tsv" "$OUTPUT_DIR/fusions.discarded.tsv"
    fi
    echo "STAR-Fusion completed successfully."
    # Set permissions on output files
    if [ -d "$OUTPUT_DIR" ]; then
      chmod -R a+rwx "$OUTPUT_DIR" 2>/dev/null || true
    fi
    exit 0
  else
    echo "STAR-Fusion failed with exit code $SF_EXIT."
  fi
fi

# Neither arriba nor STAR-Fusion is available or both failed
echo "No fusion detection tool available (arriba or STAR-Fusion). Skipping fusion detection."
exit 4
