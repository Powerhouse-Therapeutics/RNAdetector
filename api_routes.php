<?php
/**
 * RNADetector Web Service - API Routes
 */

use Illuminate\Http\Request;

Route::get('/ping', 'Api\\PingController@ping');

// Public auth
Route::post('auth/login', 'Api\\AuthController@login');

Route::group(
    [
        'middleware' => 'auth:api',
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

        Route::middleware('can:upload-job,job')->any('/jobs/{job}/upload/{any?}', 'Api\\JobController@upload')->where('any', '.*')->name(
            'jobs.upload'
        );

        Route::get('/job-types', 'Api\\JobTypeController@index')->name('job-types.index');
        Route::get('/job-types/{type}', 'Api\\JobTypeController@show')->name('job-types.show');

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

        // Auth routes
        Route::post('auth/logout', 'Api\\AuthController@logout');
        Route::post('auth/refresh', 'Api\\AuthController@refresh');
        Route::get('auth/me', 'Api\\AuthController@me');
        Route::post('auth/change-password', 'Api\\AuthController@changePassword');
        Route::put('auth/profile', 'Api\\AuthController@updateProfile');

        // Server status & packages
        Route::get('server/status', 'Api\\ServerController@status');
        Route::get('server/packages', 'Api\\ServerController@packages');
        Route::post('server/packages/{name}/install', 'Api\\ServerController@installPackage');
        Route::get('server/packages/{name}/status', 'Api\\ServerController@packageStatus');

        // File browser
        Route::get('files/volumes', 'Api\\FileController@volumes');
        Route::get('files/browse', 'Api\\FileController@browse');
        Route::get('files/search', 'Api\\FileController@search');

        // User management
        Route::get('admin/users', 'Api\\UserAdminController@index');
        Route::post('admin/users', 'Api\\UserAdminController@store');
        Route::delete('admin/users/{user}', 'Api\\UserAdminController@destroy');

        // Templates
        Route::get('templates', 'Api\\TemplateController@index');
        Route::get('templates/{name}/download', 'Api\\TemplateController@download');
    }
);
