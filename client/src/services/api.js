import axios from 'axios';
import { clearSession } from '../store/authStore';

const PRODUCTION_API_URL = 'https://raahix.onrender.com/api';

function resolveApiUrl() {
  const configured = import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return configured || '/api';
  if (configured && configured !== '/api') return configured.replace(/\/$/, '');
  return PRODUCTION_API_URL;
}

export const API_URL = resolveApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = null;

function isNetworkError(error) {
  return !error?.response && (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error');
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Don't attempt refresh while the API is still booting / unreachable.
    if (isNetworkError(error)) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        clearSession();
        return Promise.reject(error);
      }
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_URL}/auth/refresh`, { refreshToken }).then((res) => res.data.data);
        const tokens = await refreshing;
        refreshing = null;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        original.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(original);
      } catch (refreshError) {
        refreshing = null;
        // Only wipe session when refresh is definitely unauthorized (e.g. after reseed).
        if (refreshError?.response?.status === 401 || refreshError?.response?.status === 403) {
          clearSession();
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback;
}
