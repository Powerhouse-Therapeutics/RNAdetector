<?php
/**
 * RNADetector Web Service - Fusion Gene Detection Trait
 */

namespace App\Jobs\Types\Traits;

use App\Jobs\Types\AbstractJob;
use App\Models\Annotation;
use App\Models\Job;
use App\Models\Reference;

trait RunFusionDetectionTrait
{

    /**
     * Run fusion gene detection with Arriba (or STAR-Fusion as fallback).
     * This is a non-blocking step: failures are logged as warnings but do NOT stop the pipeline.
     *
     * @param  \App\Models\Job  $model
     * @param  string  $bamFile         STAR-aligned BAM file
     * @param  \App\Models\Annotation  $annotation  Gene annotation (GTF)
     * @param  \App\Models\Reference  $genome      Reference genome
     * @param  int  $threads
     *
     * @return array|null  Array with 'path' and 'url' keys, or null if fusion detection was not run
     */
    private function runFusionDetection(
        Job $model,
        string $bamFile,
        Annotation $annotation,
        Reference $genome,
        int $threads = 4
    ): ?array {
        try {
            $model->appendLog('Running fusion gene detection...');
            $outputDirectory = $model->getJobFileAbsolute('fusion_');
            $command = [
                'bash',
                AbstractJob::scriptPath('arriba.bash'),
                '-b',
                $bamFile,
                '-a',
                $annotation->path,
                '-g',
                $genome->path,
                '-o',
                $outputDirectory,
                '-t',
                $threads,
            ];
            AbstractJob::runCommand(
                $command,
                $model->getAbsoluteJobDirectory(),
                null,
                static function ($type, $buffer) use ($model) {
                    $model->appendLog($buffer, false);
                },
                [
                    3 => 'Fusion detection input file or parameter issue.',
                    4 => 'No fusion detection tool available (skipped).',
                ]
            );
            $fusionFile = $outputDirectory . '/fusions.tsv';
            if (file_exists($fusionFile)) {
                $model->appendLog('Fusion gene detection completed successfully.');
                $relativePath = str_replace(
                    $model->getAbsoluteJobDirectory() . '/',
                    '',
                    $fusionFile
                );
                return [
                    'path' => $relativePath,
                    'url'  => $model->absoluteJobPath($relativePath),
                ];
            }
            $model->appendLog('Warning: Fusion detection output was not generated.');
            return null;
        } catch (\Throwable $e) {
            $model->appendLog('Fusion detection skipped: ' . $e->getMessage());
            $model->appendLog('Continuing with the pipeline...');
            return null;
        }
    }
}
