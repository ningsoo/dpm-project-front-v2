'use client';

import { useLayoutEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { setDarkMode } from '@/store/slices/uiSlice';

export default function ThemeSync() {
  const dispatch = useDispatch<AppDispatch>();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [synced, setSynced] = useState(false);

  // 1) 마운트 시 localStorage → Redux 동기화 (inline script가 이미 DOM에 class 적용한 상태 유지)
  useLayoutEffect(() => {
    const stored = localStorage.getItem('darkMode');
    dispatch(setDarkMode(stored === 'true'));
    setSynced(true);
  }, [dispatch]);

  // 2) synced 이후에만 Redux 기준으로 class 적용 (첫 페인트 시 잘못 제거 방지)
  useLayoutEffect(() => {
    if (!synced) return;
    const html = document.documentElement;
    if (darkMode) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [darkMode, synced]);

  return null;
}
