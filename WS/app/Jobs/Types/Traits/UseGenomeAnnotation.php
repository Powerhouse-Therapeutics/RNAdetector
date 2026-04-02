<?php
/**
 * RNADetector Web Service
 *
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

namespace App\Jobs\Types\Traits;


use App\Exceptions\ProcessingJobException;
use App\Models\Annotation;

trait UseGenomeAnnotation
{

    /**
     * @var Annotation|null
     */
    private $genomeAnnotation = null;

    /**
     * Checks if a valid Genome Annotation has been provided
     *
     * @param  \App\Models\Annotation|null  $genomeAnnotation
     *
     * @throws \App\Exceptions\ProcessingJobException
     */
    private function checkGenomeAnnotation(?Annotation $genomeAnnotation): void
    {
        if ($genomeAnnotation === null || !$genomeAnnotation->isGtf()) {
            throw new ProcessingJobException('An invalid genome annotation has been provided');
        }
    }

    /**
     * Get the current Genome Annotation
     *
     * @param  string  $defaults
     * @param  bool  $checks
     *
     * @return \App\Models\Annotation
     * @throws \App\Exceptions\ProcessingJobException
     */
    private function getGenomeAnnotation(string $defaults = 'human_rna_annotation_name', bool $checks = true): Annotation
    {
        if ($this->genomeAnnotation === null) {
            $annotationName = $this->getParameter('annotation');

            if (!empty($annotationName)) {
                $this->genomeAnnotation = Annotation::whereName($annotationName)->first();
            }

            // If no annotation found by explicit name, try to derive from the genome name
            if ($this->genomeAnnotation === null) {
                $genomeName = $this->getParameter('genome', '');
                if (!empty($genomeName)) {
                    // Try <genome>_annotation (e.g. Mouse_mm39_genome_annotation)
                    $this->genomeAnnotation = Annotation::whereName($genomeName . '_annotation')->first();
                }
            }

            // Fall back to config default
            if ($this->genomeAnnotation === null) {
                $defaultName = config('rnadetector.' . $defaults);
                if (!empty($defaultName)) {
                    $this->genomeAnnotation = Annotation::whereName($defaultName)->first();
                }
            }
        }
        if ($checks) {
            $this->checkGenomeAnnotation($this->genomeAnnotation);
        }

        return $this->genomeAnnotation;
    }

}
