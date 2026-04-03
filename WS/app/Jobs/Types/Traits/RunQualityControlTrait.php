<?php
/**
 * RNADetector Web Service - Quality Control Trait
 */

namespace App\Jobs\Types\Traits;

use App\Jobs\Types\AbstractJob;
use App\Models\Job;

trait RunQualityControlTrait
{

    /**
     * Run quality control with FastQC and MultiQC on input FASTQ files.
     * This is a non-blocking step: failures are logged as warnings but do NOT stop the pipeline.
     *
     * @param  \App\Models\Job  $model
     * @param  bool  $paired
     * @param  string  $firstInputFile
     * @param  string|null  $secondInputFile
     * @param  int  $threads
     *
     * @return string|null  Path to the MultiQC report HTML, or null if QC was not run
     */
    private function runQualityControl(
        Job $model,
        bool $paired,
        string $firstInputFile,
        ?string $secondInputFile,
        int $threads = 4
    ): ?string {
        try {
            $model->appendLog('Running quality control with FastQC...');
            $outputDirectory = $model->getJobFileAbsolute('fastqc_');
            $command = [
                'bash',
                AbstractJob::scriptPath('fastqc.bash'),
                '-f',
                $firstInputFile,
                '-o',
                $outputDirectory,
                '-t',
                $threads,
            ];
            if ($paired && $secondInputFile) {
                $command[] = '-s';
                $command[] = $secondInputFile;
            }
            AbstractJob::runCommand(
                $command,
                $model->getAbsoluteJobDirectory(),
                null,
                static function ($type, $buffer) use ($model) {
                    $model->appendLog($buffer, false);
                },
                [
                    3 => 'Input file does not exist.',
                    4 => 'Output directory issue.',
                    5 => 'FastQC failed.',
                    6 => 'MultiQC failed.',
                ]
            );
            $reportPath = $outputDirectory . '/multiqc_report.html';
            if (file_exists($reportPath)) {
                $model->appendLog('Quality control completed successfully.');
                return $reportPath;
            }
            $model->appendLog('Warning: MultiQC report was not generated.');
            return null;
        } catch (\Exception $e) {
            $model->appendLog('Warning: Quality control step failed: ' . $e->getMessage());
            $model->appendLog('Continuing with the pipeline...');
            return null;
        }
    }
}
