'use client';

import Link from 'next/link';
import { Heart, Eye } from 'lucide-react';
import { formatViews, formatNickname } from '@/utils/displayFormatters';
import defaultProfileImg from '@/assets/site/profile.png';
import styles from './BoardCard.module.css';

export interface BoardCardProps {
  /** 썸네일 영역 (img 또는 YouTubeHoverThumbnail 등) */
  thumbnail: React.ReactNode;
  title: string;
  /** 작성자 닉네임 */
  nickname?: string | null;
  /** 탈퇴 여부 (API deleted 필드) */
  deleted?: boolean;
  /** 작성자 프로필 이미지 URL */
  profileImage?: string | null;
  likeCount?: number | null;
  viewCount?: number | null;
  /** community/reviews용 번호 (선택) */
  displayNumber?: number;
  /** Link 사용 시 href, 없으면 as div + onClick */
  href?: string;
  onClick?: () => void;
  /** 추가 className (카드 루트) */
  className?: string;
  children?: never;
}

export default function BoardCard({
  thumbnail,
  title,
  nickname,
  deleted,
  profileImage,
  likeCount = 0,
  viewCount = 0,
  displayNumber,
  href,
  onClick,
  className = '',
}: BoardCardProps) {
  const likes = Number(likeCount) ?? 0;
  const views = Number(viewCount) ?? 0;

  const content = (
    <>
      <div className={styles.thumbWrap}>{thumbnail}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>
          {displayNumber != null && (
            <span className={styles.displayNumber}>{displayNumber}.</span>
          )}
          {title}
        </div>
        <div className={styles.authorMetaRow}>
          <div className={styles.authorInfo}>
            <span className={styles.avatar}>
              <img
                src={profileImage || defaultProfileImg.src}
                alt=""
                className={`${styles.avatarImg} ${!profileImage ? styles.avatarImgContain : ''}`}
              />
            </span>
            <span className={`${styles.author} ${deleted ? 'authorDeleted' : ''}`}>{formatNickname(nickname, deleted)}</span>
          </div>
          <div className={styles.meta}>
            <span className={`${styles.metaItem} ${styles.metaItemHeart}`}>
              <Heart className={styles.metaItemIcon} size={14} strokeWidth={2} />
              {likes}
            </span>
            <span className={`${styles.metaItem} ${styles.metaItemEye}`}>
              <Eye className={styles.metaItemIcon} size={14} strokeWidth={2} />
              {formatViews(views)}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${styles.card} ${className}`.trim()}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${className}`.trim()}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {content}
    </div>
  );
}
