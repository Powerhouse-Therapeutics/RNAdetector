<?php

return [

    'is_cloud'                        => env('CLOUD_ENV', false),

    /*
     * Definition of default paths
     */
    'annotations_path'                => env('ANNOTATIONS_PATH', '/rnadetector/ws/storage/app/annotations/'),
    'reference_path'                  => env('REFERENCES_PATH', '/rnadetector/ws/storage/app/references/'),
    'scripts_path'                    => env('BASH_SCRIPT_PATH', '/rnadetector/scripts/'),

    /*
     * Definition of default human genomes
     */
    'human_genome_name'               => env('HUMAN_GENOME_NAME', 'Human_hg19_genome'),
    'human_transcriptome_name'        => env('HUMAN_TRANSCRIPTOME_NAME', 'Human_hg19_transcriptome'),
    'human_transcriptome_sncrna_name' => env('HUMAN_TRANSCRIPTOME_SNCRNA_NAME', 'Human_hg19_sncRNA_transcriptome'),
    'human_circ_annotation_name'      => env('HUMAN_CIRC_ANNOTATION_NAME', 'Human_hg19_circRNAs'),
    'human_sncrna_annotation_name'    => env('HUMAN_SNCRNA_ANNOTATION_NAME', 'Human_hg19_small_ncRNAs'),
    'human_rna_annotation_name'       => env('HUMAN_RNA_ANNOTATION_NAME', 'Human_hg19_RNAs'),

    /*
     * Browsable volumes for the file browser
     */
    'browsable_volumes'               => array_filter(array_map(function ($entry) {
        $parts = explode(':', trim($entry), 2);
        if (count($parts) === 2) {
            return ['path' => $parts[0], 'label' => $parts[1]];
        } elseif (count($parts) === 1 && !empty($parts[0])) {
            return ['path' => $parts[0], 'label' => basename($parts[0])];
        }
        return null;
    }, explode(',', env('BROWSABLE_VOLUMES', '/rnadetector/ws/storage/app/public:Job Outputs')))),

];
