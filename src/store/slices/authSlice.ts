import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { tokenUtils } from '@/utils/tokenUtils';

interface AuthState {
  isAuthenticated: boolean;
  initialized: boolean;
}

/** 클라이언트에서 localStorage 기반으로 즉시 hydrate → 새로고침 시 헤더 아이콘 깜빡임 방지 */
function getInitialAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, initialized: false };
  }
  const token = tokenUtils.getAccessToken();
  return { isAuthenticated: !!token, initialized: true };
}

const initialState: AuthState = getInitialAuthState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // accessToken 존재 여부로 isAuthenticated 업데이트
    checkAuth: (state) => {
      const token = tokenUtils.getAccessToken();
      state.isAuthenticated = !!token;
    },
    // 초기화 완료 플래그 설정
    setInitialized: (state) => {
      state.initialized = true;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      tokenUtils.clearTokens();
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      tokenUtils.clearTokens();
    },
  },
});

export const { checkAuth, setInitialized, logout, clearAuth } = authSlice.actions;
export default authSlice.reducer;
