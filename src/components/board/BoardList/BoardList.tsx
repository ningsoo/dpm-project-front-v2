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

  const fetchInitial = useCallback(() => {
    setPosts([]);
    setPage(0);
    setLast(false);
    setHasError(false);
    fetchPage(0, false);
  }, [fetchPage]);

  const fetchMore = useCallback(() => {
    if (loading || loadingMore || last || hasError) return;
    fetchPage(page + 1, true);
  }, [loading, loadingMore, last, hasError, page, fetchPage]);

  useEffect(() => {
    fetchInitial();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [categoryType]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {loading && posts.length === 0 ? (
        <div className={styles.loading}>로딩 중…</div>
      ) : viewMode === 'grid' ? (
        <div className={styles.grid}>
          {displayedPosts.map((p, idx) => {
            const safeCat = category as BoardCategorySlug;
            const thumbnailUrl = getBoardThumbnailUrl(p, safeCat);
            const isShowcase = category === 'showcase';
            const videoId = isShowcase ? getShowcaseVideoId(p) : '';

            const handleCardClick = () => {
              router.push(`/boards/${p.boardId}`);
            };

            return (
              <div
                key={`${p.boardId}-${idx}`}
                className={styles.card}
                onClick={handleCardClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick();
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.thumbWrap}>
                  {isShowcase && videoId ? (
                    <YouTubeHoverThumbnail
                      thumbnailUrl={thumbnailUrl}
                      videoId={videoId}
                      alt={p.title}
                    />
                  ) : (
                    <img src={thumbnailUrl} alt="" className={styles.thumb} />
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>
                    {/* community, reviews 카테고리일 때만 번호 표시 */}
                    {shouldShowNumbers && p.displayNumber && (
                      <span style={{ marginRight: '8px', fontWeight: 'bold' }}>
                        {p.displayNumber}.
                      </span>
                    )}
                    {p.title}
                  </div>
                  <div className={styles.meta}>
                    {p.nickname || '—'} · ♥{p.likes ?? 0}
                    {shouldShowNumbers && ` · 댓글 ${formatCommentCount(p.countComment)}`}
                    {` · views ${formatViews(p.views)}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {/* community, reviews 카테고리일 때만 번호 컬럼 표시 */}
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
                  {/* community, reviews 카테고리일 때만 번호 표시 */}
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
        <div className={styles.loading}>더 불러오는 중…</div>
      )}

      {!loading && posts.length === 0 && (
        <div className={styles.empty}>등록된 게시글이 없습니다.</div>
      )}

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