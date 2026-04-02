<?php
/**
 * RNADetector Web Service
 *
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

namespace App\Jobs\Types\Traits;

use App\Exceptions\ProcessingJobException;
use App\Jobs\Types\AbstractJob;
use App\Models\Job;

trait RunTrimGaloreTrait
{

    abstract protected function appendCustomArguments(
        array $commandLine,
        string $modelParameter = 'custom_arguments',
        string $commandLineParameter = '-A'
    ): array;

    /**
     * Call trimGalore using input parameters
     *
     * @param  \App\Models\Job  $model
     * @param  bool  $paired
     * @param  string  $firstInputFile
     * @param  string|null  $secondInputFile
     * @param  int  $quality
     * @param  int  $length
     * @param  bool  $hardTrim
     * @param  int  $threads
     *
     * @return array
     * @throws \App\Exceptions\ProcessingJobException
     */
    private function runTrimGalore(
        Job $model,
        bool $paired,
        string $firstInputFile,
        ?string $secondInputFile = null,
        int $quality = 20,
        int $length = 14,
        bool $hardTrim = false,
        int $threads = 1
    ): array {
        $model->appendLog('Trimming reads using TrimGalore');
        $outputDirectory = $model->getJobFileAbsolute('trim_galore_');
        $command = [
            'bash',
            AbstractJob::scriptPath('trim_galore.bash'),
            '-q',
            $quality,
            '-l',
            $length,
            '-o',
            $outputDirectory,
            '-f',
            $firstInputFile,
            '-t',
            $threads,
        ];
        if ($paired) {
            $command[] = '-s';
            $command[] = $secondInputFile;
        }
        if ($hardTrim) {
            $command[] = '-h';
        }
        AbstractJob::runCommand(
            $this->appendCustomArguments($command, 'trimGalore.custom_arguments'),
            $model->getAbsoluteJobDirectory(),
            null,
            static function ($type, $buffer) use ($model) {
                $model->appendLog($buffer, false);
            },
            [
                3 => 'Input file does not exist.',
                4 => 'Second input file does not exist.',
                5 => 'Output directory must be specified.',
                6 => 'Output directory is not writable.',
            ]
        );
        if (!file_exists($outputDirectory) || !is_dir($outputDirectory)) {
            throw new ProcessingJobException('Unable to create trimGalore output folder');
        }
        if ($paired) {
            // Find actual output files by pattern - trim_galore naming varies by input extension
            $val1Files = glob($outputDirectory . '/*_val_1.fq');
            $val2Files = glob($outputDirectory . '/*_val_2.fq');
            if (empty($val1Files) || empty($val2Files)) {
                // Log directory contents for debugging
                $contents = @scandir($outputDirectory);
                $model->appendLog('Output directory contents: ' . implode(', ', $contents ?: ['(empty)']));
                throw new ProcessingJobException('Unable to create output files');
            }
            $firstOutput = $val1Files[0];
            $secondOutput = $val2Files[0];
        } else {
            $trimmedFiles = glob($outputDirectory . '/*_trimmed.fq');
            if (empty($trimmedFiles)) {
                $contents = @scandir($outputDirectory);
                $model->appendLog('Output directory contents: ' . implode(', ', $contents ?: ['(empty)']));
                throw new ProcessingJobException('Unable to create output files');
            }
            $firstOutput = $trimmedFiles[0];
            $secondOutput = null;
        }
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
        $base = preg_replace('/\.(fastq|fq)\.(gz|bz2)$/i', '', $base);
        $base = preg_replace('/\.(fastq|fq)$/i', '', $base);
        return $base;
    }
}
