
/**
 * JWT 토큰 관리 유틸리티
 * 
 * - Access Token: localStorage에 저장하여 관리합니다.
 * - Refresh Token: HttpOnly Cookie로 관리되며 프론트엔드 JavaScript에서는 접근하지 않습니다.
 */

const ACCESS_TOKEN_KEY = 'accessToken';

export const tokenUtils = {
  /**
   * AccessToken을 가져옵니다.
   */
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * AccessToken을 저장합니다.
   */
  setAccessToken: (token: string): void => {
    if (typeof window === 'undefined') {
      console.warn('setAccessToken: window is undefined (SSR)');
      return;
    }
    if (!token || typeof token !== 'string') {
      console.error('setAccessToken: Invalid token', token);
      return;
    }
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      // 저장 확인
      const saved = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (saved !== token) {
        console.error('setAccessToken: Token was not saved correctly', { token, saved });
      }
    } catch (error) {
      console.error('setAccessToken: localStorage error', error);
      throw error;
    }
  },

  /**
   * AccessToken을 제거합니다.
   */
  removeAccessToken: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  /**
   * AccessToken을 제거합니다 (로그아웃 시 사용).
   */
  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  /**
   * JWT payload에서 userId 추출 (권한 판별용).
   * payload에 userId 또는 sub( subject )가 있을 때 사용.
   */
  getUserIdFromToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(base64);
      const payload = JSON.parse(json) as Record<string, unknown>;
      const userId = payload.userId ?? payload.sub;
      if (userId === undefined || userId === null) return null;
      return String(userId);
    } catch {
      return null;
    }
  },

  /**
   * JWT payload에서 userId를 number로 추출 (조회 URL 구성용).
   * userId > id > sub 순으로 확인, number로 변환 가능한 값만 인정.
   * 권한 판별용이 아님(서명 검증 없음).
   */
  getUserIdFromAccessToken: (): number | null => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(base64);
      const payload = JSON.parse(json) as Record<string, unknown>;
      const raw = payload.userId ?? payload.id ?? payload.sub;
      if (raw === undefined || raw === null) return null;
      const num = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(num) ? num : null;
    } catch {
      return null;
    }
  },

  /**
   * JWT payload에서 role 추출 (조회 URL 구성용).
   * 권한 판별용이 아님(서명 검증 없음).
   */
  getRoleFromAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(base64);
      const payload = JSON.parse(json) as Record<string, unknown>;
      const role = payload.role;
      return role != null && typeof role === 'string' ? role : null;
    } catch {
      return null;
    }
  },
};
