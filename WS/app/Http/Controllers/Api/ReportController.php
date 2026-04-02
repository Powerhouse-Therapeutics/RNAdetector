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

        if ($job->status !== Job::COMPLETED) {
            abort(422, 'Report is only available for completed jobs.');
        }

        $reportPath = $this->reportPath($job);

        if (!$reportPath || !file_exists($reportPath)) {
            abort(404, 'Report not found. Generate the report first.');
        }

        if (!is_readable($reportPath)) {
            abort(500, 'Report file exists but is not readable.');
        }

        $html = @file_get_contents($reportPath);
        if ($html === false) {
            abort(500, 'Failed to read the report file.');
        }

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
        $size       = $exists ? @filesize($reportPath) : 0;
        $mtime      = $exists ? @filemtime($reportPath) : false;
        $modified   = ($exists && $mtime !== false) ? date('c', $mtime) : null;

        // Check if generation is in progress
        $generating = false;
        $jobId = $job->id ?? $job->getKey();
        $logFile = storage_path('app/report_generate_' . preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$jobId) . '.log');
        if (!$exists && file_exists($logFile)) {
            // Log file exists but report doesn't -- generation may be in progress
            $logMtime = @filemtime($logFile);
            if ($logMtime && (time() - $logMtime) < 600) {
                $generating = true;
            }
        }

        return response()->json([
            'data' => [
                'available'  => $exists,
                'size_bytes' => ($size !== false) ? $size : 0,
                'updated_at' => $modified,
                'generating' => $generating,
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

        if ($job->status !== Job::COMPLETED) {
            return response()->json(['error' => 'Reports can only be generated for completed jobs.'], 422);
        }

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
        $jobType = $job->job_type ?? 'rnaseq';
        $jobName = $job->name ?? ('Job ' . $jobId);

        // Sanitize job name to prevent shell injection (escapeshellarg handles this,
        // but belt-and-suspenders)
        if (!is_string($jobName)) {
            $jobName = 'Job ' . $jobId;
        }

        // Group colours from job parameters if available
        $groupColors = '{}';
        $jobParams = $job->job_parameters;
        if (is_array($jobParams) && !empty($jobParams['group_colors']) && is_array($jobParams['group_colors'])) {
            $encoded = json_encode($jobParams['group_colors']);
            if ($encoded !== false) {
                $groupColors = $encoded;
            }
        }

        $logDir = storage_path('app');
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0777, true);
        }
        $logFile = $logDir . '/report_generate_' . preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$jobId) . '.log';

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
        $dir = $job->getAbsoluteJobDirectory();
        if ($dir && is_dir($dir)) {
            return rtrim($dir, '/');
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
        $user = Auth::guard('api')->user();
        if (!$user) {
            $user = Auth::user();
        }
        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        // Admins can access any job; otherwise the job must belong to the user.
        if (property_exists($user, 'admin') && $user->admin) {
            return;
        }
        if (method_exists($user, 'isAdmin') && $user->isAdmin()) {
            return;
        }

        $jobUserId = $job->user_id;
        if ($jobUserId === null) {
            $jobParams = $job->job_parameters;
            if (is_array($jobParams) && isset($jobParams['user_id'])) {
                $jobUserId = $jobParams['user_id'];
            }
        }
        if ($jobUserId && (int) $jobUserId !== (int) $user->id) {
            abort(403, 'You do not have access to this job.');
        }
    }
}
