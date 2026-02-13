import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { tokenUtils } from '@/utils/tokenUtils';

interface AuthState {
  isAuthenticated: boolean;
  initialized: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  initialized: false,
};

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
