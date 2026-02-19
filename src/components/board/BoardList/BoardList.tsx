'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import { ToastUtils } from '@/utils/toastUtils';
import { formatCreatedDateTime } from '@/utils/createdDateTime';
import { formatViews, formatCommentCount } from '@/utils/displayFormatters';
import {
  extractPageableInfoFromResponse,
  getBoardThumbnailUrl,
  getShowcaseVideoId,
} from '@/utils/boardThumbnailUtils';
import type { BoardCategorySlug } from '@/utils/boardThumbnailUtils';
import YouTubeHoverThumbnail from '@/components/board/YouTubeHoverThumbnail';
import ShowcaseFeaturedSection from '@/components/board/ShowcaseFeaturedSection';
import CommonBoardCarousel from '@/components/board/CommonBoardCarousel';
import { BoardCard } from '@/components/board/BoardCard';
import styles from './BoardList.module.css';

interface BoardListProps {
  category: string;
  viewMode: 'grid' | 'list';
}

// displayNumber 추가된 타입
interface BoardListItemWithDisplay extends BoardListItem {
  displayNumber?: number;
}

// 소문자 category를 대문자 BoardCategory로 변환
function toBoardCategory(category: string): BoardCategory {
  const upper = category.toUpperCase();
  if (['SHOWCASE', 'PLAYLISTS', 'SPOTLIGHT', 'COMMUNITY', 'REVIEWS'].includes(upper)) {
    return upper as BoardCategory;
  }
  return 'SHOWCASE';
}

