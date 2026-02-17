'use client';

import styles from './NotificationIcon.module.css';

export interface NotificationIconProps {
  size?: number;
  className?: string;
  unreadCount?: number;
}

/**
 * lucide-react Bell 아이콘과 동일한 벡터 형태의 커스텀 알림 아이콘.
 * unreadCount가 1 이상일 때 우측 상단에 빨간색 배지를 표시합니다.
 */
export function NotificationIcon({
  size = 24,
  className = '',
  unreadCount,
}: NotificationIconProps) {
  const showBadge = unreadCount !== undefined && unreadCount > 0;
  const badgeText = unreadCount !== undefined && unreadCount > 99
    ? '99+'
    : String(unreadCount);

  return (
    <span className={`${styles.wrapper} ${className}`.trim()}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {showBadge && (
        <span className={styles.badge} aria-label={`읽지 않은 알림 ${unreadCount}건`}>
          {badgeText}
        </span>
      )}
    </span>
  );
}
