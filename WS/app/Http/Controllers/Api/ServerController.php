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

        $diskTotal = disk_total_space('/');
        $diskFree = disk_free_space('/');

        $data = $systemInfo->toArray();
        $data['data']['disk'] = [
            'total' => $diskTotal,
            'free' => $diskFree,
            'used' => $diskTotal - $diskFree,
            'usage_percent' => round((($diskTotal - $diskFree) / $diskTotal) * 100, 2),
        ];

        $data['data']['queue'] = [
            'queued' => \App\Models\Job::where('status', \App\Models\Job::QUEUED)->count(),
            'processing' => \App\Models\Job::where('status', \App\Models\Job::PROCESSING)->count(),
            'completed' => \App\Models\Job::where('status', \App\Models\Job::COMPLETED)->count(),
            'failed' => \App\Models\Job::where('status', \App\Models\Job::FAILED)->count(),
        ];

        return response()->json($data);
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
