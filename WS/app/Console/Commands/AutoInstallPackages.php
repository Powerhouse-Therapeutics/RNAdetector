<?php
/**
 * RNADetector Web Service
 *
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

namespace App\Console\Commands;

use App\Packages;
use Illuminate\Console\Command;

class AutoInstallPackages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'packages:auto-install {--packages= : Comma-separated package names to install}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically install reference genome packages';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(): int
    {
        $packagesEnv = $this->option('packages') ?: env('AUTO_INSTALL_PACKAGES', '');

        if (empty($packagesEnv)) {
            $this->info('No AUTO_INSTALL_PACKAGES configured. Skipping auto-install.');
            return 0;
        }

        $packageNames = array_filter(array_map('trim', explode(',', $packagesEnv)));

        foreach ($packageNames as $name) {
            if (Packages::isPackageInstalled($name)) {
                $this->info("Package '{$name}' is already installed. Skipping.");
                continue;
            }

            $this->info("Installing package: {$name}...");
            try {
                $this->call('packages:install', ['name' => $name]);
                $this->info("Package '{$name}' installed successfully.");
            } catch (\Exception $e) {
                $this->error("Failed to install '{$name}': " . $e->getMessage());
            }
        }

        return 0;
    }
}
