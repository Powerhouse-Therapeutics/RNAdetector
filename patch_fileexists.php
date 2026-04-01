<?php
/**
 * Patch AbstractJob to accept absolute file paths in addition to job-relative paths.
 * This allows the frontend to reference files on mounted server volumes directly.
 */

$file = '/rnadetector/ws/app/Jobs/Types/AbstractJob.php';
$content = file_get_contents($file);

$old = <<<'PHP'
    protected function fileExists(?string $file): bool
    {
        if (empty($file)) {
            return false;
        }

        return $this->fileExistsRelative($this->model->getJobDirectory() . '/' . $file);
    }
PHP;

$new = <<<'PHP'
    protected function fileExists(?string $file): bool
    {
        if (empty($file)) {
            return false;
        }

        // Support absolute paths (files on mounted server volumes)
        if (str_starts_with($file, '/') && file_exists($file)) {
            return true;
        }

        return $this->fileExistsRelative($this->model->getJobDirectory() . '/' . $file);
    }
PHP;

if (strpos($content, 'Support absolute paths') !== false) {
    echo "Already patched.\n";
    exit(0);
}

$content = str_replace($old, $new, $content);
file_put_contents($file, $content);
echo "AbstractJob patched to support absolute file paths.\n";
