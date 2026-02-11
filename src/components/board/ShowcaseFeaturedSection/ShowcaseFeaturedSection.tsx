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

const TOTAL = 4;
const HOVER_DELAY = 180;
const SCALE_X = 1.45;   // 좌우 확대 정도
const SCALE_Y = 1.05;   // 세로 살짝

export default function ShowcaseFeaturedSection() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  const [posts, setPosts] = useState<BoardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const hoverTimer = useRef<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    boardApi
      .getBoardByCategory('SHOWCASE')
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

  const getLeftPercent = (index: number) => `${index * 25}%`;

  const getTransform = (index: number) => {
    if (index !== activeIndex) return 'translateY(-50%)';

    // 좌우 확장 방향 제어
    if (index === 0) {
      return `translateY(-50%) scaleX(${SCALE_X}) scaleY(${SCALE_Y}) translateX(10%)`;
    }

    if (index === TOTAL - 1) {
      return `translateY(-50%) scaleX(${SCALE_X}) scaleY(${SCALE_Y}) translateX(-10%)`;
    }

    return `translateY(-50%) scaleX(${SCALE_X}) scaleY(${SCALE_Y})`;
  };

  /* 로딩 중: 높이 선점 + 스켈레톤 */
  if (isLoading) {
    return (
      <section className={`${styles.section} ${styles.sectionPlaceholder} ${darkMode ? 'dark' : ''}`}>
        <div className={styles.container}>
          <div className={styles.cardWrapper}>
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
        </div>
      </section>
    );
  }

  /* 로드 완료 후 데이터 부족: 높이 유지 + 빈 상태 */
  if (posts.length < TOTAL) {
    return (
      <section className={`${styles.section} ${styles.sectionPlaceholder} ${darkMode ? 'dark' : ''}`}>
        <div className={styles.container}>
          <div className={styles.cardWrapper}>
            <div className={styles.emptyState}>등록된 쇼케이스가 없습니다.</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <div className={styles.container}>
        <div className={styles.cardWrapper}>
          {posts.map((post, i) => {
            const isActive = i === activeIndex;
            const isPlaying = i === playingIndex && isActive;

            const videoId = getShowcaseVideoId(post);
            const hasVideo = !!videoId;
            const thumb = getBoardThumbnailUrl(post, 'showcase');

            return (
              <div
                key={post.boardId}
                className={`${styles.card} ${isActive ? styles.active : ''}`}
                style={{
                  left: getLeftPercent(i),
                  transform: getTransform(i),
                }}
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
        </div>
      </div>
    </section>
  );
}
