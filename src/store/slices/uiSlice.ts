import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  darkMode: boolean;
  unreadMessageCount: number;
  unreadNotificationCount: number;
}

const initialState: UiState = {
  // SSR/CSR 일관성을 위해 기본값은 항상 false.
  // 실제 사용자 설정은 클라이언트에서 ThemeSync가 mount 된 뒤 localStorage로부터 복원한다.
  darkMode: false,
  unreadMessageCount: 0,
  unreadNotificationCount: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', String(state.darkMode));
      }
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', String(state.darkMode));
      }
    },
    setUnreadMessageCount: (state, action: PayloadAction<number>) => {
      state.unreadMessageCount = action.payload;
    },
    setUnreadNotificationCount: (state, action: PayloadAction<number>) => {
      state.unreadNotificationCount = action.payload;
    },
  },
});

export const { toggleDarkMode, setDarkMode, setUnreadMessageCount, setUnreadNotificationCount } = uiSlice.actions;
export default uiSlice.reducer;
