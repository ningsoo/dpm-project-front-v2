'use client';

import styles from './MailIcon.module.css';

export interface MailIconProps {
  size?: number;
  className?: string;
  unreadCount?: number;
}

/**
 * lucide-react Mail 아이콘과 동일한 벡터 형태의 커스텀 메일 아이콘.
 * unreadCount가 1 이상일 때 우측 상단에 빨간색 배지를 표시합니다.
 */
export function MailIcon({
  size = 24,
  className = '',
  unreadCount,
}: MailIconProps) {
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
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      {showBadge && (
        <span className={styles.badge} aria-label={`읽지 않은 메시지 ${unreadCount}건`}>
          {badgeText}
        </span>
      )}
    </span>
  );
}
