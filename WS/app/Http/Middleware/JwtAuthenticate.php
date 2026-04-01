<?php
/**
 * RNADetector Web Service
 *
 * JWT Authentication Middleware.
 */

namespace App\Http\Middleware;

use App\Models\User;
use App\Utils\JwtUtil;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class JwtAuthenticate
{
    /**
     * Handle an incoming request.
     *
     * @param \Illuminate\Http\Request $request
     * @param \Closure                 $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $token = $this->extractToken($request);

        if (!$token) {
            return response()->json(['error' => 'Token not provided.'], 401);
        }

        // Check if token has been blacklisted (logged out)
        $tokenHash = hash('sha256', $token);
        if (Cache::has("jwt_blacklist:{$tokenHash}")) {
            return response()->json(['error' => 'Token has been invalidated.'], 401);
        }

        $payload = JwtUtil::decode($token, JwtUtil::getSecret());

        if (!$payload) {
            return response()->json(['error' => 'Token is invalid or expired.'], 401);
        }

        if (!isset($payload['sub'])) {
            return response()->json(['error' => 'Token payload is malformed.'], 401);
        }

        // Reject refresh tokens from being used as access tokens
        if (isset($payload['type']) && $payload['type'] === 'refresh') {
            return response()->json(['error' => 'Refresh tokens cannot be used for authentication.'], 401);
        }

        $user = User::find($payload['sub']);

        if (!$user) {
            return response()->json(['error' => 'User not found.'], 401);
        }

        Auth::setUser($user);

        return $next($request);
    }

    /**
     * Extract the JWT token from the Authorization header or query string.
     *
     * @param \Illuminate\Http\Request $request
     * @return string|null
     */
    private function extractToken(Request $request): ?string
    {
        $header = $request->header('Authorization', '');

        if (preg_match('/Bearer\s+(.+)$/i', $header, $matches)) {
            return $matches[1];
        }

        return $request->query('token');
    }
}
