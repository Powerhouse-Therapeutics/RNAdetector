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
        if (!is_array($volumes)) {
            $volumes = [];
        }
        // Filter out volumes with invalid paths
        $validVolumes = array_filter($volumes, function ($volume) {
            return is_array($volume) && isset($volume['path']) && is_string($volume['path']) && is_dir($volume['path']);
        });
        return response()->json(['data' => array_values($validVolumes)]);
    }

    /**
     * Browse directory contents
     */
    public function browse(Request $request): JsonResponse
    {
        $path = $request->get('path', '/');

        // Sanitize: reject null bytes and excessive length
        if (!is_string($path) || strlen($path) > 4096 || strpos($path, "\0") !== false) {
            abort(400, 'Invalid path parameter.');
        }

        // Security: validate against allowed volumes
        if (!$this->isPathAllowed($path)) {
            abort(403, 'Access to this path is not allowed.');
        }

        $realPath = realpath($path);
        if (!$realPath || !is_dir($realPath)) {
            abort(404, 'Directory not found.');
        }

        // Double-check after resolving symlinks
        if (!$this->isPathAllowed($realPath)) {
            abort(403, 'Access to this path is not allowed (resolved via symlink).');
        }

        $entries = [];
        $items = @scandir($realPath);
        if ($items === false) {
            abort(403, 'Unable to read directory.');
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $fullPath = $realPath . '/' . $item;
            $isDir = is_dir($fullPath);
            $size = null;
            $mtime = 0;
            if (!$isDir) {
                $size = @filesize($fullPath);
                if ($size === false) $size = null;
            }
            $mtime = @filemtime($fullPath);
            $entries[] = [
                'name' => $item,
                'path' => $fullPath,
                'type' => $isDir ? 'directory' : 'file',
                'size' => $size,
                'modified' => $mtime ? date('Y-m-d H:i:s', $mtime) : null,
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

        // Sanitize inputs
        if (!is_string($path) || strlen($path) > 4096 || strpos($path, "\0") !== false) {
            abort(400, 'Invalid path parameter.');
        }
        if (!is_string($pattern) || strlen($pattern) > 255 || strpos($pattern, "\0") !== false) {
            abort(400, 'Invalid search pattern.');
        }
        // Prevent path traversal in pattern
        if (strpos($pattern, '/') !== false || strpos($pattern, '\\') !== false) {
            abort(400, 'Search pattern must not contain path separators.');
        }
        if ($maxResults < 1) {
            $maxResults = 1;
        }

        if (!$this->isPathAllowed($path)) {
            abort(403, 'Access to this path is not allowed.');
        }

        $realPath = realpath($path);
        if (!$realPath || !is_dir($realPath)) {
            abort(404, 'Directory not found.');
        }

        // Double-check resolved path
        if (!$this->isPathAllowed($realPath)) {
            abort(403, 'Access to this path is not allowed (resolved via symlink).');
        }

        $results = [];
        $this->recursiveSearch($realPath, $pattern, $results, $maxResults);

        return response()->json(['data' => $results]);
    }

    private function recursiveSearch(string $dir, string $pattern, array &$results, int $limit, int $depth = 0): void
    {
        if (count($results) >= $limit || $depth > 10) return;

        // Avoid following symlinks outside allowed volumes
        if (is_link($dir)) {
            $resolved = realpath($dir);
            if (!$resolved || !$this->isPathAllowed($resolved)) return;
        }

        $items = @scandir($dir);
        if (!$items || !is_array($items)) return;

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            if (count($results) >= $limit) return;

            $fullPath = $dir . '/' . $item;
            if (is_dir($fullPath)) {
                $this->recursiveSearch($fullPath, $pattern, $results, $limit, $depth + 1);
            } elseif (fnmatch($pattern, $item, FNM_CASEFOLD)) {
                $size = @filesize($fullPath);
                $mtime = @filemtime($fullPath);
                $results[] = [
                    'name' => $item,
                    'path' => $fullPath,
                    'type' => 'file',
                    'size' => ($size !== false) ? $size : null,
                    'modified' => $mtime ? date('Y-m-d H:i:s', $mtime) : null,
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
