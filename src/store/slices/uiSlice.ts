import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  darkMode: boolean;
  unreadMessageCount: number;
}

const getInitialDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('darkMode') === 'true';
};

const initialState: UiState = {
  darkMode: getInitialDarkMode(),
  unreadMessageCount: 0,
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
  },
});

export const { toggleDarkMode, setDarkMode, setUnreadMessageCount } = uiSlice.actions;
export default uiSlice.reducer;
