<?php
/**
 * RNADetector Web Service
 *
 * JWT Authentication Controller.
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Utils\JwtUtil;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Authenticate user and return JWT tokens.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->input('email'))->first();

        if (!$user || !Hash::check($request->input('password'), $user->password)) {
            return response()->json(['error' => 'Invalid credentials.'], 401);
        }

        $accessToken = $user->generateJwtToken();
        $refreshToken = $user->generateRefreshToken();

        return response()->json([
            'access_token'  => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type'    => 'bearer',
            'expires_in'    => 3600,
            'user'          => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'admin' => $user->admin,
            ],
        ]);
    }

    /**
     * Invalidate the current token (logout).
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $this->extractToken($request);

        if ($token) {
            $payload = JwtUtil::decode($token, JwtUtil::getSecret());
            $ttl = 3600; // default
            if ($payload && isset($payload['exp'])) {
                $ttl = max($payload['exp'] - time(), 0);
            }

            $tokenHash = hash('sha256', $token);
            Cache::put("jwt_blacklist:{$tokenHash}", true, $ttl);
        }

        return response()->json(['message' => 'Successfully logged out.']);
    }

    /**
     * Refresh an access token using a refresh token.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function refresh(Request $request): JsonResponse
    {
        $request->validate([
            'refresh_token' => 'required|string',
        ]);

        $refreshToken = $request->input('refresh_token');
        $payload = JwtUtil::decode($refreshToken, JwtUtil::getSecret());

        if (!$payload) {
            return response()->json(['error' => 'Invalid or expired refresh token.'], 401);
        }

        if (!isset($payload['type']) || $payload['type'] !== 'refresh') {
            return response()->json(['error' => 'Token is not a refresh token.'], 401);
        }

        // Check if refresh token has been blacklisted
        $tokenHash = hash('sha256', $refreshToken);
        if (Cache::has("jwt_blacklist:{$tokenHash}")) {
            return response()->json(['error' => 'Refresh token has been invalidated.'], 401);
        }

        $user = User::find($payload['sub']);

        if (!$user) {
            return response()->json(['error' => 'User not found.'], 401);
        }

        $accessToken = $user->generateJwtToken();

        return response()->json([
            'access_token' => $accessToken,
            'token_type'   => 'bearer',
            'expires_in'   => 3600,
        ]);
    }

    /**
     * Get the authenticated user.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function me(): JsonResponse
    {
        $user = Auth::user();

        return response()->json([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'admin' => $user->admin,
        ]);
    }

    /**
     * Change the authenticated user's password.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'old_password'              => 'required|string',
            'new_password'              => 'required|string|min:8|confirmed',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::guard('api')->user();

        if (!Hash::check($request->input('old_password'), $user->password)) {
            return response()->json(['error' => 'The old password is incorrect.'], 422);
        }

        $user->password = Hash::make($request->input('new_password'));
        $user->save();

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /**
     * Update the authenticated user's profile.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateProfile(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = Auth::guard('api')->user();

        $request->validate([
            'name'  => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $user->id,
        ]);

        if ($request->has('name')) {
            $user->name = $request->input('name');
        }
        if ($request->has('email')) {
            $user->email = $request->input('email');
        }
        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'admin' => $user->admin,
            ],
        ]);
    }

    /**
     * Extract the Bearer token from the request.
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

        return null;
    }
}
