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
import { ChevronLeft, ChevronRight, Heart, Eye } from 'lucide-react';
import { formatViews, formatNickname } from '@/utils/displayFormatters';
import styles from './SpotlightCarousel.module.css';

const CARD_GAP = 20;
const TRANSITION_MS = 650;

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
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const shouldResetWhenReachEndRef = useRef(false);
  const isTransitingRef = useRef(false);
  const [autoplayKey, setAutoplayKey] = useState(0);

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

  /** 썸네일 이미지 프리로드 — 보이는 3장만 로드 후 스켈레톤 숨김 */
  useEffect(() => {
    if (N === 0 || isLoading || imagesLoaded) return;
    const visiblePosts = posts.slice(0, Math.min(3, N));
    let loaded = 0;
    const total = visiblePosts.length;
    visiblePosts.forEach((post) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= total) setImagesLoaded(true);
      };
      img.src = getBoardThumbnailUrl(post, 'spotlight');
    });
  }, [N, isLoading, posts, imagesLoaded]);

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
        requestAnimationFrame(() => {
          setTransitionEnabled(true);
          isTransitingRef.current = false;
        });
      });
    }, TRANSITION_MS);

    return () => clearTimeout(t);
  }, [N, center, layoutReady]);

  /** center 안정화 가드 — transition 중이면 무시 */
  useEffect(() => {
    if (!layoutReady) return;
    if (isTransitingRef.current) return;
    if (center < N - 1 || center > 2 * N) {
      setTransitionEnabled(false);
      setCenter(N);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true);
        });
      });
    }
  }, [center, N, layoutReady]);

  /** autoplay — autoplayKey가 바뀌면 interval이 초기화됨 */
  useEffect(() => {
    if (!layoutReady || N === 0) return;

    const t = setInterval(() => {
      if (isTransitingRef.current) return;
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
  }, [N, layoutReady, autoplayKey]);

  /** 버튼 클릭 시 interval 리셋 — 4초 타이머를 처음부터 다시 시작 */
  const resetAutoplay = () => {
    setAutoplayKey((k) => k + 1);
  };

  /** 이동 */
  const movePrev = () => {
    if (N === 0 || isTransitingRef.current) return;
    resetAutoplay();
    if (center <= N) {
      // 앞쪽 끝 → 뒤로 점프 후 한 칸 이동
      isTransitingRef.current = true;
      setTransitionEnabled(false);
      setCenter(2 * N);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCenter(2 * N - 1);
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
    resetAutoplay();
    if (center >= 2 * N - 1) {
      // 뒤쪽 끝 → 마지막으로 이동 후 리셋 예약
      isTransitingRef.current = true;
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

  /** 스켈레톤: 로딩 중이거나, 레이아웃 미준비이거나, 이미지 미로드 시 표시 */
  const showSkeleton = isLoading || (posts.length > 0 && (!layoutReady || !imagesLoaded));

  /* ── empty ── */
  if (!isLoading && posts.length === 0) {
    return (
      <section
        className={`${styles.section} ${styles.sectionPlaceholder} ${
          darkMode ? 'dark' : ''
        } ${styles.sectionRevealed}`}
      >
        <div className={styles.wrapper}>
          <div className={styles.emptyState}>
            등록된 스팟라이트가 없습니다.
          </div>
        </div>
      </section>
    );
  }

  /* ── content (skeleton overlay until layoutReady) ── */
  return (
    <section
      className={`${styles.section} ${darkMode ? 'dark' : ''} ${styles.sectionRevealed}`}
    >
      <div className={styles.wrapper} ref={wrapperRef}>
        {/* 스켈레톤: layoutReady 전까지 표시, 이후 페이드아웃 */}
        <div className={`${styles.skeletonLayer} ${showSkeleton ? styles.skeletonVisible : styles.skeletonHidden}`}>
          <div className={styles.skeletonTrack}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        </div>

        {/* 실제 캐러셀: 항상 마운트, 스켈레톤 뒤에서 대기 → 크기 점프 방지 */}
        {len > 0 && (
          <div style={{ visibility: showSkeleton ? 'hidden' : 'visible' }}>
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
                    : `transform ${TRANSITION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
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
                        <div className={styles.overlayMetaRow}>
                          <div className={`${styles.author} ${post.deleted ? 'authorDeleted' : ''}`}>{formatNickname(post.nickname, post.deleted, '—')}</div>
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
        )}
      </div>
    </section>
  );
}
