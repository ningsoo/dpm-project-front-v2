'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import styles from './ShowcaseFeaturedSection.module.css';

interface ShowcasePost {
  id: string;
  title: string;
  authorNickname?: string;
  thumbnail?: string;
  youtubeUrl?: string;
}

const TOTAL = 4;
const HOVER_DELAY = 180;
const SCALE_X = 1.45;   // 좌우 확대 정도
const SCALE_Y = 1.05;   // 세로 살짝

export default function ShowcaseFeaturedSection() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  const [posts, setPosts] = useState<ShowcasePost[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const hoverTimer = useRef<number | null>(null);

  useEffect(() => {
    boardApi
      .getBoardByCategory('showcase' as BoardCategory, {})
      .then(({ data }) => {
        const d = data?.data as { posts?: ShowcasePost[] };
        const all = Array.isArray(d?.posts) ? d.posts : [];
        setPosts(all.slice(0, TOTAL));
      })
      .catch(() => setPosts([]));
  }, []);

  const extractYoutubeId = (url?: string) => {
    if (!url) return '';
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
    return m ? m[1] : '';
  };

  const embedUrl = (url?: string) => {
    const id = extractYoutubeId(url);
    if (!id) return '';
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0`;
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

  if (posts.length < TOTAL) return null;

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <div className={styles.container}>
        <div className={styles.cardWrapper}>
          {posts.map((post, i) => {
            const isActive = i === activeIndex;
            const isPlaying = i === playingIndex && isActive;

            const youtubeId = extractYoutubeId(post.youtubeUrl);
            const hasVideo = !!youtubeId;

            const thumb =
              post.thumbnail ||
              (youtubeId
                ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
                : undefined);

            return (
              <div
                key={post.id}
                className={`${styles.card} ${isActive ? styles.active : ''}`}
                style={{
                  left: getLeftPercent(i),
                  transform: getTransform(i),
                }}
                onMouseEnter={() => onEnter(i)}
                onMouseLeave={() => onLeave(i)}
                onClick={() =>
                  (window.location.href = `/boards/${post.id}`)
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
                    const videoUrl = embedUrl(post.youtubeUrl);
                    return videoUrl ? (
                      <iframe
                        key={`${post.id}-play`}
                        className={`${styles.video} ${styles.visible}`}
                        src={videoUrl}
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
                        {post.authorNickname || '—'}
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
