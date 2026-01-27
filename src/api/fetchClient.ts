import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenUtils } from '@/utils/tokenUtils';
import { store } from '@/store';
import { clearAuth } from '@/store/slices/authSlice';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.200.88:8080/api';

export const fetchClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Refresh 요청 전용 axios 인스턴스 (인터셉터 없음, 무한루프 방지)
const refreshClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Authorization 헤더 추가
fetchClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenUtils.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: 401 refresh token handling
fetchClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as typeof err.config & { _retry?: boolean };

    // 1. /auth/refresh 요청이면 refresh 시도하지 않고 그대로 reject (무한루프 방지)
    if (original.url?.includes('/auth/refresh')) {
      return Promise.reject(err);
    }

    // 2. 네트워크 오류(응답 객체 없음)면 토큰 삭제/리다이렉트 하지 않고 그대로 reject
    if (!err.response) {
      return Promise.reject(err);
    }

    // 3. Access Token 만료 응답(401)이고 재시도하지 않은 경우에만 refresh 시도
    if (err.response.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Refresh Token은 HttpOnly Cookie로 자동 전송됨 (withCredentials: true)
        // 별도 axios 인스턴스(refreshClient) 사용으로 인터셉터 무한루프 방지
        const response = await refreshClient.post('/auth/refresh', {});

        // 응답에서 새로운 Access Token 추출 및 저장
        const accessToken = response.data?.data?.accessToken;
        if (accessToken && typeof accessToken === 'string') {
          tokenUtils.setAccessToken(accessToken);

          // 원래 요청의 Authorization 헤더 업데이트
          if (original.headers) {
            original.headers.Authorization = `Bearer ${accessToken}`;
          }

          // 원래 요청 재시도 (1회 제한)
          return fetchClient(original);
        }
        throw new Error('No access token in response');
      } catch (refreshError) {
        // Refresh 실패 처리
        const refreshErr = refreshError as AxiosError;
        
        // 4. 인증 실패(401, 403)인 경우만 토큰 제거 및 리다이렉트
        if (refreshErr.response && (refreshErr.response.status === 401 || refreshErr.response.status === 403)) {
          tokenUtils.clearTokens();
          store.dispatch(clearAuth());
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }
        // 네트워크 오류나 다른 오류는 토큰 제거하지 않고 그대로 reject
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);
