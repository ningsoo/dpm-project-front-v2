'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { setDarkMode } from '@/store/slices/uiSlice';

export default function ThemeSync() {
  const dispatch = useDispatch<AppDispatch>();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored === 'true') dispatch(setDarkMode(true));
  }, [dispatch]);

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [darkMode]);

  return null;
}
