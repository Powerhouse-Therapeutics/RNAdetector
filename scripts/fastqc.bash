#!/bin/bash
set -o pipefail

##############################################################################
# Quality Control with FastQC and MultiQC
# Options:
#   -f INPUT_1         First input FASTQ file
#   -s INPUT_2         Optional second input FASTQ (for paired-end)
#   -o OUTPUT_DIR      Output directory for QC reports
#   -t THREADS         Number of threads (default 1)
##############################################################################

while getopts ":f:s:o:t:" opt; do
  case $opt in
  f) INPUT_1=$OPTARG ;;
  s) INPUT_2=$OPTARG ;;
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

# Check first input file
if [ -z "$INPUT_1" ] || [ ! -f "$INPUT_1" ]; then
  echo "First input file does not exist or was not specified!"
  exit 3
fi

# Check second input file if provided
if [ -n "$INPUT_2" ] && [ ! -f "$INPUT_2" ]; then
  echo "Second input file does not exist!"
  exit 3
fi

# Check number of threads
if [ -z "$THREADS" ]; then
  THREADS=1
fi

# Check output directory
if [ -z "$OUTPUT_DIR" ]; then
  echo "Output directory must be specified!"
  exit 4
fi

# Create output directory if it does not exist
if ! mkdir -p "$OUTPUT_DIR"; then
  echo "Unable to create output directory!"
  exit 4
fi

# Check if output directory is writable
if [ ! -w "$OUTPUT_DIR" ]; then
  echo "Output directory is not writable!"
  exit 4
fi

#### Run FastQC ####
echo "Running FastQC..."

FASTQC_CMD="fastqc --threads $THREADS --outdir $OUTPUT_DIR $INPUT_1"
if [ -n "$INPUT_2" ]; then
  FASTQC_CMD="$FASTQC_CMD $INPUT_2"
fi

if ! eval "$FASTQC_CMD"; then
  echo "FastQC failed!"
  exit 5
fi

echo "FastQC completed successfully."

#### Run MultiQC ####
echo "Running MultiQC..."

if ! multiqc "$OUTPUT_DIR" -o "$OUTPUT_DIR" --force; then
  echo "MultiQC failed!"
  exit 6
fi

echo "MultiQC completed successfully."

# Set permissions on output files
if [ -d "$OUTPUT_DIR" ]; then
  chmod -R a+rwx "$OUTPUT_DIR" 2>/dev/null || true
fi

echo "Quality control completed."
