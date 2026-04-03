<?php

/**
 * RNADetector Web Service
 *
 * @author A. La Ferlita, Ph.D. Student <alessandrolf90 at hotmail dot it>
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

namespace App\Jobs\Types;


use App\Exceptions\ProcessingJobException;
use App\Jobs\Types\Traits\HasCommonParameters;
use App\Models\Job;
use App\Utils;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PathwayAnalysisJobType extends AbstractJob
{
    use HasCommonParameters;

    private const VALID_ORGANISMS = ['hsa', 'mmu', 'rno'];

    /**
     * Returns an array containing for each input parameter an help detailing its content and use.
     *
     * @return array
     */
    public static function parametersSpec(): array
    {
        return [
            'degs_analysis' => 'The DEGs analysis from which data are gathered',
            'degs'          => [
                'p_cutoff'      => 'a p-value cutoff for exporting differentially genes (default: 0.05)',
                'p_use_fdr'     => 'boolean indicating whether p-value cutoff is applied to FDR p-values (default: TRUE)',
                'lfc_threshold' => 'minimum absolute Log-Fold-Change cutoff for exporting differentially genes (default: 0)',
            ],
            'pathways'      => [
                'organism'  => 'the organism to use for pathway analysis (default: hsa). Supported values are: hsa, mmu, rno.',
                'p_cutoff'  => 'a p-value cutoff for exporting significantly impacted pathways (default: 0.05)',
                'p_use_fdr' => 'boolean indicating whether p-value cutoff is applied to FDR p-values (default: TRUE)',
            ],
            'go_enrichment' => [
                'enabled'   => 'Enable GO term enrichment analysis (default: true)',
                'ontology'  => 'GO ontology: BP, MF, CC, or ALL (default: ALL)',
            ],
            'gsea' => [
                'enabled'   => 'Enable Gene Set Enrichment Analysis (default: true)',
            ],
        ];
    }

    /**
     * @inheritDoc
     */
    public function threads(): int
    {
        return 1;
    }


    /**
     * Returns an array containing for each output value an help detailing its use.
     *
     * @return array
     */
    public static function outputSpec(): array
    {
        return [
            'outputFile' => 'Archive containing report file.',
            'reportFile' => 'Path of the report index file.',
        ];
    }

    /**
     * Returns an array containing rules for input validation.
     *
     * @param  \Illuminate\Http\Request  $request
     *
     * @return array
     */
    public static function validationSpec(Request $request): array
    {
        return [
            'degs_analysis'      => ['required', Rule::exists('jobs', 'id')],
            'degs'               => ['filled', 'array'],
            'degs.p_cutoff'      => ['filled', 'numeric', 'min:0', 'max:1'],
            'degs.p_use_fdr'     => ['filled', 'boolean'],
            'degs.lfc_threshold' => ['filled', 'numeric'],
            'pathways'               => ['filled', 'array'],
            'pathways.organism'      => ['filled', Rule::in(self::VALID_ORGANISMS)],
            'pathways.p_cutoff'      => ['filled', 'numeric', 'min:0', 'max:1'],
            'pathways.p_use_fdr'     => ['filled', 'boolean'],
            'go_enrichment'          => ['filled', 'array'],
            'go_enrichment.enabled'  => ['filled', 'boolean'],
            'go_enrichment.ontology' => ['filled', Rule::in(['BP', 'MF', 'CC', 'ALL'])],
            'gsea'                   => ['filled', 'array'],
            'gsea.enabled'           => ['filled', 'boolean'],
        ];
    }

    /**
     * Handles all the computation for this job.
     * This function should throw a ProcessingJobException if something went wrong during the computation.
     * If no exceptions are thrown the job is considered as successfully completed.
     *
     * @throws \App\Exceptions\ProcessingJobException
     */
    public function handle(): void
    {
        $this->log('Starting pathway analysis.');
        $degsAnalysisId = $this->getParameter('degs_analysis');
        if (empty($degsAnalysisId)) {
            throw new ProcessingJobException('DEGs analysis job ID is required.');
        }
        $degsAnalysis = Job::whereId($degsAnalysisId)->first();
        if ($degsAnalysis === null) {
            throw new ProcessingJobException('DEGs analysis job not found (ID: ' . $degsAnalysisId . ').');
        }
        $degsParameters = (array)$this->getParameter('degs', []);
        $pathwayParameters = (array)$this->getParameter('pathways', []);
        $degsParameters['p_cutoff'] = $degsParameters['p_cutoff'] ?? 0.05;
        $degsParameters['p_use_fdr'] = $degsParameters['p_use_fdr'] ?? true;
        $degsParameters['lfc_threshold'] = $degsParameters['lfc_threshold'] ?? 0;
        $pathwayParameters['p_cutoff'] = $pathwayParameters['p_cutoff'] ?? 0.05;
        $pathwayParameters['p_use_fdr'] = $pathwayParameters['p_use_fdr'] ?? true;
        $pathwayParameters['organism'] = $pathwayParameters['organism'] ?? self::VALID_ORGANISMS[0];
        // Validate numeric ranges
        $degsParameters['p_cutoff'] = max(0, min(1, (float)$degsParameters['p_cutoff']));
        $degsParameters['lfc_threshold'] = (float)$degsParameters['lfc_threshold'];
        $pathwayParameters['p_cutoff'] = max(0, min(1, (float)$pathwayParameters['p_cutoff']));
        if (!in_array($pathwayParameters['organism'], self::VALID_ORGANISMS, true)) {
            throw new ProcessingJobException('Invalid organism: ' . $pathwayParameters['organism'] . '. Valid values: ' . implode(', ', self::VALID_ORGANISMS));
        }
        if ($degsAnalysis->job_type !== 'diff_expr_analysis_job_type') {
            throw new ProcessingJobException('DEGs analysis error: job type invalid.');
        }
        $degsOutput = $degsAnalysis->job_output;
        if (!is_array($degsOutput) || empty($degsOutput)) {
            throw new ProcessingJobException('DEGs analysis job has no output data.');
        }
        $degReportFile = isset($degsOutput['reportFile']) && is_array($degsOutput['reportFile'])
            ? ($degsOutput['reportFile']['path'] ?? null)
            : null;
        if (!$degReportFile) {
            throw new ProcessingJobException('The selected DEGs analysis does not contain any result.');
        }
        $degReportFileAbsolute = $degsAnalysis->absoluteJobPath($degReportFile);
        if (!file_exists($degReportFileAbsolute)) {
            throw new ProcessingJobException('The selected DEGs analysis does not contain any result.');
        }
        $degReportDirectory = dirname($degReportFileAbsolute);
        $pathReportDirectory = $this->model->getJobFile('pathway_report_');
        $pathReport = $this->model->absoluteJobPath($pathReportDirectory);
        $pathReportUrl = \Storage::disk('public')->url($pathReportDirectory);
        $command = [
            'Rscript',
            self::scriptPath('pathway_analysis.R'),
            '-i',
            $degReportDirectory,
            '-o',
            $pathReport,
            '--degs-p',
            $degsParameters['p_cutoff'],
            '--degs-lfc',
            $degsParameters['lfc_threshold'],
            '--path-org',
            $pathwayParameters['organism'],
            '--path-p',
            $pathwayParameters['p_cutoff'],
        ];
        if (!$degsParameters['p_use_fdr']) {
            $command[] = '--degs-no-fdr';
        }
        if (!$pathwayParameters['p_use_fdr']) {
            $command[] = '--path-no-fdr';
        }
        if ($this->getParameter('go_enrichment.enabled', true)) {
            $command[] = '--enable-go';
        }
        if ($this->getParameter('gsea.enabled', true)) {
            $command[] = '--enable-gsea';
        }
        AbstractJob::runCommand(
            $command,
            $this->model->getAbsoluteJobDirectory(),
            null,
            function ($type, $buffer) {
                $this->log($buffer, false);
            }
        );
        if (!file_exists($pathReport) || !is_dir($pathReport) || !file_exists($pathReport . '/index.html')) {
            throw new ProcessingJobException('Unable to create output report.');
        }
        Utils::recursiveChmod($pathReport, 0777);
        $this->log('Pathway Analysis completed.');
        $pathReportZip = $this->model->getJobFile('pathway_report_', '.zip');
        $pathReportZipAbsolute = $this->model->absoluteJobPath($pathReportZip);
        $pathReportZipUrl = \Storage::disk('public')->url($pathReportZip);
        $this->log('Building report archive.');
        if (!Utils::makeZipArchive($pathReport, $pathReportZipAbsolute)) {
            throw new ProcessingJobException('Unknown error during output archive creation.');
        }
        @chmod($pathReportZipAbsolute, 0777);
        if (!file_exists($pathReportZipAbsolute)) {
            throw new ProcessingJobException('Unable to create output archive.');
        }
        $this->log('Archive built.');
        $this->setOutput(
            [
                'type'       => self::OUT_TYPE_ANALYSIS_REPORT,
                'outputFile' => ['path' => $pathReportZip, 'url' => $pathReportZipUrl],
                'reportFile' => ['path' => $pathReportDirectory . '/index.html', 'url' => $pathReportUrl . '/index.html'],
            ]
        );
        $this->model->save();
        // Check for enhanced pathway analysis report
        $enhancedReportPath = $pathReportDirectory . '/pathway_analysis_report.html';
        $enhancedReportAbsolute = $this->model->absoluteJobPath($enhancedReportPath);
        if (file_exists($enhancedReportAbsolute)) {
            $enhancedReportUrl = \Storage::disk('public')->url($enhancedReportPath);
            $this->setOutput('enhancedReportFile', ['path' => $enhancedReportPath, 'url' => $enhancedReportUrl]);
            $this->model->save();
        }
        // Run standalone fgsea-based GSEA analysis if enabled
        $enableFgsea = (bool)($this->getParameter('gsea.enabled', true));
        if ($enableFgsea) {
            $this->log('Running Gene Set Enrichment Analysis (fgsea)...');
            $gseaOutputDir = $this->model->getJobFile('gsea_report_');
            $gseaReport = $this->model->absoluteJobPath($gseaOutputDir);
            try {
                AbstractJob::runCommand(
                    [
                        'Rscript',
                        self::scriptPath('gsea_analysis.R'),
                        '-i',
                        $degReportDirectory,
                        '-o',
                        $gseaReport,
                        '--organism',
                        $pathwayParameters['organism'],
                        '--p-cutoff',
                        $pathwayParameters['p_cutoff'],
                    ],
                    $this->model->getAbsoluteJobDirectory(),
                    null,
                    function ($type, $buffer) {
                        $this->log($buffer, false);
                    }
                );
                if (file_exists($gseaReport) && is_dir($gseaReport)) {
                    Utils::recursiveChmod($gseaReport, 0777);
                    $gseaReportUrl = \Storage::disk('public')->url($gseaOutputDir);
                    $gseaIndexPath = $gseaOutputDir . '/gsea_report/index.html';
                    $gseaIndexAbsolute = $this->model->absoluteJobPath($gseaIndexPath);
                    if (file_exists($gseaIndexAbsolute)) {
                        $gseaIndexUrl = \Storage::disk('public')->url($gseaIndexPath);
                        $this->setOutput('gseaReportFile', ['path' => $gseaIndexPath, 'url' => $gseaIndexUrl]);
                        $this->model->save();
                    }
                }
                $this->log('GSEA analysis (fgsea) completed.');
            } catch (\Throwable $e) {
                $this->log('Warning: GSEA analysis (fgsea) failed: ' . $e->getMessage());
            }
        }
    }

    /**
     * Returns a description for this job
     *
     * @return string
     */
    public static function description(): string
    {
        return 'Runs pathway analysis';
    }

    /**
     * @inheritDoc
     */
    public static function displayName(): string
    {
        return 'Pathway Analysis';
    }
}
