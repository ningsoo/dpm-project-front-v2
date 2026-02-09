'use client';

import { useState } from 'react';
import styles from './YouTubeHoverThumbnail.module.css';

interface YouTubeHoverThumbnailProps {
  /** 썸네일 이미지 URL (비 hover 시 표시) */
  thumbnailUrl: string;
  /** YouTube videoId (hover 시 iframe 자동재생용) */
  videoId: string;
  /** 추가 className */
  className?: string;
  /** alt 텍스트 */
  alt?: string;
}

/**
 * SHOWCASE 게시판용: hover 시 YouTube 영상 자동재생, 해제 시 재생 중단
 */
export default function YouTubeHoverThumbnail({
  thumbnailUrl,
  videoId,
  className = '',
  alt = '',
}: YouTubeHoverThumbnailProps) {
  const [isHovered, setIsHovered] = useState(false);

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`
    : '';

  return (
    <div
      className={`${styles.wrap} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && embedUrl ? (
        <iframe
          className={styles.iframe}
          src={embedUrl}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={alt || 'YouTube video'}
        />
      ) : (
        <img src={thumbnailUrl} alt={alt} className={styles.thumb} />
      )}
    </div>
  );
}
