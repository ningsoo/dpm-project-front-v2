'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import {
  extractBoardListFromResponse,
  getBoardThumbnailUrl,
} from '@/utils/boardThumbnailUtils';
import type { BoardCategorySlug } from '@/utils/boardThumbnailUtils';
import { ChevronLeft, ChevronRight, Heart, Eye } from 'lucide-react';
import { formatViews } from '@/utils/displayFormatters';
import styles from './CommonBoardCarousel.module.css';

/** 데이터 + 레이아웃 준비 전 배경 flicker 방지: 준비 후 opacity 전환 */
const useSectionReveal = (isLoading: boolean, hasContent: boolean, layoutReady: boolean) => {
  const [revealed, setRevealed] = useState(false);
  const isReady = isLoading || !hasContent || layoutReady;
  useEffect(() => {
    if (!isReady) {
      setRevealed(false);
      return;
    }
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, [isReady]);
  return revealed;
};

const CARD_GAP = 20;
const TRANSITION_MS = 650;

interface CommonBoardCarouselProps {
  category: BoardCategory;
}

export default function CommonBoardCarousel({ category }: CommonBoardCarouselProps) {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  const [posts, setPosts] = useState<BoardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [center, setCenter] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [hoveredCenter, setHoveredCenter] = useState(false);
  const [cardWidth, setCardWidth] = useState(300);
  const [wrapperWidth, setWrapperWidth] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const shouldResetWhenReachEndRef = useRef(false);
  const isTransitingRef = useRef(false);

  const sectionRevealed = useSectionReveal(isLoading, posts.length > 0, layoutReady);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await boardApi.getBoardByCategory(category);
      const list = extractBoardListFromResponse(data);
      setPosts(list);
    } catch {
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    setIsLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const N = Math.min(posts.length, 10);
  const totalCount = N * 3;

  /** layout 준비 후 center=N, layoutReady 세팅 (초기 밀림 방지) */
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
    isTransitingRef.current = true;
    const t = setTimeout(() => {
      setTransitionEnabled(false);
      setCenter(N);
      shouldResetWhenReachEndRef.current = false;
      requestAnimationFrame(() => {
        setTransitionEnabled(true);
        isTransitingRef.current = false;
      });
    }, TRANSITION_MS);
    return () => clearTimeout(t);
  }, [center, N, layoutReady]);

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
      if (isTransitingRef.current) return;       // 전환 중이면 건너뜀
      setCenter((c) => {
        if (c >= 2 * N - 1) {
          isTransitingRef.current = true;
          shouldResetWhenReachEndRef.current = true;
          return 2 * N;
        }
        return c + 1;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [N, layoutReady]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const base = Math.max(200, Math.floor((w - CARD_GAP * 2) / 3));
      setCardWidth(base);
      setWrapperWidth(w);
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

  const movePrev = () => {
    if (N === 0 || isTransitingRef.current) return;
    if (center === N) {
      isTransitingRef.current = true;
      setTransitionEnabled(false);
      setCenter(2 * N);
      requestAnimationFrame(() => {
        setCenter(2 * N - 1);
        requestAnimationFrame(() => {
          setTransitionEnabled(true);
          setTimeout(() => { isTransitingRef.current = false; }, TRANSITION_MS);
        });
      });
    } else {
      setCenter((c) => c - 1);
    }
  };

  const moveNext = () => {
    if (N === 0 || isTransitingRef.current) return;
    if (center >= 2 * N - 1) {
      isTransitingRef.current = true;          // 즉시 잠금 — 리셋 완료 전 추가 클릭 차단
      shouldResetWhenReachEndRef.current = true;
      setCenter(2 * N);
    } else {
      setCenter((c) => c + 1);
    }
  };

  const goToPost = (postId: number) => {
    router.push(`/boards/${postId}`);
  };

  const originalPosts = posts.slice(0, 10);
  const displayPosts = [...originalPosts, ...originalPosts, ...originalPosts];
  const len = displayPosts.length;

  const translateX =
    layoutReady && len > 0 && wrapperWidth > 0
      ? wrapperWidth / 2 - cardWidth / 2 - center * (cardWidth + CARD_GAP)
      : 0;

  const trackTransform = layoutReady
    ? `translateX(${translateX}px)`
    : 'translateX(0px)';

  if (isLoading) {
    return (
      <section
        className={`${styles.section} ${styles.sectionPlaceholder} ${darkMode ? 'dark' : ''} ${
          sectionRevealed ? styles.sectionRevealed : styles.sectionHidden
        }`}
      >
        <div className={styles.wrapper}>
          <div className={styles.track}>
            {[0, 1, 2].map((i) => (
              <div key={`skeleton-${i}`} className={styles.skeletonCard} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section
        className={`${styles.section} ${styles.sectionPlaceholder} ${darkMode ? 'dark' : ''} ${
          sectionRevealed ? styles.sectionRevealed : styles.sectionHidden
        }`}
      >
        <div className={styles.wrapper}>
          <div className={styles.track}>
            <div className={styles.emptyState}>등록된 게시글이 없습니다.</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${styles.section} ${darkMode ? 'dark' : ''} ${
        sectionRevealed ? styles.sectionRevealed : styles.sectionHidden
      }`}
    >
      <div className={styles.wrapper} ref={wrapperRef}>
        <button type="button" className={styles.prevBtn} onClick={movePrev} aria-label="이전">
          <ChevronLeft size={48} />
        </button>
        <button type="button" className={styles.nextBtn} onClick={moveNext} aria-label="다음">
          <ChevronRight size={48} />
        </button>

        <div
          className={styles.track}
          style={{
            transform: trackTransform,
            transition: transitionEnabled ? undefined : 'none',
          }}
        >
          {displayPosts.map((post, index) => {
            const isCenter = index === center;
            const categorySlug = String(category).toLowerCase() as BoardCategorySlug;
            const imageUrl = getBoardThumbnailUrl(post, categorySlug);
            return (
              <div
                key={`${post.boardId}-${index}`}
                role="button"
                tabIndex={0}
                className={`${styles.card} ${isCenter ? styles.center : ''} ${
                  hoveredCenter && isCenter ? styles.expanded : ''
                }`}
                style={{ width: cardWidth, minWidth: cardWidth }}
                onMouseEnter={() => isCenter && setHoveredCenter(true)}
                onMouseLeave={() => isCenter && setHoveredCenter(false)}
                onClick={() => goToPost(post.boardId)}
                onKeyDown={(e) => e.key === 'Enter' && goToPost(post.boardId)}
              >
                <div className={styles.thumb} style={{ backgroundImage: `url(${imageUrl})` }}>
                  <div className={styles.overlay}>
                    <div className={styles.cardTitle}>{post.title}</div>
                    <div className={styles.overlayMetaRow}>
                      <div className={styles.author}>{post.nickname || '—'}</div>
                      <div className={styles.meta}>
                        <span className={styles.metaItem}>
                          <Heart size={14} strokeWidth={2} />
                          {post.likes ?? 0}
                        </span>
                        <span className={styles.metaItem}>
                          <Eye size={14} strokeWidth={2} />
                          {formatViews(post.views)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.desc}>{post.content || ''}</div>
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
