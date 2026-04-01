<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\SystemInfo;
use App\Packages;
use Illuminate\Http\JsonResponse;

class ServerController extends Controller
{
    private static $PUBLIC_PACKAGES = [
        ["name" => "Human_hg38_genome", "description" => "Human hg38 genome (GENCODE v44) indexed for STAR, HISAT2, BWA. ~35GB download.", "species" => "Human", "build" => "hg38"],
        ["name" => "Human_hg19_genome", "description" => "Human hg19 genome (UCSC + GENCODE v19) indexed for STAR, HISAT2, BWA. ~35GB download.", "species" => "Human", "build" => "hg19"],
        ["name" => "Mouse_mm10_genome", "description" => "Mouse mm10 genome (UCSC + GENCODE M25) indexed for STAR, HISAT2, BWA. ~25GB download.", "species" => "Mouse", "build" => "mm10"],
        ["name" => "Mouse_mm39_genome", "description" => "Mouse mm39 genome (GENCODE M33) indexed for STAR, HISAT2, BWA. ~25GB download.", "species" => "Mouse", "build" => "mm39"],
        ["name" => "Human_hg38_transcriptome", "description" => "Human hg38 transcriptome (GENCODE v44) indexed for Salmon.", "species" => "Human", "build" => "hg38"],
        ["name" => "Human_hg19_transcriptome", "description" => "Human hg19 transcriptome (GENCODE v19) indexed for Salmon.", "species" => "Human", "build" => "hg19"],
        ["name" => "Mouse_mm10_transcriptome", "description" => "Mouse mm10 transcriptome (GENCODE M25) indexed for Salmon.", "species" => "Mouse", "build" => "mm10"],
        ["name" => "Mouse_mm39_transcriptome", "description" => "Mouse mm39 transcriptome (GENCODE M33) indexed for Salmon.", "species" => "Mouse", "build" => "mm39"],
        ["name" => "Human_hg38_small_ncRNAs", "description" => "Human hg38 small ncRNA annotations (miRNA, snoRNA, snRNA) from GENCODE v44 + miRBase.", "species" => "Human", "build" => "hg38"],
        ["name" => "Human_hg19_small_ncRNAs", "description" => "Human hg19 small ncRNA annotations from GENCODE v19 + miRBase.", "species" => "Human", "build" => "hg19"],
        ["name" => "Mouse_mm10_smallRNA", "description" => "Mouse mm10 small ncRNA annotations from GENCODE M25 + miRBase.", "species" => "Mouse", "build" => "mm10"],
        ["name" => "Mouse_mm39_smallRNA", "description" => "Mouse mm39 small ncRNA annotations from GENCODE M33 + miRBase.", "species" => "Mouse", "build" => "mm39"],
        ["name" => "Human_hg38_circRNAs", "description" => "Human hg38 circRNA annotations from GENCODE v44.", "species" => "Human", "build" => "hg38"],
        ["name" => "Human_hg19_circRNAs", "description" => "Human hg19 circRNA annotations from GENCODE v19 + circBase.", "species" => "Human", "build" => "hg19"],
        ["name" => "Mouse_mm10_circRNA", "description" => "Mouse mm10 circRNA annotations from GENCODE M25.", "species" => "Mouse", "build" => "mm10"],
    ];

    public function status(): JsonResponse
    {
        $info = new SystemInfo();
        $totalKb = $info->maxMemory();
        $availKb = $info->availableMemory();
        $uptimeSeconds = 0;
        if (file_exists("/proc/uptime")) {
            $raw = file_get_contents("/proc/uptime");
            $uptimeSeconds = (int) floatval(explode(" ", $raw)[0]);
        }
        $days = intdiv($uptimeSeconds, 86400);
        $hours = intdiv($uptimeSeconds % 86400, 3600);
        $uptime = $days > 0 ? "{$days}d {$hours}h" : "{$hours}h";
        return response()->json(["data" => [
            "version" => \App\Utils::VERSION ?? "0.0.3",
            "cores" => $info->numCores(),
            "used_cores" => $info->usedCores(),
            "total_memory_gb" => round($totalKb / 1048576, 1),
            "available_memory_gb" => round($availKb / 1048576, 1),
            "docker_running" => true,
            "uptime" => $uptime,
        ]]);
    }

    public function packages(): JsonResponse
    {
        $referencePath = config("rnadetector.reference_path");
        $result = [];
        $installedNames = [];
        if ($referencePath && is_dir($referencePath)) {
            foreach (@scandir($referencePath) ?: [] as $dir) {
                if ($dir === "." || $dir === "..") continue;
                if (is_dir("$referencePath/$dir") && file_exists("$referencePath/$dir/.installed")) {
                    $installedNames[] = $dir;
                }
            }
        }

        foreach (self::$PUBLIC_PACKAGES as $pkg) {
            $isInstalled = in_array($pkg["name"], $installedNames, true);
            $result[] = [
                "name" => $pkg["name"],
                "description" => $pkg["description"],
                "species" => $pkg["species"] ?? "",
                "build" => $pkg["build"] ?? "",
                "status" => $isInstalled ? "installed" : "available",
            ];
        }

        foreach ($installedNames as $name) {
            $found = false;
            foreach (self::$PUBLIC_PACKAGES as $pkg) {
                if ($pkg["name"] === $name) { $found = true; break; }
            }
            if (!$found) {
                $result[] = ["name" => $name, "description" => "Custom installed package", "status" => "installed"];
            }
        }

        return response()->json(["data" => $result]);
    }

    public function installPackage(string $name): JsonResponse
    {
        $valid = false;
        foreach (self::$PUBLIC_PACKAGES as $pkg) {
            if ($pkg["name"] === $name) { $valid = true; break; }
        }
        if (!$valid) {
            return response()->json(["error" => "Unknown package: {$name}"], 400);
        }

        $referencePath = config("rnadetector.reference_path");
        $logFile = storage_path("app/install_{$name}.log");
        $cmd = "nohup /usr/local/bin/install_public_references.sh "
            . escapeshellarg($name) . " "
            . escapeshellarg($referencePath) . " 16"
            . " > " . escapeshellarg($logFile) . " 2>&1 &";
        exec($cmd);
        return response()->json(["message" => "Installation started for {$name}", "status" => "installing"]);
    }

    public function packageStatus(string $name): JsonResponse
    {
        $referencePath = config("rnadetector.reference_path");
        $pkgDir = $referencePath . "/" . $name;
        if (file_exists($pkgDir . "/.installed")) {
            return response()->json(["status" => "installed", "progress" => 100]);
        }

        $logFile = storage_path("app/install_{$name}.log");
        if (file_exists($logFile)) {
            $content = file_get_contents($logFile);
            $lines = explode("\n", trim($content));
            $lastLine = end($lines);
            if (preg_match('/error|FATAL|failed/i', $lastLine)) {
                return response()->json(["status" => "error", "progress" => 0, "message" => $lastLine]);
            }
            $stepCount = substr_count($content, "[step]");
            $doneCount = substr_count($content, "[done]");
            $progress = min(95, max(5, ($stepCount > 0 ? (int)(($doneCount / max($stepCount, 1)) * 100) : 10)));
            return response()->json(["status" => "installing", "progress" => $progress, "message" => $lastLine]);
        }

        return response()->json(["status" => "available", "progress" => 0]);
    }
}
