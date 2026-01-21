import axios, { AxiosError } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export const fetchClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response interceptor: 401 refresh token handling
fetchClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as typeof err.config & { _retry?: boolean };
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        return fetchClient(original);
      } catch {
        // Refresh token expired → logout, navigate home (handled in auth slice / redirect)
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(err);
  }
);
