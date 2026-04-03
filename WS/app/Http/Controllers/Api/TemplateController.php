<?php
/**
 * RNADetector Web Service
 *
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TemplateController extends Controller
{
    /**
     * Available templates with their descriptions
     *
     * @var array
     */
    private const TEMPLATES = [
        'metadata_single_end' => [
            'name'        => 'metadata_single_end',
            'description' => 'Metadata template for single-end RNA-seq experiments',
            'format'      => 'tsv',
            'filename'    => 'metadata_single_end.tsv',
        ],
        'metadata_paired_end' => [
            'name'        => 'metadata_paired_end',
            'description' => 'Metadata template for paired-end RNA-seq experiments',
            'format'      => 'tsv',
            'filename'    => 'metadata_paired_end.tsv',
        ],
        'sample_groups'       => [
            'name'        => 'sample_groups',
            'description' => 'Template for defining sample groups for differential expression analysis',
            'format'      => 'tsv',
            'filename'    => 'sample_groups.tsv',
        ],
        'contrasts'           => [
            'name'        => 'contrasts',
            'description' => 'Template for defining contrasts between experimental conditions',
            'format'      => 'tsv',
            'filename'    => 'contrasts.tsv',
        ],
    ];

    /**
     * Directory for saved analysis templates
     *
     * @return string
     */
    private function analysisTemplatesDir(): string
    {
        $dir = storage_path('app/templates');
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        return $dir;
    }

    /**
     * Load all saved analysis templates from disk
     *
     * @return array
     */
    private function loadAnalysisTemplates(): array
    {
        $dir = $this->analysisTemplatesDir();
        $files = glob($dir . '/*.json');
        $templates = [];
        foreach ($files as $file) {
            $content = file_get_contents($file);
            if ($content === false) {
                continue;
            }
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                $templates[] = $decoded;
            }
        }
        // Sort by created_at descending
        usort($templates, function ($a, $b) {
            $aTime = isset($a['created_at']) ? $a['created_at'] : '';
            $bTime = isset($b['created_at']) ? $b['created_at'] : '';
            return strcmp($bTime, $aTime);
        });
        return $templates;
    }

    /**
     * List all available templates (metadata + analysis)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => array_values(self::TEMPLATES),
        ]);
    }

    /**
     * List saved analysis templates
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function listAnalysisTemplates(): JsonResponse
    {
        return response()->json([
            'data' => $this->loadAnalysisTemplates(),
        ]);
    }

    /**
     * Save a new analysis template
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeAnalysisTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type'        => 'required|string|max:100',
            'parameters'  => 'required|array',
        ]);

        $userId = \Auth::id();
        if (empty($userId)) {
            abort(401, 'Authentication required.');
        }

        $id = time() . '_' . $userId . '_' . substr(md5(uniqid('', true)), 0, 8);

        $template = [
            'id'          => $id,
            'name'        => $validated['name'],
            'description' => isset($validated['description']) ? $validated['description'] : '',
            'type'        => $validated['type'],
            'parameters'  => $validated['parameters'],
            'user_id'     => $userId,
            'created_at'  => date('Y-m-d\TH:i:s.000000\Z'),
        ];

        $path = $this->analysisTemplatesDir() . '/' . $id . '.json';
        file_put_contents($path, json_encode($template, JSON_PRETTY_PRINT));

        return response()->json([
            'data'    => $template,
            'message' => 'Template saved successfully.',
        ], 201);
    }

    /**
     * Delete a saved analysis template
     *
     * @param string $id
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroyAnalysisTemplate(string $id): JsonResponse
    {
        $path = $this->analysisTemplatesDir() . '/' . basename($id) . '.json';

        if (!file_exists($path)) {
            throw new NotFoundHttpException("Analysis template not found.");
        }

        $content = file_get_contents($path);
        $template = json_decode($content, true);

        // Check ownership (allow admins)
        $user = \Auth::user();
        if ($user && !$user->admin && isset($template['user_id']) && $template['user_id'] !== $user->id) {
            abort(403, 'You are not authorized to delete this template.');
        }

        unlink($path);

        return response()->json([
            'message' => 'Template deleted successfully.',
            'errors'  => false,
        ]);
    }

    /**
     * Download a template file
     *
     * @param string $name
     *
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function download(string $name): BinaryFileResponse
    {
        if (!isset(self::TEMPLATES[$name])) {
            throw new NotFoundHttpException("Template '{$name}' not found.");
        }

        $template = self::TEMPLATES[$name];
        $filePath = resource_path('templates/' . $template['filename']);

        if (!file_exists($filePath)) {
            throw new NotFoundHttpException("Template file not found.");
        }

        return response()->download($filePath, $template['filename'], [
            'Content-Type' => 'text/tab-separated-values',
        ]);
    }
}
