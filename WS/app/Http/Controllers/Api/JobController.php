<?php
/**
 * RNADetector Web Service
 *
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\Job as JobResource;
use App\Http\Resources\JobCollection;
use App\Jobs\DeleteJobDirectory;
use App\Jobs\Request as JobRequest;
use App\Jobs\Types\Factory;
use App\Models\Job;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class JobController extends Controller
{

    /**
     * JobController constructor.
     */
    public function __construct()
    {
        $this->authorizeResource(Job::class, 'job');
    }


    /**
     * Display a listing of the resource.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \App\Http\Resources\JobCollection
     */
    public function index(Request $request): JobCollection
    {
        $query = Job::with('user');
        if ($request->has('deep_type')) {
            $type = $request->get('deep_type');
            if ($type) {
                $query = Job::deepTypeFilter($type)->with('user');
            }
        }

        return new JobCollection(
            $this->handleBuilderRequest(
                $request,
                $query,
                static function (Builder $builder) use ($request) {
                    if ($request->has('completed')) {
                        $builder->where('status', '=', Job::COMPLETED);
                    }
                    /** @var \App\Models\User $user */
                    $user = \Auth::user();
                    if (!$user->admin) {
                        $builder->where('user_id', $user->id);
                    }

                    return $builder;
                }
            )
        );
    }

    /**
     * Prepare array for nested validation
     *
     * @param array $specs
     *
     * @return array
     */
    private function _prepareNestedValidation(array $specs): array
    {
        $nestedSpecs = [];
        foreach ($specs as $field => $rules) {
            if (!Str::startsWith($field, 'parameters.')) {
                $field = 'parameters.' . $field;
            }
            $nestedSpecs[$field] = $rules;
        }

        return $nestedSpecs;
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \App\Http\Resources\Job
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): JobResource
    {
        $jobTypes = Factory::listTypes();
        $validValues = $this->validate(
            $request,
            [
                'sample_code' => ['filled', 'string', 'alpha_dash', 'max:255'],
                'name'        => ['required', 'string', 'max:500'],
                'type'        => ['required', 'string', Rule::in($jobTypes->pluck('id'))],
                'parameters'  => ['filled', 'array'],
            ]
        );
        $parametersValidation = $this->_prepareNestedValidation(
            Factory::validationSpec($validValues['type'], $request)
        );
        $validParameters = $this->validate($request, $parametersValidation);
        $type = $validValues['type'];
        $validParameters = $validParameters['parameters'] ?? [];
        $userId = \Auth::id();
        if (empty($userId)) {
            abort(401, 'Authentication required to create a job.');
        }
        $job = Job::create(
            [
                'sample_code'    => $validValues['sample_code'] ?? null,
                'name'           => $validValues['name'],
                'job_type'       => $type,
                'status'         => Job::READY,
                'job_parameters' => [],
                'job_output'     => [],
                'log'            => '',
                'user_id'        => $userId,
            ]
        );
        $job->setParameters(Arr::dot($validParameters));
        $job->save();
        $job->getJobDirectory();

        return new JobResource($job);
    }

    /**
     * Display the specified resource.
     *
     * @param \App\Models\Job $job
     *
     * @return \App\Http\Resources\Job
     */
    public function show(Job $job): JobResource
    {
        return new JobResource($job);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\Job          $job
     *
     * @return \App\Http\Resources\Job
     * @throws \Illuminate\Validation\ValidationException
     */
    public function update(Request $request, Job $job): JobResource
    {
        if (!$job->canBeModified()) {
            abort(400, 'Unable to modify a submitted, running, or completed job.');
        }
        $parametersValidation = $this->_prepareNestedValidation(Factory::validationSpec($job, $request));
        $validParameters = $this->validate($request, $parametersValidation);
        $validParameters = $validParameters['parameters'] ?? [];
        $job->addParameters(Arr::dot($validParameters));
        $job->save();

        return new JobResource($job);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param \App\Models\Job $job
     *
     * @return \Illuminate\Http\JsonResponse
     * @throws \Exception
     */
    public function destroy(Job $job): JsonResponse
    {
        if (!$job->canBeDeleted()) {
            abort(400, 'Unable to delete a queued or running job.');
        }

        DeleteJobDirectory::dispatch($job);

        return response()->json(
            [
                'message' => 'Deleting job.',
                'errors'  => false,
            ]
        );
    }

    /**
     * Submit the specified resource for execution
     *
     * @param \App\Models\Job $job
     *
     * @return \App\Http\Resources\Job
     */
    public function submit(Job $job): JobResource
    {
        if (!$job->canBeModified()) {
            abort(400, 'Unable to submit a job that is already submitted.');
        }
        // Verify that the job type handler exists before submitting
        try {
            $handler = Factory::get($job);
            if (!$handler->isInputValid()) {
                abort(422, 'Job input validation failed. Please check your parameters and uploaded files.');
            }
        } catch (\Throwable $e) {
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException) {
                throw $e;
            }
            abort(422, 'Job validation error: ' . $e->getMessage());
        }
        $job->setStatus(Job::QUEUED);
        JobRequest::dispatch($job);

        return new JobResource($job);
    }

    /**
     * Retry a failed job by creating a new job with the same parameters
     *
     * @param \App\Models\Job $job
     *
     * @return \App\Http\Resources\Job
     */
    public function retry(Job $job): JobResource
    {
        $this->authorize('view', $job);

        if ($job->status !== Job::FAILED) {
            abort(400, 'Only failed jobs can be retried.');
        }

        $userId = \Auth::id();
        if (empty($userId)) {
            abort(401, 'Authentication required.');
        }

        $newJob = Job::create(
            [
                'sample_code' => $job->sample_code,
                'name'        => $job->name . ' (retry)',
                'job_type'    => $job->job_type,
                'status'      => Job::READY,
                'job_parameters' => $job->job_parameters ?? [],
                'job_output'     => [],
                'log'            => '',
                'user_id'        => $userId,
            ]
        );
        $newJob->save();
        $newJob->getJobDirectory();

        // Submit the new job
        $newJob->setStatus(Job::QUEUED);
        JobRequest::dispatch($newJob);

        return new JobResource($newJob);
    }

    /**
     * Serve an interactive plot HTML file for a job
     *
     * @param \App\Models\Job $job
     * @param string          $name
     *
     * @return \Illuminate\Http\Response
     */
    public function plot(Job $job, string $name)
    {
        $this->authorize('view', $job);

        // Sanitize name: allow only alphanumeric, underscore, and hyphen
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
            abort(400, 'Invalid plot name.');
        }

        $jobDir = $job->getAbsoluteJobDirectory();
        if (empty($jobDir) || !is_dir($jobDir)) {
            abort(404, 'Job directory not found.');
        }

        // Search for the plot file in the job directory and subdirectories
        $plotFile = null;
        $candidate = $jobDir . '/' . $name . '.html';
        if (file_exists($candidate)) {
            $plotFile = $candidate;
        } else {
            // Search in subdirectories (e.g., deg_report_*)
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($jobDir, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );
            foreach ($iterator as $file) {
                if ($file->getFilename() === $name . '.html') {
                    $plotFile = $file->getPathname();
                    break;
                }
            }
        }

        if ($plotFile === null || !file_exists($plotFile)) {
            abort(404, 'Plot not found.');
        }

        // Ensure the file is within the job directory (prevent path traversal)
        $realJobDir = realpath($jobDir);
        $realPlotFile = realpath($plotFile);
        if ($realJobDir === false || $realPlotFile === false || strpos($realPlotFile, $realJobDir) !== 0) {
            abort(403, 'Access denied.');
        }

        return response(file_get_contents($plotFile), 200)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Upload a file to the specified job
     *
     * @param \App\Models\Job $job
     *
     * @return mixed
     */
    public function upload(Job $job)
    {
        if (!$job->canBeModified()) {
            abort(400, 'Unable to upload a file for a job that is already submitted.');
        }
        $uploadDir = $job->getAbsoluteJobDirectory();
        if (empty($uploadDir) || !is_dir($uploadDir)) {
            abort(500, 'Job directory is not available. Please try again.');
        }
        set_time_limit(0);
        /** @var \TusPhp\Tus\Server $server */
        $server = app('tus-server');
        $server->setApiPath(route('jobs.upload', $job, false))
               ->setUploadDir($uploadDir);
        $response = $server->serve();

        return $response->send();
    }
}
