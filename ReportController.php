<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Job;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    /**
     * Return the HTML report for a job.
     *
     * GET /api/jobs/{job}/report
     */
    public function show(Job $job): Response
    {
        $this->authorizeJob($job);

        $reportPath = $this->reportPath($job);

        if (!$reportPath || !file_exists($reportPath)) {
            abort(404, 'Report not found. Generate the report first.');
        }

        $html = file_get_contents($reportPath);

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Check whether a report is available for the given job.
     *
     * GET /api/jobs/{job}/report/status
     */
    public function status(Job $job): JsonResponse
    {
        $this->authorizeJob($job);

        $reportPath = $this->reportPath($job);
        $exists     = $reportPath && file_exists($reportPath);
        $size       = $exists ? filesize($reportPath) : 0;
        $modified   = $exists ? date('c', filemtime($reportPath)) : null;

        return response()->json([
            'data' => [
                'available'  => $exists,
                'size_bytes' => $size,
                'updated_at' => $modified,
            ],
        ]);
    }

    /**
     * Trigger report generation in the background.
     *
     * POST /api/jobs/{job}/report/generate
     */
    public function generate(Job $job): JsonResponse
    {
        $this->authorizeJob($job);

        $outputDir = $this->outputDir($job);
        if (!$outputDir) {
            return response()->json(['error' => 'Job output directory not found.'], 422);
        }

        // Build the Rscript command
        $scriptPath = base_path('scripts/generate_report.R');
        if (!file_exists($scriptPath)) {
            // Fallback path inside the container
            $scriptPath = '/rnadetector/ws/scripts/generate_report.R';
        }

        if (!file_exists($scriptPath)) {
            return response()->json(['error' => 'Report generation script not found.'], 500);
        }

        $jobId   = $job->id ?? $job->getKey();
        $jobType = $job->job_type ?? $job->type ?? 'rnaseq';
        $jobName = $job->name ?? ('Job ' . $jobId);

        // Group colours from job parameters if available
        $groupColors = '{}';
        if (!empty($job->parameters['group_colors'])) {
            $groupColors = json_encode($job->parameters['group_colors']);
        }

        $logFile = storage_path("app/report_generate_{$jobId}.log");

        $cmd = sprintf(
            'nohup Rscript %s --job_id %s --job_type %s --job_name %s --output_dir %s --group_colors %s > %s 2>&1 &',
            escapeshellarg($scriptPath),
            escapeshellarg($jobId),
            escapeshellarg($jobType),
            escapeshellarg($jobName),
            escapeshellarg($outputDir),
            escapeshellarg($groupColors),
            escapeshellarg($logFile)
        );

        exec($cmd);

        return response()->json([
            'message' => 'Report generation started.',
            'status'  => 'generating',
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Resolve the job's output directory.
     */
    private function outputDir(Job $job): ?string
    {
        // Try common attribute names used by RNAdetector Job model
        $candidates = [
            $job->output_dir ?? null,
            $job->output_path ?? null,
            $job->job_output_dir ?? null,
        ];

        // Also check inside parameters array
        if (is_array($job->parameters ?? null)) {
            $candidates[] = $job->parameters['output_dir'] ?? null;
            $candidates[] = $job->parameters['output_path'] ?? null;
        }

        // Convention: /rnadetector/ws/storage/app/jobs/{id}
        $candidates[] = storage_path('app/jobs/' . ($job->id ?? $job->getKey()));

        foreach ($candidates as $dir) {
            if ($dir && is_dir($dir)) {
                return rtrim($dir, '/');
            }
        }

        return null;
    }

    /**
     * Get the expected path to the report HTML file.
     */
    private function reportPath(Job $job): ?string
    {
        $dir = $this->outputDir($job);
        if (!$dir) {
            return null;
        }
        return $dir . '/report.html';
    }

    /**
     * Verify the authenticated user can access this job.
     */
    private function authorizeJob(Job $job): void
    {
        $user = Auth::user();
        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        // Admins can access any job; otherwise the job must belong to the user.
        if (method_exists($user, 'isAdmin') && $user->isAdmin()) {
            return;
        }

        $jobUserId = $job->user_id ?? ($job->parameters['user_id'] ?? null);
        if ($jobUserId && (int) $jobUserId !== (int) $user->id) {
            abort(403, 'You do not have access to this job.');
        }
    }
}
