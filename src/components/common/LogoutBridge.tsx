'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ToastUtils } from '@/utils/toastUtils';

/**
 * 홈('/')에서만 로그아웃 관련 sessionStorage 플래그를 소비하고 토스트를 1회 표시한다.
 * 다른 페이지에서는 플래그를 건드리지 않는다.
 */
export default function LogoutBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') return;

    const toastFlag = sessionStorage.getItem('soundock_logout_toast');
    if (toastFlag === '1') {
      sessionStorage.removeItem('soundock_logout_toast');
      ToastUtils.success('로그아웃 되었습니다.');
    }

    const redirectFlag = sessionStorage.getItem('soundock_logout_redirect');
    if (redirectFlag === '1') {
      sessionStorage.removeItem('soundock_logout_redirect');
    }
  }, [pathname]);

  return null;
}
