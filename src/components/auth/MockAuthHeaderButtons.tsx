'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { clearMockLogin } from '@/auth/mock/mockAuth';
import styles from '../common/Header/Header.module.css';

export function MockAuthHeaderButtons() {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();

  if (!isLoggedIn) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      <Link href="/mypage" className={styles.iconBtn} aria-label="마이페이지">
        <User size={20} />
      </Link>
      <Link href="/mypage/updateprofile" className={styles.iconBtn} aria-label="정보수정">
        <User size={20} />
      </Link>
      <button type="button" className={styles.iconBtn} onClick={handleLogout} aria-label="로그아웃">
        <LogOut size={20} />
      </button>
    </>
  );
}
