<?php
/**
 * RNADetector Web Service
 *
 * Lightweight JWT utility for token-based authentication.
 */

namespace App\Utils;

class JwtUtil
{
    /**
     * Encode a payload into a JWT token.
     *
     * @param array  $payload
     * @param string $secret
     * @param int    $ttl Time to live in seconds (default 3600 = 1 hour)
     * @return string
     */
    public static function encode(array $payload, string $secret, int $ttl = 3600): string
    {
        $header = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload['iat'] = $payload['iat'] ?? time();
        $payload['exp'] = $payload['exp'] ?? (time() + $ttl);
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));
        $signature = self::base64UrlEncode(hash_hmac('sha256', "$header.$payloadEncoded", $secret, true));

        return "$header.$payloadEncoded.$signature";
    }

    /**
     * Decode and verify a JWT token.
     *
     * @param string $token
     * @param string $secret
     * @return array|null Returns payload array or null if invalid/expired
     */
    public static function decode(string $token, string $secret): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $parts;

        $expectedSignature = self::base64UrlEncode(hash_hmac('sha256', "$header.$payload", $secret, true));
        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $data = json_decode(self::base64UrlDecode($payload), true);
        if (!$data || (isset($data['exp']) && $data['exp'] < time())) {
            return null;
        }

        return $data;
    }

    /**
     * Get the JWT secret from the application key.
     *
     * @return string
     */
    public static function getSecret(): string
    {
        return config('app.key');
    }

    /**
     * Base64 URL-safe encode.
     *
     * @param string $data
     * @return string
     */
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL-safe decode.
     *
     * @param string $data
     * @return string
     */
    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
