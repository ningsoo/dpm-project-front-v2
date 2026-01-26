import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenUtils } from '@/utils/tokenUtils';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

export const fetchClient = axios.create({
  baseURL: API_BASE,
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
    // Access Token 만료 응답(401)이고 재시도하지 않은 경우
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // 서버가 DB에 저장된 Refresh Token을 자동으로 검증하여 새 Access Token 발급
        // 클라이언트는 Refresh Token을 전송하지 않음
        const response = await fetchClient.post('/auth/refresh', {});

        // 응답에서 새로운 Access Token 추출 및 저장
        const data = response.data?.data as { accessToken?: string } | undefined;
        if (data?.accessToken) {
          tokenUtils.setAccessToken(data.accessToken);

          // 원래 요청의 Authorization 헤더 업데이트
          if (original.headers) {
            original.headers.Authorization = `Bearer ${data.accessToken}`;
          }

          // 원래 요청 재시도 (1회 제한)
          return fetchClient(original);
        }
        throw new Error('No access token in response');
      } catch {
        // Refresh Token 만료 또는 서버 오류 → Access Token 제거 및 로그아웃 처리
        tokenUtils.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(err);
  }
);
