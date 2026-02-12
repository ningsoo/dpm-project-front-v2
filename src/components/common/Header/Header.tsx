'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Moon, Mail, User, LogIn, LogOut } from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import { toggleDarkMode } from '@/store/slices/uiSlice';
import { logout as authLogout } from '@/store/slices/authSlice';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import logoImg from '@/assets/site/logo.png';
import whiteLogoImg from '@/assets/site/whitelogo.png';
import styles from './Header.module.css';

/** 로그인 시 아이콘 4개 + gap 기준 고정 폭 (레이아웃 밀림 방지) */
const ACTIONS_WIDTH_PX = 184;

const CATEGORIES = [
  { slug: 'showcase', label: 'Showcase' },
  { slug: 'playlists', label: 'Playlists' },
  { slug: 'spotlight', label: 'Spotlight' },
  { slug: 'community', label: 'Community' },
  { slug: 'reviews', label: 'Reviews' },
] as const;

export default function Header() {
  const pathname = usePathname();
  const variant =
    pathname?.startsWith('/auth') || pathname?.startsWith('/mypage/credit')
      ? 'auth'
      : 'main';
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const authInitialized = useSelector((s: RootState) => s.auth.initialized);
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const unreadCount = useSelector((s: RootState) => s.ui.unreadMessageCount);

  /* 인증 resolve 후 실제 UI를 opacity 전환으로 노출 (깜빡임 제거) */
  const [contentVisible, setContentVisible] = useState(false);
  useEffect(() => {
    if (!authInitialized) {
      setContentVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setContentVisible(true));
    return () => cancelAnimationFrame(id);
  }, [authInitialized]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      ToastUtils.success('Logged out');
    } catch {
      // 로그아웃 API 실패해도 클라이언트에서 토큰 제거
    } finally {
      // Redux 상태 초기화 및 토큰 제거 (logout 액션에서 토큰 제거 처리)
      dispatch(authLogout());
      window.location.href = '/';
    }
  };

  const handleDarkMode = () => {
    dispatch(toggleDarkMode());
  };

  if (variant === 'auth') {
    return (
      <header className={`${styles.header} ${styles.authHeader} ${darkMode ? styles.dark : ''}`}>
        <Link href="/" className={styles.logo}>
          <Image
            src={darkMode ? whiteLogoImg : logoImg}
            alt="SOUNDOCK"
            className={styles.logoImg}
            width={340}
            height={36}
            priority
          />
        </Link>
      </header>
    );
  }

  return (
    <header className={`${styles.header} ${darkMode ? styles.dark : ''}`}>
      <Link href="/" className={styles.logo}>
        <Image
          src={darkMode ? whiteLogoImg : logoImg}
          alt="SOUNDOCK"
          className={styles.logoImg}
          width={140}
          height={36}
          priority
        />
      </Link>

      <nav className={styles.nav}>
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/boards/category/${c.slug}`} className={styles.navLink}>
            {c.label}
          </Link>
        ))}
      </nav>

      <div
        className={styles.actions}
        style={{ width: ACTIONS_WIDTH_PX, minWidth: ACTIONS_WIDTH_PX }}
        aria-busy={!authInitialized}
      >
        {!authInitialized ? (
          /* 인증 확인 전: 고정 폭 투명 placeholder (스켈레톤/쉼머 없음, 레이아웃만 유지) */
          <span className={styles.actionsPlaceholder} aria-hidden />
        ) : (
          <div
            className={`${styles.actionsContent} ${contentVisible ? styles.actionsContentVisible : ''}`}
          >
            <button type="button" className={styles.iconBtn} onClick={handleDarkMode} aria-label="다크 모드">
              <Moon size={20} />
            </button>
            {isAuthenticated ? (
              <>
                <Link href="#" className={styles.msgWrapper} aria-label="메시지">
                  <button type="button" className={styles.iconBtn}>
                    <Mail size={20} />
                    {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                  </button>
                </Link>
                <Link href="/mypage" className={styles.iconBtn} aria-label="마이페이지">
                  <User size={20} />
                </Link>
                <button type="button" className={styles.iconBtn} onClick={handleLogout} aria-label="로그아웃">
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <Link href="/auth/login" className={styles.iconBtn} aria-label="로그인">
                <LogIn size={20} />
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
