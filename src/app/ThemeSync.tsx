'use client';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function ThemeSync() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [darkMode]);

  return null;
}
