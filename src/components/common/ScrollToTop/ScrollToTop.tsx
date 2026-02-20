'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 페이지 경로가 변경될 때마다 스크롤을 맨 위로 초기화합니다.
 * - 다른 페이지로 이동 시
 * - 회원가입 → 1:1문의 → 회원가입 복귀 시
 * - 브라우저 뒤로가기/앞으로가기 시
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
