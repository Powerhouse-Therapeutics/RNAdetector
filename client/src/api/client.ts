import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import useAuthStore from '@/stores/authStore';

/* ------------------------------------------------------------------ */
/*  Timeout defaults                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const JOB_TIMEOUT = 300_000;   // 5 minutes

/** Endpoints that get the extended timeout. */
const LONG_TIMEOUT_PATTERNS = [
  /^jobs\/\d+\/submit/,
  /^jobs$/,               // POST create job
  /^server\/packages\/.+\/install/,
];

function timeoutForUrl(url: string | undefined, method: string | undefined): number {
  if (!url) return DEFAULT_TIMEOUT;
  const isLong = LONG_TIMEOUT_PATTERNS.some((p) => p.test(url));
  if (isLong && (method === 'post' || method === 'get')) return JOB_TIMEOUT;
  return DEFAULT_TIMEOUT;
}

/* ------------------------------------------------------------------ */
/*  Retry logic                                                         */
/* ------------------------------------------------------------------ */

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

/** Errors worth retrying: network errors and 5xx server errors. */
function isRetryable(error: AxiosError): boolean {
  if (!error.response) return true; // network / timeout error
  const status = error.response.status;
  return status >= 500 && status < 600;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/*  Axios client                                                        */
/* ------------------------------------------------------------------ */

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/* ---------- request interceptor ---------- */

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Apply dynamic timeout unless the caller already set one
  if (!config.timeout) {
    config.timeout = timeoutForUrl(config.url, config.method);
  }
  return config;
});

/* ---------- response interceptor ---------- */

client.interceptors.response.use(
  (response) => {
    // Guard against empty / non-JSON responses when JSON was expected
    if (
      response.headers['content-type']?.includes('application/json') &&
      response.data === ''
    ) {
      response.data = null;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    if (!originalRequest) return Promise.reject(error);

    /* --- 401: token refresh --- */
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${client.defaults.baseURL}auth/refresh`,
          { refresh_token: refreshToken },
        );

        const newToken = response.data.access_token;
        useAuthStore.getState().refresh(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    /* --- Retryable errors: network failures & 5xx --- */
    const retryCount = originalRequest._retryCount ?? 0;
    if (retryCount < MAX_RETRIES && isRetryable(error)) {
      originalRequest._retryCount = retryCount + 1;
      const backoff = RETRY_BASE_MS * Math.pow(2, retryCount); // 1s, 2s, 4s
      await sleep(backoff);
      return client(originalRequest);
    }

    /* --- Friendly error messages for common HTTP codes --- */
    if (error.response) {
      const status = error.response.status;
      // Try to extract a meaningful message from the response body
      const data = error.response.data as Record<string, unknown> | string | null;
      let serverMessage = '';
      if (data && typeof data === 'object') {
        serverMessage =
          (data.message as string) ||
          (data.error as string) ||
          '';
      } else if (typeof data === 'string') {
        // Possibly malformed JSON — try to parse
        try {
          const parsed = JSON.parse(data);
          serverMessage = parsed?.message || parsed?.error || '';
        } catch {
          // Not JSON; ignore
        }
      }

      if (!serverMessage) {
        switch (status) {
          case 400: serverMessage = 'Bad request. Please check your input.'; break;
          case 403: serverMessage = 'You do not have permission for this action.'; break;
          case 404: serverMessage = 'The requested resource was not found.'; break;
          case 408: serverMessage = 'Request timed out. Please try again.'; break;
          case 422: serverMessage = 'Validation failed. Please check your input.'; break;
          case 429: serverMessage = 'Too many requests. Please wait a moment.'; break;
          default:
            if (status >= 500) serverMessage = 'Server error. Please try again later.';
        }
      }

      // Attach friendly message to the error for consumers
      if (serverMessage) {
        (error as AxiosError & { friendlyMessage?: string }).friendlyMessage = serverMessage;
      }
    } else if (error.code === 'ECONNABORTED') {
      (error as AxiosError & { friendlyMessage?: string }).friendlyMessage =
        'Request timed out. Please check your connection and try again.';
    } else {
      (error as AxiosError & { friendlyMessage?: string }).friendlyMessage =
        'Network error. Please check your connection.';
    }

    return Promise.reject(error);
  },
);

export default client;

/**
 * Extract a user-friendly message from an API error.
 * Works with both Axios errors enriched by our interceptor and plain Error objects.
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  if (!error) return fallback;
  const axErr = error as AxiosError & { friendlyMessage?: string };
  if (axErr.friendlyMessage) return axErr.friendlyMessage;
  const respData = axErr.response?.data as Record<string, unknown> | undefined;
  if (respData) {
    if (typeof respData.message === 'string') return respData.message;
    if (typeof respData.error === 'string') return respData.error;
    if (respData.errors && typeof respData.errors === 'object') {
      return Object.values(respData.errors).flat().join('; ');
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