export default function BoardList({ category, viewMode }: BoardListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [posts, setPosts] = useState<BoardListItemWithDisplay[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchType, setSearchType] = useState<'title' | 'nickname'>('title');
  const [search, setSearch] = useState('');
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

  /* ── 카테고리 전환 페이드 ── */
  const [contentVisible, setContentVisible] = useState(true);
  const prevCategoryRef = useRef(category);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const FADE_MS = 150;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const categoryType = toBoardCategory(category);

  const shouldShowNumbers = category === 'community' || category === 'reviews';

  const processAndAssignDisplayNumber = useCallback(
    (list: BoardListItem[], startIndex: number): BoardListItemWithDisplay[] => {
      if (!shouldShowNumbers) return list as BoardListItemWithDisplay[];
      return list.map((item, i) => ({
        ...item,
        displayNumber: startIndex + i + 1,
      }));
    },
    [shouldShowNumbers]
  );

  const fetchPage = useCallback(
    async (pageNum: number, isAppend: boolean) => {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const { data } = await boardApi.getBoardByCategory(categoryType, pageNum);
        const { content, last: isLast } = extractPageableInfoFromResponse(data);

        const startIndex = isAppend ? posts.length : 0;
        const withDisplay = processAndAssignDisplayNumber(content, startIndex);

        if (isAppend) {
          setPosts((prev) => [...prev, ...withDisplay] as BoardListItemWithDisplay[]);
        } else {
          setPosts(withDisplay);
        }
        setPage(pageNum);
        setLast(isLast);
        setHasError(false);
      } catch {
        ToastUtils.error('게시글을 불러올 수 없습니다');
        if (!isAppend) setPosts([]);
        setHasError(true);
      } finally {
        if (isAppend) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [categoryType, posts.length, processAndAssignDisplayNumber]
  );

  const fetchMore = useCallback(() => {
    if (loading || loadingMore || last || hasError) return;
    fetchPage(page + 1, true);
  }, [loading, loadingMore, last, hasError, page, fetchPage]);

  // 카테고리 변경 감지 및 초기 로드
  useEffect(() => {
    const prev = prevCategoryRef.current;
    prevCategoryRef.current = category;

    // 타이머 정리
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = undefined;
    }

    // 콘텐츠 숨기고, 데이터 초기화 후 로드
    setContentVisible(false);
    setPosts([]);
    setPage(0);
    setLast(false);
    setHasError(false);

    if (prev !== category) {
      // 카테고리 전환: 이전 콘텐츠 페이드아웃 시간 확보
      fadeTimerRef.current = setTimeout(() => {
        fetchPage(0, false);
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, FADE_MS);
    } else {
      // 최초 마운트: 바로 로드
      fetchPage(0, false);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  // loading 끝나면 실제 데이터 레이어 페이드인
  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;

    if (wasLoading && !loading) {
      requestAnimationFrame(() => {
        setContentVisible(true);
      });
    }
  }, [loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (loading || loadingMore || last || hasError) return;
        fetchMore();
      },
      { root: null, rootMargin: '100px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, loadingMore, last, hasError, fetchMore]);

  const displayedPosts = useMemo(() => {
    const kw = search.trim();
    if (!kw) return posts;
    return posts.filter((p) => {
      if (searchType === 'title') return (p.title ?? '').includes(kw);
      return (p.nickname ?? '').includes(kw);
    });
  }, [posts, search, searchType]);

  const onSearch = () => {};

  const safeCat = ['showcase', 'playlists', 'spotlight', 'community', 'reviews'].includes(category)
    ? category
    : 'showcase';

  const handleWriteClick = () => {
    if (!isAuthenticated) {
      setShowLoginRequiredModal(true);
      return;
    }
    router.push(`/boards/category/${safeCat}/new`);
  };

  const handleGoToLogin = () => {
    setShowLoginRequiredModal(false);
    router.push(`/auth/login?redirect=${encodeURIComponent(pathname ?? '')}`);
  };

  return (
    <section className={styles.section} ref={listContainerRef}>
      {category === 'showcase' && (
        <div className={styles.carouselSection}>
          <ShowcaseFeaturedSection />
        </div>
      )}
      {(category === 'playlists' || category === 'spotlight') && (
        <div className={styles.carouselSection}>
          <CommonBoardCarousel category={categoryType} />
        </div>
      )}

      <div className={styles.searchRow}>
        <div className={styles.search}>
          <select
            className={styles.filter}
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'title' | 'nickname')}
          >
            <option value="title">제목</option>
            <option value="nickname">닉네임</option>
          </select>
          <input
            type="text"
            className={styles.input}
            placeholder="검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <button type="button" className={styles.searchBtn} onClick={onSearch}>
            검색
          </button>
        </div>
        <button
          type="button"
          className={styles.writeBtn}
          onClick={handleWriteClick}
        >
          작성
        </button>
      </div>

      <div className={styles.listContentWrap}>
        {/* ── 스켈레톤 레이어 ── */}
        <div className={`${styles.listLayer} ${loading && posts.length === 0 ? styles.layerVisible : styles.layerHidden}`}>
          {viewMode === 'grid' ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonThumb} />
                  <div className={styles.skeletonBody}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonMeta}>
                      <div className={styles.skeletonMetaLeft} />
                      <div className={styles.skeletonMetaRight} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {shouldShowNumbers && <th>번호</th>}
                    <th>제목</th>
                    <th>작성자</th>
                    <th>좋아요</th>
                    {shouldShowNumbers && <th>댓글</th>}
                    <th>조회</th>
                    <th>날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className={styles.skeletonRow}>
                      {shouldShowNumbers && (
                        <td><div className={styles.skeletonCell} style={{ width: 30 }} /></td>
                      )}
                      <td><div className={styles.skeletonCell} style={{ width: '70%' }} /></td>
                      <td><div className={styles.skeletonCell} style={{ width: 60 }} /></td>
                      <td><div className={styles.skeletonCell} style={{ width: 30 }} /></td>
                      {shouldShowNumbers && (
                        <td><div className={styles.skeletonCell} style={{ width: 30 }} /></td>
                      )}
                      <td><div className={styles.skeletonCell} style={{ width: 40 }} /></td>
                      <td><div className={styles.skeletonCell} style={{ width: 70 }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 실제 콘텐츠 레이어 ── */}
        <div className={`${styles.listLayer} ${contentVisible && !loading ? styles.layerVisible : styles.layerHidden}`}>
          {viewMode === 'grid' ? (
            <div className={styles.grid}>
              {displayedPosts.map((p, idx) => {
                const safeCat = category as BoardCategorySlug;
                const thumbnailUrl = getBoardThumbnailUrl(p, safeCat);
                const isShowcase = category === 'showcase';
                const videoId = isShowcase ? getShowcaseVideoId(p) : '';

                const thumbnail =
                  isShowcase && videoId ? (
                    <YouTubeHoverThumbnail
                      thumbnailUrl={thumbnailUrl}
                      videoId={videoId}
                      alt={p.title}
                    />
                  ) : (
                    <img src={thumbnailUrl} alt="" className={styles.thumb} />
                  );

                return (
                  <BoardCard
                    key={`${p.boardId}-${idx}`}
                    thumbnail={thumbnail}
                    title={p.title}
                    nickname={p.nickname}
                    likeCount={p.likes}
                    viewCount={p.views}
                    displayNumber={shouldShowNumbers ? p.displayNumber : undefined}
                    onClick={() => router.push(`/boards/${p.boardId}`)}
                  />
                );
              })}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {shouldShowNumbers && <th>번호</th>}
                    <th>제목</th>
                    <th>작성자</th>
                    <th>좋아요</th>
                    {shouldShowNumbers && <th>댓글</th>}
                    <th>조회</th>
                    <th>날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPosts.map((p, idx) => (
                    <tr
                      key={`${p.boardId}-${idx}`}
                      onClick={() => router.push(`/boards/${p.boardId}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {shouldShowNumbers && <td>{p.displayNumber}</td>}
                      <td>
                        <Link href={`/boards/${p.boardId}`}>{p.title}</Link>
                      </td>
                      <td>{p.nickname || '—'}</td>
                      <td>{p.likes ?? 0}</td>
                      {shouldShowNumbers && <td>{formatCommentCount(p.countComment)}</td>}
                      <td>{formatViews(p.views)}</td>
                      <td>{formatCreatedDateTime(p.createdDateTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div ref={sentinelRef} className={styles.infiniteScrollSentinel} aria-hidden />

          {loadingMore && (
            <div className={styles.loadingMore}>
              <span className={styles.loadingDot} />
              <span className={styles.loadingDot} />
              <span className={styles.loadingDot} />
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className={styles.empty}>등록된 게시글이 없습니다.</div>
          )}
        </div>
      </div>

      {showLoginRequiredModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <p className={styles.modalMessage}>로그인 페이지로 이동하시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonConfirm}`}
                onClick={handleGoToLogin}
              >
                예
              </button>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                onClick={() => setShowLoginRequiredModal(false)}
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}