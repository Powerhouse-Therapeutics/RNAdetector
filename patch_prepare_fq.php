<?php
/**
 * Patch prepare_fq.sh to handle absolute paths on read-only volumes.
 * When the input file is on a read-only mount, symlink it into the job directory first.
 */

$file = '/rnadetector/scripts/prepare_fq.sh';
$content = file_get_contents($file);

// Already patched?
if (strpos($content, 'JOBDIR') !== false) {
    echo "Already patched.\n";
    exit(0);
}

$new = <<<'BASH'
#!/bin/bash

INPUT="${1}"
JOBDIR="${2:-$(pwd)}"

if [ -z "$INPUT" ]; then
  echo "Input file is required"
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "Input file does not exist."
  exit 2
fi

# If input is an absolute path outside the job directory, symlink it in
BASENAME=$(basename "$INPUT")
if [[ "$INPUT" == /* ]] && [[ "$INPUT" != "$JOBDIR"* ]]; then
  LINK="$JOBDIR/$BASENAME"
  if [ ! -e "$LINK" ]; then
    ln -s "$INPUT" "$LINK" 2>/dev/null || cp "$INPUT" "$LINK"
  fi
  INPUT="$LINK"
fi

MIME=$(file -i -0 "$INPUT" | cut -f 2 -d " " | cut -f 1 -d ";")
EXTENSION="${INPUT##*.}"
FILENAME="$(dirname "$INPUT")/$(basename "$INPUT" ".${EXTENSION}")"

COMPRESSED=false
if [ "$MIME" = "application/gzip" ] || [ "$MIME" = "application/x-gzip" ]; then
  echo "Extracting $INPUT"
  if ! gunzip -k -v -c "$INPUT" 2>/dev/null >"$FILENAME"; then
    echo "Unable to extract input file."
    exit 5
  fi
  COMPRESSED=true
elif [ "$MIME" = "application/x-bzip2" ]; then
  echo "Extracting $INPUT"
  if ! bunzip2 -k -v -c "$INPUT" 2>/dev/null >"$FILENAME"; then
    echo "Unable to extract input file."
    exit 5
  fi
  COMPRESSED=true
fi

if [ "$COMPRESSED" = "true" ]; then
  if [ ! -f "$FILENAME" ]; then
    echo "Unable to find extracted file"
    exit 3
  fi
  exit 4
fi
BASH;

file_put_contents($file, $new);
echo "prepare_fq.sh patched for absolute path support.\n";
