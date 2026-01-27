import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { tokenUtils } from '@/utils/tokenUtils';
import { mypageApi } from '@/api/mypageApi';
import type { ApiResponse } from '@/api/authApi';

export interface UserInfo {
  id: string;
  email: string;
  nickname: string;
  phone?: string;
  profileImage?: string;
  role?: string;
  credits?: number;
}

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  tokenStatus: 'idle' | 'loading' | 'valid' | 'expired';
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  tokenStatus: 'idle',
  initialized: false,
};

// 앱 초기화 시 사용자 정보를 가져오는 thunk
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = tokenUtils.getAccessToken();
      if (!token) {
        return null;
      }

      // 토큰이 있으면 사용자 정보 가져오기
      const { data } = await mypageApi.getMypage();
      const userData = data?.data as UserInfo | undefined;
      
      if (userData) {
        return userData;
      }
      return null;
    } catch (error: any) {
      // 401 (Unauthorized) 에러인 경우에만 토큰 제거
      // 네트워크 오류나 다른 서버 오류는 토큰을 유지
      if (error?.response?.status === 401) {
        console.warn('initializeAuth: 401 Unauthorized - 토큰 제거');
        tokenUtils.clearTokens();
      } else {
        console.warn('initializeAuth: API 호출 실패 (토큰 유지)', error?.response?.status || error?.message);
      }
      return null;
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserInfo | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      if (action.payload) {
        state.tokenStatus = 'valid';
      }
    },
    setTokenStatus: (state, action: PayloadAction<AuthState['tokenStatus']>) => {
      state.tokenStatus = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.tokenStatus = 'idle';
      // 토큰 제거
      tokenUtils.clearTokens();
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.tokenStatus = 'expired';
      tokenUtils.clearTokens();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.tokenStatus = 'loading';
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.initialized = true;
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
          state.tokenStatus = 'valid';
        } else {
          state.user = null;
          state.isAuthenticated = false;
          state.tokenStatus = 'idle';
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.initialized = true;
        // rejected 상태에서도 토큰이 있으면 유지 (네트워크 오류 등)
        const token = tokenUtils.getAccessToken();
        if (!token) {
          // 토큰이 없으면 완전히 초기화
          state.user = null;
          state.isAuthenticated = false;
          state.tokenStatus = 'idle';
        } else {
          // 토큰이 있으면 유지 (일시적 오류일 수 있음)
          state.tokenStatus = 'valid';
        }
      });
  },
});

export const { setUser, setTokenStatus, logout, clearAuth } = authSlice.actions;
export default authSlice.reducer;
