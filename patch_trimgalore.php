<?php
/**
 * Fix RunTrimGaloreTrait to handle .fastq.gz double extension correctly.
 * pathinfo('file.fastq.gz', PATHINFO_FILENAME) returns 'file.fastq'
 * but trim_galore strips the full .fastq.gz and uses just 'file'.
 */

$file = '/rnadetector/ws/app/Jobs/Types/Traits/RunTrimGaloreTrait.php';
$content = file_get_contents($file);

if (strpos($content, 'stripDoubleExt') !== false) {
    echo "Already patched.\n";
    exit(0);
}

// Add a helper function before the closing brace of the trait
$old = <<<'PHP'
        $model->appendLog('Trimming completed');

        return [$firstOutput, $secondOutput];
    }
}
PHP;

$new = <<<'PHP'
        $model->appendLog('Trimming completed');

        return [$firstOutput, $secondOutput];
    }

    /**
     * Strip double extensions like .fastq.gz, .fq.gz to get the base name
     * that trim_galore uses for output files.
     */
    private static function stripDoubleExt(string $filePath): string
    {
        $base = basename($filePath);
        // Strip common compressed FASTQ extensions
        $base = preg_replace('/\.(fastq|fq)\.(gz|bz2)$/i', '', $base);
        // Also strip uncompressed FASTQ extensions
        $base = preg_replace('/\.(fastq|fq)$/i', '', $base);
        return $base;
    }
}
PHP;

$content = str_replace($old, $new, $content);

// Now fix the pathinfo calls to use stripDoubleExt
$content = str_replace(
    "\$firstBase = pathinfo(\$firstInputFile, PATHINFO_FILENAME);\n            \$secondBase = pathinfo(\$secondInputFile, PATHINFO_FILENAME);",
    "\$firstBase = self::stripDoubleExt(\$firstInputFile);\n            \$secondBase = self::stripDoubleExt(\$secondInputFile);",
    $content
);

// Fix the single-end case too
$content = str_replace(
    "\$firstBase = pathinfo(\$firstInputFile, PATHINFO_FILENAME);\n            \$firstOutput = \$outputDirectory . '/' . \$firstBase . '_trimmed.fq';",
    "\$firstBase = self::stripDoubleExt(\$firstInputFile);\n            \$firstOutput = \$outputDirectory . '/' . \$firstBase . '_trimmed.fq';",
    $content
);

file_put_contents($file, $content);
echo "RunTrimGaloreTrait patched for double extension handling.\n";
