<?php
$content = file_get_contents("/rnadetector/ws/routes/api.php");

$publicRoutes = '
// Public auth
Route::post("auth/login", "Api\\AuthController@login");
';

$authRoutes = '
// Auth routes
Route::post("auth/logout", "Api\\AuthController@logout");
Route::post("auth/refresh", "Api\\AuthController@refresh");
Route::get("auth/me", "Api\\AuthController@me");
Route::post("auth/change-password", "Api\\AuthController@changePassword");
Route::put("auth/profile", "Api\\AuthController@updateProfile");

// Server status & packages
Route::get("server/status", "Api\\ServerController@status");
Route::get("server/packages", "Api\\ServerController@packages");
Route::post("server/packages/{name}/install", "Api\\ServerController@installPackage");
Route::get("server/packages/{name}/status", "Api\\ServerController@packageStatus");

// File browser
Route::get("files/volumes", "Api\\FileController@volumes");
Route::get("files/browse", "Api\\FileController@browse");
Route::get("files/search", "Api\\FileController@search");

// User management
Route::get("admin/users", "Api\\UserAdminController@index");
Route::post("admin/users", "Api\\UserAdminController@store");
Route::delete("admin/users/{user}", "Api\\UserAdminController@destroy");

// Templates
Route::get("templates", "Api\\TemplateController@index");
Route::get("templates/{name}/download", "Api\\TemplateController@download");
';

// Add public routes before the middleware group
$groupPos = strpos($content, "Route::group(");
$content = substr($content, 0, $groupPos) . $publicRoutes . "\n" . substr($content, $groupPos);

// Add authenticated routes inside the middleware group (before last });)
$lastClose = strrpos($content, "});");
$content = substr($content, 0, $lastClose) . $authRoutes . "\n" . substr($content, $lastClose);

file_put_contents("/rnadetector/ws/routes/api.php", $content);
echo "All routes added.\n";
