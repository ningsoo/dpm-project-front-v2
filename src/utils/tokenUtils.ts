
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
};
