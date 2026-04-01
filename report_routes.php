<?php
/**
 * RNAdetector - Report Routes Patch
 *
 * This script patches /rnadetector/ws/routes/api.php to add report-related
 * routes inside the auth:api middleware group.
 *
 * Usage:  php /rnadetector/ws/report_routes.php
 *         (or: docker exec rnadetector php /rnadetector/ws/report_routes.php)
 */

$routeFile = "/rnadetector/ws/routes/api.php";

if (!file_exists($routeFile)) {
    echo "ERROR: Route file not found at {$routeFile}\n";
    exit(1);
}

$content = file_get_contents($routeFile);

$reportRoutes = '
    // Report generation & retrieval
    Route::get(\'jobs/{job}/report\', \'Api\\ReportController@show\');
    Route::get(\'jobs/{job}/report/status\', \'Api\\ReportController@status\');
    Route::post(\'jobs/{job}/report/generate\', \'Api\\ReportController@generate\');
';

// Check if routes are already present
if (strpos($content, 'ReportController@show') !== false) {
    echo "Report routes already present. Skipping.\n";
    exit(0);
}

// Insert the report routes inside the auth:api middleware group,
// just before the closing });
// Try }); first, then just }  )  ; patterns
$lastClose = strrpos($content, "});");
if ($lastClose === false) {
    // Look for the pattern "    }\n);" which is how the file ends
    $lastClose = strrpos($content, "    }\n);");
    if ($lastClose === false) {
        $lastClose = strrpos($content, ");");
    }
}
if ($lastClose === false) {
    echo "ERROR: Could not find closing of middleware group in route file.\n";
    exit(1);
}

// Insert before the closing brace of the static function
$content = substr($content, 0, $lastClose) . $reportRoutes . "\n" . substr($content, $lastClose);

file_put_contents($routeFile, $content);
echo "Report routes added successfully.\n";
