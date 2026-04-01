<?php
/**
 * RNADetector Web Service
 *
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
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
     * List all available templates
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
