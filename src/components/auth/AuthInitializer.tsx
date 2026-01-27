'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { initializeAuth } from '@/store/slices/authSlice';

/**
 * 앱 초기화 시 인증 상태를 확인하고 Redux에 동기화하는 컴포넌트
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
    // 앱 시작 시 토큰 확인 및 사용자 정보 로드
    dispatch(initializeAuth());
  }, [dispatch, initialized]);

  return null;
}
