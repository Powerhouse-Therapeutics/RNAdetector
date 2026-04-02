<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\InstallPackage;
use App\Packages;
use App\SystemInfo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ServerController extends Controller
{
    /**
     * Returns system info, disk usage, and queue stats
     */
    public function status(): JsonResponse
    {
        $systemInfo = new SystemInfo();

        $totalKb = $systemInfo->maxMemory();
        $availKb = $systemInfo->availableMemory();
        $cores = $systemInfo->numCores();
        $usedCores = $systemInfo->usedCores();

        $uptimeSeconds = 0;
        if (file_exists('/proc/uptime')) {
            $raw = @file_get_contents('/proc/uptime');
            if ($raw) {
                $uptimeSeconds = (int) floatval(explode(' ', $raw)[0]);
            }
        }
        $days = intdiv($uptimeSeconds, 86400);
        $hours = intdiv($uptimeSeconds % 86400, 3600);
        $uptime = $days > 0 ? "{$days}d {$hours}h" : "{$hours}h";

        return response()->json(['data' => [
            'version'             => \App\Utils::VERSION ?? '0.0.3',
            'cores'               => $cores,
            'used_cores'          => $usedCores,
            'total_memory_gb'     => round($totalKb / 1048576, 1),
            'available_memory_gb' => round($availKb / 1048576, 1),
            'docker_running'      => true,
            'uptime'              => $uptime,
        ]]);
    }

    /**
     * Lists all packages (installed + available)
     */
    public function packages(): JsonResponse
    {
        $packagesManager = new Packages();
        $available = $packagesManager->fetchNotInstalled();

        return response()->json([
            'data' => $available,
        ]);
    }

    /**
     * Dispatches an InstallPackage job
     */
    public function install(string $name): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = \Auth::user();
        if (!$user || !$user->admin) {
            abort(403, 'Only administrators can install packages.');
        }

        $packagesManager = new Packages();
        $package = $packagesManager->fetchOne($name);

        if ($package === null) {
            abort(404, 'Package not found in the repository.');
        }

        if (Packages::isPackageInstalled($name) && !$packagesManager->canBeUpdated($name)) {
            return response()->json([
                'message' => 'Package is already installed and up to date.',
            ], 409);
        }

        // Check if installation is already in progress
        $cacheKey = 'package_install_' . $name;
        $currentStatus = Cache::get($cacheKey);
        if ($currentStatus && isset($currentStatus['status']) && $currentStatus['status'] === 'running') {
            return response()->json([
                'message' => 'Package installation is already in progress.',
                'progress' => $currentStatus,
            ], 409);
        }

        // Initialize progress tracking
        Cache::put($cacheKey, [
            'status' => 'queued',
            'progress' => 0,
            'message' => 'Installation queued.',
        ], now()->addHours(2));

        // Dispatch the job
        InstallPackage::dispatch($name);

        return response()->json([
            'message' => 'Package installation has been queued.',
            'package' => $name,
        ], 202);
    }

    /**
     * Returns the installation progress for a package
     */
    public function installStatus(string $name): JsonResponse
    {
        $cacheKey = 'package_install_' . $name;
        $status = Cache::get($cacheKey);

        if ($status === null) {
            // Check if installed
            if (Packages::isPackageInstalled($name)) {
                return response()->json([
                    'data' => [
                        'status' => 'completed',
                        'progress' => 100,
                        'message' => 'Package is installed.',
                    ],
                ]);
            }

            return response()->json([
                'data' => [
                    'status' => 'unknown',
                    'progress' => 0,
                    'message' => 'No installation record found.',
                ],
            ]);
        }

        return response()->json(['data' => $status]);
    }
}
