'use client';

import { useState, useCallback } from 'react';
import styles from './YouTubeHoverThumbnail.module.css';

interface YouTubeHoverThumbnailProps {
  /** 썸네일 이미지 URL (비 hover 시 표시, hover 중에도 로딩 전까지 유지) */
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
 * - 레이어: 썸네일(항상 하단) + video(absolute overlay)
 * - iframe은 로드 완료(onLoad) 후에만 opacity로 노출하여 배경 깜빡임 방지
 */
export default function YouTubeHoverThumbnail({
  thumbnailUrl,
  videoId,
  className = '',
  alt = '',
}: YouTubeHoverThumbnailProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`
    : '';

  const handleMouseEnter = useCallback(() => {
    setVideoReady(false);
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setVideoReady(false);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setVideoReady(true);
  }, []);

  return (
    <div
      className={`${styles.wrap} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. 썸네일: 항상 하단 레이어 (hover 중에도 로딩 전까지 유지) */}
      <img src={thumbnailUrl} alt={alt} className={styles.thumb} />

      {/* 2. video 레이어: hover 시 마운트, 로드 완료 후 opacity로만 노출 (display 미사용) */}
      {isHovered && embedUrl ? (
        <div
          className={`${styles.videoWrap} ${videoReady ? styles.visible : ''}`}
          aria-hidden
        >
          <iframe
            className={styles.iframe}
            src={embedUrl}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={alt || 'YouTube video'}
            onLoad={handleIframeLoad}
          />
        </div>
      ) : null}
    </div>
  );
}
