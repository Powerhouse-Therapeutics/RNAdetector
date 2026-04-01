<?php
/**
 * RNADetector Web Service
 *
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

namespace App;

use App\Jobs\Types\Factory;
use App\Models\Job;
use Cache;
use Throwable;

final class SystemInfo
{

    /**
     * Checks if the update script should be executed
     *
     * @return bool
     */
    public function isUpdateNeeded(): bool
    {
        $versionNumberFile = storage_path('app/version_number');
        if (!file_exists($versionNumberFile)) {
            return false;
        }
        $content = json_decode(file_get_contents($versionNumberFile), true);
        $version = $content['version'] ?? Utils::DEFAULT_VERSION_NUMBER;

        return Utils::VERSION_NUMBER > $version;
    }

    /**
     * Find how much memory this machine has
     *
     * @return int
     */
    public function maxMemory(): int
    {
        if (Cache::has('availableMemory')) {
            return Cache::get('availableMemory');
        }
        $fh = @fopen('/proc/meminfo', 'rb');
        if (!$fh) {
            return -1;
        }
        $mem = -1;
        while ($line = fgets($fh)) {
            $pieces = [];
            if (preg_match('/^MemTotal:\s+(\d+)\skB$/', $line, $pieces)) {
                $mem = (int)$pieces[1];
                break;
            }
        }
        @fclose($fh);
        Cache::put('availableMemory', $mem, now()->addDay());

        return $mem;
    }

    /**
     * Find how much memory is still available on the machine
     *
     * @return int
     */
    public function availableMemory(): int
    {
        if (Cache::has('availableMemory')) {
            return Cache::get('availableMemory');
        }
        $fh = @fopen('/proc/meminfo', 'rb');
        if (!$fh) {
            return -1;
        }
        $mem = -1;
        while ($line = fgets($fh)) {
            $pieces = [];
            if (preg_match('/^MemAvailable:\s+(\d+)\skB$/', $line, $pieces)) {
                $mem = (int)$pieces[1];
                break;
            }
        }
        @fclose($fh);
        Cache::put('availableMemory', $mem, now()->addMinute());

        return $mem;
    }

    /**
     * Count the number of cores available for this machine
     *
     * @return int
     */
    public function numCores(): int
    {
        if (Cache::has('numCores')) {
            return Cache::get('numCores');
        }
        $cpuInfo = file_get_contents('/proc/cpuinfo');
        preg_match_all('/^processor/m', $cpuInfo, $matches);
        $count = count($matches[0]);
        Cache::put('numCores', $count, now()->addDay());

        return $count;
    }

    /**
     * Detect how much cpu cores will be used by the last two analysis.
     * For the detection we take the last 10 jobs to find the maximum number of user threads.
     * Then it multiplies this values by 2 to get a rough estimate.
     * If all jobs are within boundaries (< 1/3 * CPU cores) the number is a correct estimation.
     *
     * @return int
     */
    public function usedCores(): int
    {
        try {
            $jobs = Job::whereIn('status', [Job::QUEUED, Job::PROCESSING])->latest()->take(10)->get();

            if ($jobs->count() === 1) {
                return Factory::get($jobs->first())->threads();
            }

            return (2 * $jobs->map(
                    static function (Job $job) {
                        return Factory::get($job)->threads();
                    }
                )->max());
        } catch (Throwable $ignore) {
        }

        return 1;
    }

    /**
     * Returns resource recommendations for different analysis types
     *
     * @return array
     */
    public function resourceRecommendations(): array
    {
        $cores = $this->numCores();
        $memGB = (int)round($this->maxMemory() / 1024 / 1024);
        return [
            'server' => [
                'totalCores' => $cores,
                'totalMemoryGB' => $memGB,
                'availableMemoryGB' => (int)round($this->availableMemory() / 1024 / 1024),
                'usedCores' => $this->usedCores(),
            ],
            'defaults' => ['threads' => 16, 'memory_gb' => 32],
            'recommendations' => [
                'long_rna'  => ['min_threads' => 4, 'rec_threads' => min(16, $cores), 'min_mem_gb' => 16, 'rec_mem_gb' => min(32, $memGB)],
                'small_rna' => ['min_threads' => 4, 'rec_threads' => min(16, $cores), 'min_mem_gb' => 8,  'rec_mem_gb' => min(32, $memGB)],
                'circ_rna'  => ['min_threads' => 4, 'rec_threads' => min(16, $cores), 'min_mem_gb' => 16, 'rec_mem_gb' => min(32, $memGB)],
                'diff_expr' => ['min_threads' => 2, 'rec_threads' => min(8, $cores),  'min_mem_gb' => 8,  'rec_mem_gb' => min(16, $memGB)],
                'pathway'   => ['min_threads' => 2, 'rec_threads' => min(4, $cores),  'min_mem_gb' => 4,  'rec_mem_gb' => min(8, $memGB)],
            ],
        ];
    }

    /**
     * Transforms this object in an array
     *
     * @return array
     */
    public function toArray(): array
    {
        return array_merge(
            [
                'data' => [
                    'containerVersion'       => Utils::VERSION,
                    'containerVersionNumber' => Utils::VERSION_NUMBER,
                    'maxMemory'              => $this->maxMemory(),
                    'availableMemory'        => $this->availableMemory(),
                    'numCores'               => $this->numCores(),
                    'usedCores'              => $this->usedCores(),
                ],
            ],
            $this->resourceRecommendations()
        );
    }
}
