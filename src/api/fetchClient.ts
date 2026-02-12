import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenUtils } from '@/utils/tokenUtils';
import { store } from '@/store';
import { clearAuth } from '@/store/slices/authSlice';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://soundock-alb-se1-75264038.ap-northeast-2.elb.amazonaws.com/';

/** 결제 API 전용 경로 prefix (백엔드는 /v1/payments 로 라우팅, /api 붙이면 404) */
export const PAYMENT_BASE = '/v1/payments';

/**
 * 메인 API 클라이언트 (Authorization 헤더 + 401 시 refresh 후 재시도)
 */
export const fetchClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 10000,
});

fetchClient.interceptors.request.use(config => {
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

/**
 * 무인증 전용 클라이언트 (Authorization·401 refresh 인터셉터 없음)
 * Passwordless register / login-trigger / result / cancel 등 로그인 없이 호출하는 API용.
 */
export const noAuthClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Refresh 전용 클라이언트 (인터셉터 없음 → 무한루프/중첩 방지)
 * - Refresh Token은 HttpOnly Cookie로만 전송 (body에 넣지 않음)
 */
const refreshClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/** refresh 진행 중인 단일 Promise (동시 401 시 한 번만 호출) */
let refreshPromise: Promise<string | null> | null = null;

/** 응답에서 accessToken 추출 (data.accessToken 또는 data.data.accessToken 지원) */
function getAccessTokenFromResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const fromData = d.accessToken;
  if (typeof fromData === 'string') return fromData;
  const inner = d.data;
  if (inner && typeof inner === 'object' && typeof (inner as Record<string, unknown>).accessToken === 'string') {
    return (inner as Record<string, unknown>).accessToken as string;
  }
  return null;
}

/** refresh 1회 수행. 성공 시 새 accessToken 반환, 실패 시 throw */
async function doRefresh(): Promise<string | null> {
  const response = await refreshClient.post('/api/auth/refresh');
  const token = getAccessTokenFromResponse(response.data);
  if (token) return token;
  throw new Error('Refresh response has no accessToken');
}

// ─── Request: Authorization 헤더만 추가 ───
fetchClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenUtils.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** 댓글 목록 GET 요청이 404(댓글 없음)일 때 에러 대신 빈 배열로 성공 처리 → 콘솔 404 방지 */
function isGetComments404(err: AxiosError): boolean {
  const status = err.response?.status;
  const url = err.config?.url ?? '';
  const method = err.config?.method?.toLowerCase();
  return (
    status === 404 &&
    method === 'get' &&
    /^(?:\/api)?\/boards\/[^/]+\/comments$/.test(url)
  );
}

// ─── Response: 401 시 refresh 1회 → 토큰 저장 → 원래 요청 1회 재시도 ───
fetchClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!config) return Promise.reject(err);

    // 댓글 목록 GET 404 → 댓글 없음으로 간주, 성공 응답으로 변환 (콘솔 404 방지)
    if (err.response && isGetComments404(err)) {
      return Promise.resolve({
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: err.response.headers,
        config,
      });
    }

    // refresh 요청 자체가 실패한 경우 → refresh 재시도 금지
    if (config.url?.includes('/api/auth/refresh')) {
      return Promise.reject(err);
    }

    // 응답 없음(네트워크 오류 등) → 토큰/로그아웃 건드리지 않고 reject
    if (!err.response) {
      return Promise.reject(err);
    }

    if (err.response.status !== 401 || config._retry) {
      return Promise.reject(err);
    }

    // /api/passwordless/* 요청에서 401 시 refresh 시도하지 않고 즉시 reject (불필요한 /auth/refresh 방지)
    if (config.url?.startsWith('/api/passwordless/')) {
      return Promise.reject(err);
    }

    config._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const accessToken = await doRefresh();
            if (accessToken) {
              tokenUtils.setAccessToken(accessToken);
              return accessToken;
            }
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;

      if (!newToken) {
        return Promise.reject(err);
      }

      if (config.headers) {
        config.headers.Authorization = `Bearer ${newToken}`;
      }

      return fetchClient(config);
    } catch (refreshErr) {
      refreshPromise = null;
      const status = (refreshErr as AxiosError)?.response?.status;

      if (status === 400 || status === 401) {
        tokenUtils.clearTokens();
        store.dispatch(clearAuth());
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }

      return Promise.reject(err);
    }
  }
);
