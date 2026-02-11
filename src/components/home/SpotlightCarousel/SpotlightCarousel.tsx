'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import {
  extractBoardListFromResponse,
  getBoardThumbnailUrl,
} from '@/utils/boardThumbnailUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './SpotlightCarousel.module.css';

const CARD_GAP = 20;
const TRANSITION_MS = 600;

export default function SpotlightCarousel() {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  const [posts, setPosts] = useState<BoardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [center, setCenter] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);

  const [cardWidth, setCardWidth] = useState(0);
  const [wrapperWidth, setWrapperWidth] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const shouldResetWhenReachEndRef = useRef(false);

  /** 데이터 조회 */
  const fetchSpotlights = useCallback(async () => {
    try {
      const { data } = await boardApi.getBoardByCategory('SPOTLIGHT');
      const list = extractBoardListFromResponse(data);
      setPosts(list);
    } catch {
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpotlights();
  }, [fetchSpotlights]);

  const N = Math.min(posts.length, 10);

  /** width 계산 */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setWrapperWidth(w);
      const base = Math.max(200, Math.floor((w - CARD_GAP * 2) / 3));
      setCardWidth(base);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [posts.length]);

  /** layout 준비 후 center=N, layoutReady 세팅 (흔들림 방지) */
  useEffect(() => {
    if (N === 0 || wrapperWidth <= 0 || layoutReady) return;
    setTransitionEnabled(false);
    setCenter(N);
    requestAnimationFrame(() => {
      setLayoutReady(true);
      requestAnimationFrame(() => {
        setTransitionEnabled(true);
      });
    });
  }, [N, wrapperWidth, layoutReady]);

  /** 끝 도달 시 점프 애니메이션 제거 (2N → N 리셋) */
  useEffect(() => {
    if (!layoutReady) return;
    if (center !== 2 * N) return;
    if (!shouldResetWhenReachEndRef.current) return;

    const t = setTimeout(() => {
      setTransitionEnabled(false);
      setCenter(N);
      shouldResetWhenReachEndRef.current = false;
      requestAnimationFrame(() => {
        setTransitionEnabled(true);
      });
    }, TRANSITION_MS);

    return () => clearTimeout(t);
  }, [N, center, layoutReady]);

  /** center 안정화 가드 */
  useEffect(() => {
    if (!layoutReady) return;
    if (center < N - 1 || center > 2 * N) {
      setTransitionEnabled(false);
      setCenter(N);
      requestAnimationFrame(() => {
        setTransitionEnabled(true);
      });
    }
  }, [center, N, layoutReady]);

  /** autoplay */
  useEffect(() => {
    if (!layoutReady || N === 0) return;

    const t = setInterval(() => {
      setCenter((c) => {
        if (c >= 2 * N - 1) {
          shouldResetWhenReachEndRef.current = true;
          return 2 * N;
        }
        return c + 1;
      });
    }, 4000);

    return () => clearInterval(t);
  }, [N, layoutReady]);

  /** 이동 */
  const movePrev = () => {
    if (N === 0) return;

    if (center === N) {
      setTransitionEnabled(false);
      setCenter(2 * N);
      requestAnimationFrame(() => {
        setCenter(2 * N - 1);
        requestAnimationFrame(() => setTransitionEnabled(true));
      });
    } else {
      setCenter((c) => c - 1);
    }
  };

  const moveNext = () => {
    if (N === 0) return;

    if (center >= 2 * N - 1) {
      shouldResetWhenReachEndRef.current = true;
      setCenter(2 * N);
    } else {
      setCenter((c) => c + 1);
    }
  };

  const goToPost = (postId: number) => {
    router.push(`/boards/${postId}`);
  };

  /** 데이터 구성 */
  const originalPosts = posts.slice(0, 10);
  const displayPosts = [...originalPosts, ...originalPosts, ...originalPosts];
  const len = displayPosts.length;

  /** translate 계산 (layoutReady 전에는 0으로 흔들림 방지) */
  const translateX =
    !layoutReady || !cardWidth || !wrapperWidth || len === 0
      ? 0
      : wrapperWidth / 2 -
        cardWidth / 2 -
        center * (cardWidth + CARD_GAP);

  const trackTransform = layoutReady
    ? `translateX(${translateX}px)`
    : 'translateX(0px)';

  /** skeleton */
  if (isLoading) {
    return (
      <section
        className={`${styles.section} ${styles.sectionPlaceholder} ${
          darkMode ? 'dark' : ''
        }`}
      >
        <div className={styles.wrapper} ref={wrapperRef}>
          <div className={styles.track}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  /** empty */
  if (posts.length === 0) {
    return (
      <section
        className={`${styles.section} ${styles.sectionPlaceholder} ${
          darkMode ? 'dark' : ''
        }`}
      >
        <div className={styles.wrapper}>
          <div className={styles.emptyState}>
            등록된 스팟라이트가 없습니다.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <div className={styles.wrapper} ref={wrapperRef}>
        <button
          type="button"
          className={styles.prevBtn}
          onClick={movePrev}
        >
          <ChevronLeft size={48} />
        </button>

        <button
          type="button"
          className={styles.nextBtn}
          onClick={moveNext}
        >
          <ChevronRight size={48} />
        </button>

        <div
          className={styles.track}
          style={{
            transform: trackTransform,
            transition:
              !transitionEnabled || !layoutReady
                ? 'none'
                : `transform ${TRANSITION_MS}ms ease`,
          }}
        >
          {displayPosts.map((post, index) => {
            const isCenter = index === center;

            return (
              <div
                key={`${post.boardId}-${index}`}
                className={`${styles.card} ${
                  isCenter ? styles.center : ''
                }`}
                style={{ width: cardWidth, minWidth: cardWidth }}
                onClick={() => goToPost(post.boardId)}
              >
                <div
                  className={styles.thumb}
                  style={{
                    backgroundImage: `url(${getBoardThumbnailUrl(
                      post,
                      'spotlight'
                    )})`,
                  }}
                >
                  <div className={styles.overlay}>
                    <div className={styles.cardTitle}>
                      {post.title}
                    </div>
                    <div className={styles.desc}>
                      {post.content || ''}
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
