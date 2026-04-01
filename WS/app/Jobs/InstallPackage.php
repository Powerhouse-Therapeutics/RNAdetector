<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Process;
use Throwable;

class InstallPackage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The maximum number of seconds the job can run.
     *
     * @var int
     */
    public $timeout = 7200;

    /**
     * @var string
     */
    protected $packageName;

    /**
     * Create a new job instance.
     *
     * @param string $packageName
     */
    public function __construct(string $packageName)
    {
        $this->packageName = $packageName;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(): void
    {
        $cacheKey = 'package_install_' . $this->packageName;

        try {
            Cache::put($cacheKey, [
                'status' => 'running',
                'progress' => 10,
                'message' => 'Starting installation...',
            ], now()->addHours(2));

            $process = new Process([
                'php',
                base_path('artisan'),
                'packages:install',
                $this->packageName,
            ]);

            $process->setTimeout($this->timeout);

            Cache::put($cacheKey, [
                'status' => 'running',
                'progress' => 20,
                'message' => 'Downloading and installing package...',
            ], now()->addHours(2));

            $process->run(function ($type, $buffer) use ($cacheKey) {
                $current = Cache::get($cacheKey, []);
                $progress = min(($current['progress'] ?? 20) + 1, 90);
                Cache::put($cacheKey, [
                    'status' => 'running',
                    'progress' => $progress,
                    'message' => trim($buffer),
                ], now()->addHours(2));
            });

            if ($process->isSuccessful()) {
                Cache::put($cacheKey, [
                    'status' => 'completed',
                    'progress' => 100,
                    'message' => 'Package installed successfully.',
                ], now()->addHours(24));
            } else {
                Cache::put($cacheKey, [
                    'status' => 'failed',
                    'progress' => 0,
                    'message' => 'Installation failed: ' . $process->getErrorOutput(),
                ], now()->addHours(24));
            }
        } catch (Throwable $e) {
            Cache::put($cacheKey, [
                'status' => 'failed',
                'progress' => 0,
                'message' => 'Installation failed: ' . $e->getMessage(),
            ], now()->addHours(24));

            throw $e;
        }
    }
}
