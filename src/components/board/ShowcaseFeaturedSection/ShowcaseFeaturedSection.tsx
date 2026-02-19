'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import {
  extractBoardListFromResponse,
  getBoardThumbnailUrl,
  getShowcaseVideoId,
} from '@/utils/boardThumbnailUtils';
import styles from './ShowcaseFeaturedSection.module.css';

/** 마운트 후 1프레임 뒤 reveal → 배경 단독 노출(flicker) 방지 */
const useSectionReveal = () => {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return revealed;
};

const TOTAL = 4;
const HOVER_DELAY = 180;

export default function ShowcaseFeaturedSection() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  const [posts, setPosts] = useState<BoardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const hoverTimer = useRef<number | null>(null);

  /* 첫 프레임 배경 단독 노출 제거 후 스켈레톤/콘텐츠 자연스럽게 등장 */
  const sectionRevealed = useSectionReveal();

  useEffect(() => {
    setIsLoading(true);
    boardApi
      .getHotCategoryBoard('SHOWCASE')
      .then(({ data }) => {
        const list = extractBoardListFromResponse(data);
        setPosts(list.slice(0, TOTAL));
      })
      .catch(() => setPosts([]))
      .finally(() => setIsLoading(false));
  }, []);

  const getEmbedUrl = (videoId: string) => {
    if (!videoId) return '';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0`;
  };

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const onEnter = (index: number) => {
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(() => {
      setActiveIndex(index);
      setPlayingIndex(index);
    }, HOVER_DELAY);
  };

  const onLeave = (index: number) => {
    clearHoverTimer();
    setPlayingIndex((prev) => (prev === index ? null : prev));
    setActiveIndex(null);
  };

  /**
   * active 카드: 50% 너비 + 16:9 비율로 확장, 좌우 카드 위에 겹침
   * 비활성 카드: 기본 25% 너비
   */
  const getCardStyle = (index: number): React.CSSProperties => {
    const isActive = index === activeIndex;

    if (!isActive) {
      return {
        left: `${index * 25}%`,
        width: '25%',
        height: 380,
        transform: 'translateY(-50%)',
      };
    }

    // active: 50% 너비, 16:9 비율 높이
    // left를 재계산해서 카드 중심이 원래 위치에 유지되도록
    const originalCenterPercent = index * 25 + 12.5; // 원래 중심(%)
    let leftPercent = originalCenterPercent - 25;     // 50%의 절반 = 25

    // 좌측/우측 끝 클램프
    if (leftPercent < 0) leftPercent = 0;
    if (leftPercent + 50 > 100) leftPercent = 50;

    return {
      left: `${leftPercent}%`,
      width: '50%',
      height: 380,
      transform: 'translateY(-50%)',
    };
  };

  const hasEnoughPosts = posts.length >= TOTAL;

  return (
    <section
      className={`${styles.section} ${!hasEnoughPosts ? styles.sectionPlaceholder : ''} ${darkMode ? 'dark' : ''} ${
        sectionRevealed ? styles.sectionRevealed : styles.sectionHidden
      }`}
    >
      <div className={styles.container}>
        <div className={styles.cardWrapper}>
          {/* 스켈레톤: 로딩 중에만 표시, crossfade */}
          <div
            className={styles.skeletonLayer}
            style={{
              opacity: isLoading ? 1 : 0,
              pointerEvents: isLoading ? 'auto' : 'none',
              transition: 'opacity 0.25s ease',
            }}
          >
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className={styles.skeletonCard}
                style={{ left: `${i * 25}%` }}
              >
                <div className={styles.skeletonThumb} />
              </div>
            ))}
          </div>

          {/* 실제 콘텐츠: 로딩 완료 후 표시, crossfade */}
          {!isLoading && hasEnoughPosts && posts.map((post, i) => {
            const isActive = i === activeIndex;
            const isPlaying = i === playingIndex && isActive;

            const videoId = getShowcaseVideoId(post);
            const hasVideo = !!videoId;
            const thumb = getBoardThumbnailUrl(post, 'showcase');

            return (
              <div
                key={post.boardId}
                className={`${styles.card} ${isActive ? styles.active : ''}`}
                style={getCardStyle(i)}
                onMouseEnter={() => onEnter(i)}
                onMouseLeave={() => onLeave(i)}
                onClick={() =>
                  (window.location.href = `/boards/${post.boardId}`)
                }
              >
                <div className={styles.mediaContainer}>
                  {thumb && (
                    <img
                      src={thumb}
                      alt={post.title}
                      className={`${styles.thumbnail} ${
                        isPlaying ? styles.hidden : ''
                      }`}
                    />
                  )}

                  {hasVideo && isPlaying && (() => {
                    const embedUrl = getEmbedUrl(videoId);
                    return embedUrl ? (
                      <iframe
                        key={`${post.boardId}-play`}
                        className={`${styles.video} ${styles.visible}`}
                        src={embedUrl}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        title={post.title}
                      />
                    ) : null;
                  })()}

                  <div
                    className={`${styles.overlay} ${
                      isPlaying ? styles.visible : ''
                    }`}
                  >
                    <div className={styles.overlayContent}>
                      <div className={styles.author}>
                        {post.nickname || '—'}
                      </div>
                      <div className={styles.title}>{post.title}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 빈 상태 */}
          {!isLoading && !hasEnoughPosts && (
            <div className={styles.emptyState}>등록된 쇼케이스가 없습니다.</div>
          )}
        </div>
      </div>
    </section>
  );
}
