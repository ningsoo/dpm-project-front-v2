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

// 중복 refresh 요청 방지를 위한 전역 플래그
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

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
      
      // 이미 refresh 중이면 기존 promise를 재사용
      if (!refreshPromise) {
        refreshPromise = (async (): Promise<string | null> => {
          try {
            // Refresh Token은 HttpOnly Cookie로 자동 전송됨 (withCredentials: true)
            // Swagger 명세에 따라 request body에 refreshToken 포함
            // httpOnly cookie이므로 프론트엔드에서 읽을 수 없지만, 명시적으로 body에 포함
            const response = await refreshClient.post<{ accessToken: string }>('/auth/refresh', {
              refreshToken: '', // httpOnly cookie에서 백엔드가 읽지만, 명시적으로 body에 포함
            });

            // 응답에서 새로운 Access Token 추출 및 저장
            // Swagger 명세: { accessToken: string }
            const accessToken = response.data?.accessToken;
            if (accessToken && typeof accessToken === 'string') {
              tokenUtils.setAccessToken(accessToken);
              return accessToken;
            } else {
              throw new Error('No access token in response');
            }
          } catch (error) {
            // Refresh 실패 시 플래그 초기화
            refreshPromise = null;
            throw error;
          }
        })();
      }

      try {
        const accessToken = await refreshPromise;
        
        if (accessToken) {
          // 원래 요청의 Authorization 헤더 업데이트
          if (original.headers) {
            original.headers.Authorization = `Bearer ${accessToken}`;
          }
          
          // refresh 완료 후 플래그 초기화
          refreshPromise = null;
          
          // 원래 요청 재시도 (1회 제한)
          return fetchClient(original);
        } else {
          throw new Error('No access token received');
        }
      } catch (refreshError) {
        // Refresh 실패 처리
        const refreshErr = refreshError as AxiosError;
        refreshPromise = null;
        
        // 4. 인증 실패(400, 401)인 경우만 토큰 제거 및 리다이렉트
        if (refreshErr.response && (refreshErr.response.status === 400 || refreshErr.response.status === 401)) {
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
