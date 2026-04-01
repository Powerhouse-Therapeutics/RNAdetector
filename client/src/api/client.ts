import axios from 'axios';
import useAuthStore from '@/stores/authStore';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${client.defaults.baseURL}auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${useAuthStore.getState().token}`,
            },
          }
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

    return Promise.reject(error);
  }
);

export default client;
