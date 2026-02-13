'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { checkAuth, setInitialized } from '@/store/slices/authSlice';

/**
 * 앱 초기화 시 accessToken 존재 여부를 확인하고 Redux에 동기화하는 컴포넌트
 * Providers 내부에서 한 번만 실행되어야 함
 */
export default function AuthInitializer() {
  const dispatch = useDispatch<AppDispatch>();
  const initialized = useSelector((state: RootState) => state.auth.initialized);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // 이미 초기화되었거나 초기화 중이면 실행하지 않음
    if (initialized || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    // 앱 시작 시 accessToken 존재 여부 확인
    dispatch(checkAuth());
    dispatch(setInitialized());
  }, [dispatch, initialized]);

  return null;
}
