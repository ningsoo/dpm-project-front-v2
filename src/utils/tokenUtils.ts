/**
 * JWT 토큰 관리 유틸리티
 * localStorage를 사용하여 accessToken만 관리합니다.
 * Refresh Token은 서버 DB에만 저장되며 클라이언트에서는 관리하지 않습니다.
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
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
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
