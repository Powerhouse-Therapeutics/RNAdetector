<?php
/**
 * RNADetector Web Service
 *
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::get('/ping', 'Api\\PingController@ping');

// Public JWT auth routes
Route::post('/auth/login', 'Api\\AuthController@login');
Route::post('/auth/refresh', 'Api\\AuthController@refresh');

Route::group(
    [
        'middleware' => 'jwt',
    ],
    static function () {
        Route::get('/auth-ping', 'Api\\PingController@ping');
        Route::get('/sys-info', 'Api\\PingController@sysInfo');

        Route::apiResource('users', 'Api\\UserController')->names(
            [
                'show' => 'users.show',
            ]
        );

        Route::middleware('can:generate-token,user')->get('/users/{user}/token', 'Api\\UserController@token');

        Route::get('/user', 'Api\\PingController@user');

        Route::apiResource('jobs', 'Api\\JobController')->names(
            [
                'show' => 'jobs.show',
            ]
        );

        Route::middleware('can:submit-job,job')->get('/jobs/{job}/submit', 'Api\\JobController@submit')->name('jobs.submit');

        Route::post('/jobs/{job}/retry', 'Api\\JobController@retry')->name('jobs.retry');

        Route::middleware('can:upload-job,job')->any('/jobs/{job}/upload/{any?}', 'Api\\JobController@upload')->where('any', '.*')->name(
            'jobs.upload'
        );

        Route::get('/job-types', 'Api\\JobTypeController@index')->name('job-types.index');
        Route::get('/job-types/{type}', 'Api\\JobTypeController@show')->name('job-types.show');

        // JWT authenticated auth routes
        Route::post('/auth/logout', 'Api\\AuthController@logout');
        Route::get('/auth/me', 'Api\\AuthController@me');
        Route::post('/auth/change-password', 'Api\\AuthController@changePassword');
        Route::put('/auth/profile', 'Api\\AuthController@updateProfile');

        Route::apiResource('annotations', 'Api\\AnnotationController')->names(
            [
                'show' => 'annotation.show',
            ]
        )->except(['create', 'store', 'update']);

        Route::get('references/packages', 'Api\\ReferenceController@listPackages');

        Route::apiResource('references', 'Api\\ReferenceController')->names(
            [
                'show' => 'reference.show',
            ]
        )->except(['create', 'store', 'update']);

        Route::get('/templates', 'Api\\TemplateController@index');
        Route::get('/templates/{name}/download', 'Api\\TemplateController@download');

        Route::get('/analysis-templates', 'Api\\TemplateController@listAnalysisTemplates');
        Route::post('/analysis-templates', 'Api\\TemplateController@storeAnalysisTemplate');
        Route::delete('/analysis-templates/{id}', 'Api\\TemplateController@destroyAnalysisTemplate');

        // File browser routes
        Route::get('/files/volumes', 'Api\FileBrowserController@volumes');
        Route::get('/files/browse', 'Api\FileBrowserController@browse');
        Route::get('/files/search', 'Api\FileBrowserController@search');

        // Server management routes
        Route::get('/server/status', 'Api\ServerController@status');
        Route::get('/server/packages', 'Api\ServerController@packages');
        Route::post('/server/packages/{name}/install', 'Api\ServerController@install');
        Route::get('/server/packages/{name}/status', 'Api\ServerController@installStatus');

        // Report generation & retrieval
        Route::get('/jobs/{job}/report', 'Api\ReportController@show');
        Route::get('/jobs/{job}/report/status', 'Api\ReportController@status');
        Route::post('/jobs/{job}/report/generate', 'Api\ReportController@generate');

        // Interactive plot files
        Route::get('/jobs/{job}/plots/{name}', 'Api\JobController@plot');
    }
);

