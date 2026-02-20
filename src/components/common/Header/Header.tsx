'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Moon, User, LogIn, LogOut } from 'lucide-react';
import { MailIcon } from '@/assets/site/MailIcon';
import { NotificationIcon } from '@/assets/site/NotificationIcon';
import MessageListModal from '@/components/common/MessageListModal/MessageListModal';
import NotificationDropdown from '@/components/common/NotificationDropdown/NotificationDropdown';
import { messageApi } from '@/api/messageApi';
import { notificationApi } from '@/api/notificationApi';
import { RootState, AppDispatch } from '@/store';
import {
  toggleDarkMode,
  setUnreadMessageCount,
  setUnreadNotificationCount,
} from '@/store/slices/uiSlice';
import { logout as authLogout } from '@/store/slices/authSlice';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import logoImg from '@/assets/site/logo.png';
import whiteLogoImg from '@/assets/site/whitelogo.png';
import styles from './Header.module.css';

/** 로그인 시 아이콘 5개 + gap 기준 고정 폭 (레이아웃 밀림 방지) */
const ACTIONS_WIDTH_PX = 232;

const CATEGORIES = [
  { slug: 'showcase', label: 'Showcase' },
  { slug: 'playlists', label: 'Playlists' },
  { slug: 'spotlight', label: 'Spotlight' },
  { slug: 'community', label: 'Community' },
  { slug: 'reviews', label: 'Reviews' },
] as const;

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const variant =
    pathname?.startsWith('/auth') || pathname?.startsWith('/mypage/credit')
      ? 'auth'
      : 'main';
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const authInitialized = useSelector((s: RootState) => s.auth.initialized);
  const unreadCount = useSelector((s: RootState) => s.ui.unreadMessageCount);
  const unreadNotificationCount = useSelector((s: RootState) => s.ui.unreadNotificationCount);

  const [showMessageListModal, setShowMessageListModal] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const messageBtnRef = useRef<HTMLButtonElement>(null);
  const notificationBtnRef = useRef<HTMLButtonElement>(null);

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

  /* 로그인 시에만 unread 메시지/알림 개수 조회 (중복 호출 방지: isAuthenticated true일 때 1회) */
  useEffect(() => {
    if (!authInitialized || !isAuthenticated) return;

    Promise.allSettled([
      messageApi.getUnreadCount(),
      notificationApi.getUnreadCount(),
    ]).then(([messageResult, notificationResult]) => {
      if (messageResult.status === 'fulfilled') {
        const count = messageResult.value?.data?.data;
        if (typeof count === 'number') {
          dispatch(setUnreadMessageCount(count));
        }
      } else {
        console.error('[unread message count]', messageResult.reason);
      }
      if (notificationResult.status === 'fulfilled') {
        const count = notificationResult.value?.data?.data;
        if (typeof count === 'number') {
          dispatch(setUnreadNotificationCount(count));
        }
      } else {
        console.error('[unread notification count]', notificationResult.reason);
      }
    });
  }, [authInitialized, isAuthenticated, dispatch]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 로그아웃 API 실패해도 클라이언트에서 토큰 제거
    }
    // 로그아웃 토스트는 페이지 리로드 후에도 표시되도록 localStorage에 저장
    // persistAfterReload: true로 설정하여 페이지 이동 후에도 토스트가 유지되도록 함
    ToastUtils.success('로그아웃 되었습니다');
    // Redux 상태 초기화 및 토큰 제거 (logout 액션에서 토큰 제거 처리)
    dispatch(authLogout());
    // 토스트가 표시된 후 충분한 딜레이를 두고 리다이렉트 (토스트가 보이도록)
    // 500ms 정도 지연시켜서 현재 페이지에서 토스트가 보이도록 함
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  const handleDarkMode = () => {
    dispatch(toggleDarkMode());
  };

  if (variant === 'auth') {
    return (
      <header className={`${styles.header} ${styles.authHeader}`}>
        <Link href="/" className={styles.logo} aria-label="SOUNDOCK">
          <span className={styles.logoLight} aria-hidden>
            <Image src={logoImg} alt="" className={styles.logoImg} width={340} height={36} priority />
          </span>
          <span className={styles.logoDark} aria-hidden>
            <Image src={whiteLogoImg} alt="" className={styles.logoImg} width={340} height={36} priority />
          </span>
        </Link>
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <span className={styles.logoLight} aria-hidden>
          <Image src={logoImg} alt="SOUNDOCK" className={styles.logoImg} width={140} height={36} priority />
        </span>
        <span className={styles.logoDark} aria-hidden>
          <Image src={whiteLogoImg} alt="SOUNDOCK" className={styles.logoImg} width={140} height={36} priority />
        </span>
      </Link>

      <nav className={styles.nav}>
        {CATEGORIES.map((c) => {
          const categoryMatch = pathname?.match(/^\/boards\/category\/([^/]+)/)?.[1]?.toLowerCase();
          const isOnCategoryPage = !!categoryMatch;
          const isActive = isOnCategoryPage && categoryMatch === c.slug;
          return (
            <Link
              key={c.slug}
              href={`/boards/category/${c.slug}`}
              className={isActive ? styles.navLink : isOnCategoryPage ? styles.navLinkInactive : styles.navLink}
            >
              {c.label}
            </Link>
          );
        })}
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
                <button
                  ref={messageBtnRef}
                  type="button"
                  className={`${styles.msgWrapper} ${styles.iconBtn}`}
                  onClick={() => setShowMessageListModal(true)}
                  aria-label="메시지"
                >
                  <MailIcon size={20} unreadCount={unreadCount} />
                </button>
                <div className={styles.msgWrapper}>
                  <button
                    ref={notificationBtnRef}
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setShowNotificationDropdown((p) => !p)}
                    aria-label="알림"
                  >
                    <NotificationIcon size={20} unreadCount={unreadNotificationCount} />
                  </button>
                  <NotificationDropdown
                    open={showNotificationDropdown}
                    onClose={() => setShowNotificationDropdown(false)}
                    anchorRef={notificationBtnRef}
                  />
                </div>
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

      <MessageListModal
        open={showMessageListModal}
        onClose={() => setShowMessageListModal(false)}
        anchorRef={messageBtnRef}
        onLoginRequired={() => {
          setShowMessageListModal(false);
          router.push(`/auth/login?redirect=${encodeURIComponent(pathname ?? '/')}`);
        }}
      />
    </header>
  );
}
