<?php
/**
 * RNADetector Web Service
 *
 * @author S. Alaimo, Ph.D. <alaimos at gmail dot com>
 */

namespace App\Models;

use App\Utils\JwtUtil;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'api_token',
        'admin',
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password',
        'remember_token',
        'api_token',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'admin'             => 'boolean',
    ];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class, 'user_id', 'id');
    }

    /**
     * Generate a JWT access token for this user.
     *
     * @param int $ttl Time to live in seconds (default 3600 = 1 hour)
     * @return string
     */
    public function generateJwtToken(int $ttl = 3600): string
    {
        return JwtUtil::encode([
            'sub'   => $this->id,
            'email' => $this->email,
            'admin' => $this->admin,
        ], JwtUtil::getSecret(), $ttl);
    }

    /**
     * Generate a JWT refresh token for this user.
     *
     * @param int $ttl Time to live in seconds (default 604800 = 7 days)
     * @return string
     */
    public function generateRefreshToken(int $ttl = 604800): string
    {
        return JwtUtil::encode([
            'sub'  => $this->id,
            'type' => 'refresh',
        ], JwtUtil::getSecret(), $ttl);
    }

    /**
     * Returns some statistics about the user or the system if the user is an administrator.
     *
     * @return array
     */
    public function statistics(): array
    {
        $stats = [];
        if ($this->admin) {
            $stats['jobs'] = [
                'all'        => Job::count(),
                'ready'      => Job::whereStatus(Job::READY)->count(),
                'queued'     => Job::whereStatus(Job::QUEUED)->count(),
                'processing' => Job::whereStatus(Job::PROCESSING)->count(),
                'failed'     => Job::whereStatus(Job::FAILED)->count(),
                'completed'  => Job::whereStatus(Job::COMPLETED)->count(),
            ];
        } else {
            $stats['jobs'] = [
                'all'        => Job::whereUserId($this->id)->count(),
                'ready'      => Job::whereUserId($this->id)->whereStatus(Job::READY)->count(),
                'queued'     => Job::whereUserId($this->id)->whereStatus(Job::QUEUED)->count(),
                'processing' => Job::whereUserId($this->id)->whereStatus(Job::PROCESSING)->count(),
                'failed'     => Job::whereUserId($this->id)->whereStatus(Job::FAILED)->count(),
                'completed'  => Job::whereUserId($this->id)->whereStatus(Job::COMPLETED)->count(),
            ];
        }

        return $stats;
    }

}
