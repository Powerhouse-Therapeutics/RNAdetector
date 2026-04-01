<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FileBrowserController extends Controller
{
    /**
     * List configured browsable volumes
     */
    public function volumes(): JsonResponse
    {
        $volumes = config('rnadetector.browsable_volumes', []);
        return response()->json(['data' => $volumes]);
    }

    /**
     * Browse directory contents
     */
    public function browse(Request $request): JsonResponse
    {
        $path = $request->get('path', '/');

        // Security: validate against allowed volumes
        if (!$this->isPathAllowed($path)) {
            abort(403, 'Access to this path is not allowed.');
        }

        $realPath = realpath($path);
        if (!$realPath || !is_dir($realPath)) {
            abort(404, 'Directory not found.');
        }

        $entries = [];
        $items = scandir($realPath);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $fullPath = $realPath . '/' . $item;
            $isDir = is_dir($fullPath);
            $entries[] = [
                'name' => $item,
                'path' => $fullPath,
                'type' => $isDir ? 'directory' : 'file',
                'size' => $isDir ? null : filesize($fullPath),
                'modified' => date('Y-m-d H:i:s', filemtime($fullPath)),
                'extension' => $isDir ? null : pathinfo($item, PATHINFO_EXTENSION),
            ];
        }

        // Sort: directories first, then files alphabetically
        usort($entries, function ($a, $b) {
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'directory' ? -1 : 1;
            }
            return strcasecmp($a['name'], $b['name']);
        });

        return response()->json([
            'data' => $entries,
            'current_path' => $realPath,
            'parent_path' => dirname($realPath),
        ]);
    }

    /**
     * Search for files matching a pattern
     */
    public function search(Request $request): JsonResponse
    {
        $path = $request->get('path', '/');
        $pattern = $request->get('pattern', '*');
        $maxResults = min((int)$request->get('limit', 100), 500);

        if (!$this->isPathAllowed($path)) {
            abort(403, 'Access to this path is not allowed.');
        }

        $realPath = realpath($path);
        if (!$realPath || !is_dir($realPath)) {
            abort(404, 'Directory not found.');
        }

        $results = [];
        $this->recursiveSearch($realPath, $pattern, $results, $maxResults);

        return response()->json(['data' => $results]);
    }

    private function recursiveSearch(string $dir, string $pattern, array &$results, int $limit, int $depth = 0): void
    {
        if (count($results) >= $limit || $depth > 10) return;

        $items = @scandir($dir);
        if (!$items) return;

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            if (count($results) >= $limit) return;

            $fullPath = $dir . '/' . $item;
            if (is_dir($fullPath)) {
                $this->recursiveSearch($fullPath, $pattern, $results, $limit, $depth + 1);
            } elseif (fnmatch($pattern, $item, FNM_CASEFOLD)) {
                $results[] = [
                    'name' => $item,
                    'path' => $fullPath,
                    'type' => 'file',
                    'size' => filesize($fullPath),
                    'modified' => date('Y-m-d H:i:s', filemtime($fullPath)),
                    'extension' => pathinfo($item, PATHINFO_EXTENSION),
                ];
            }
        }
    }

    private function isPathAllowed(string $path): bool
    {
        $realPath = realpath($path);
        if (!$realPath) return false;

        $allowedPaths = config('rnadetector.browsable_volumes', []);
        foreach ($allowedPaths as $volume) {
            $volumePath = realpath($volume['path'] ?? '');
            if ($volumePath && strpos($realPath, $volumePath) === 0) {
                return true;
            }
        }

        // Also allow the storage/app directory
        $storagePath = realpath(storage_path('app'));
        if ($storagePath && strpos($realPath, $storagePath) === 0) {
            return true;
        }

        return false;
    }
}
