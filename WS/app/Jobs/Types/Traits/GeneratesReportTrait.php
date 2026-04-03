<?php

namespace App\Jobs\Types\Traits;

use App\Jobs\Types\AbstractJob;
use App\Models\Job;

trait GeneratesReportTrait
{
    /**
     * Generate an HTML report for the completed job.
     * Non-blocking: failures are logged but do not stop the pipeline.
     *
     * @param Job $model
     * @return string|null Path to report.html or null on failure
     */
    private function generateReport(Job $model): ?string
    {
        $scriptPath = AbstractJob::scriptPath('generate_report.R');
        $outputDir = $model->getAbsoluteJobDirectory();

        if (!file_exists($scriptPath)) {
            $model->appendLog('Report generation skipped: script not found.');
            return null;
        }

        $model->appendLog('Generating HTML report...');

        $jobId = $model->id;
        $jobType = $model->job_type ?? 'rnaseq';
        $jobName = $model->name ?? ('Job ' . $jobId);

        $groupColors = '{}';
        $params = $model->job_parameters;
        if (is_array($params) && !empty($params['group_colors'])) {
            $encoded = json_encode($params['group_colors']);
            if ($encoded !== false) {
                $groupColors = $encoded;
            }
        }

        try {
            AbstractJob::runCommand(
                [
                    'Rscript',
                    $scriptPath,
                    '--job_id', (string)$jobId,
                    '--job_type', $jobType,
                    '--job_name', $jobName,
                    '--output_dir', $outputDir,
                    '--group_colors', $groupColors,
                ],
                $outputDir,
                null,
                function ($type, $buffer) use ($model) {
                    $model->appendLog($buffer, false);
                }
            );

            $reportPath = $outputDir . '/report.html';
            if (file_exists($reportPath)) {
                @chmod($reportPath, 0777);
                $model->appendLog('HTML report generated successfully.');
                return $reportPath;
            }

            $model->appendLog('Report generation completed but report.html not found.');
            return null;
        } catch (\Throwable $e) {
            $model->appendLog('Report generation failed: ' . $e->getMessage());
            return null;
        }
    }
}
