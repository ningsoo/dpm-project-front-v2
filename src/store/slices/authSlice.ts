import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { tokenUtils } from '@/utils/tokenUtils';

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
  tokenStatus: 'idle' | 'valid' | 'expired';
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  tokenStatus: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserInfo | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
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
  },
});

export const { setUser, setTokenStatus, logout } = authSlice.actions;
export default authSlice.reducer;
