'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { tokenUtils } from '@/utils/tokenUtils';
import { ToastUtils } from '@/utils/toastUtils';
import { Adm1nSidebar } from './Adm1nSidebar';
import { Adm1nHeader } from './Adm1nHeader';
import styles from '@/app/adm1n/admin.module.css';

interface Adm1nLayoutProps {
  children: React.ReactNode;
}

export function Adm1nLayout({ children }: Adm1nLayoutProps) {
  const router = useRouter();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const [authChecked, setAuthChecked] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) {
      router.replace('/auth/adm1n/login');
      return;
    }
    const role = tokenUtils.getRoleFromAccessToken();
    if (role !== 'ADMIN') {
      ToastUtils.error('관리자 권한이 필요합니다.');
      router.replace('/');
      return;
    }
    setAuthChecked(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPageReady(true);
      });
    });
  }, [initialized, isAuthenticated, router]);

  if (!initialized || !authChecked) {
    return null;
  }

  return (
    <div
      className={styles.adminWrap}
      style={{ opacity: pageReady ? 1 : 0, transition: 'opacity 0.3s ease' }}
    >
      <Adm1nSidebar />
      <Adm1nHeader />
      <main className={styles.contentArea}>{children}</main>
    </div>
  );
}
