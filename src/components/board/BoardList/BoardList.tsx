'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import { ToastUtils } from '@/utils/toastUtils';
import { formatCreatedDateTime, toDate } from '@/utils/createdDateTime';
import { formatViews, formatCommentCount } from '@/utils/displayFormatters';
import {
  extractBoardListFromResponse,
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
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState<'title' | 'nickname'>('title');
  const [search, setSearch] = useState('');
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

  const categoryType = toBoardCategory(category);
  
  // community, reviews 카테고리인지 확인
  const shouldShowNumbers = category === 'community' || category === 'reviews';

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await boardApi.getBoardByCategory(categoryType);
      const list = extractBoardListFromResponse(data);
      
      let filtered = list;
      const kw = search.trim();
      if (kw) {
        filtered = list.filter((p) => {
          if (searchType === 'title') {
            return (p.title ?? '').includes(kw);
          } else {
            return (p.nickname ?? '').includes(kw);
          }
        });
      }

      // community, reviews 카테고리일 때만 정렬 및 번호 부여
      if (shouldShowNumbers) {
        // createdDateTime 기준 최신순 정렬
        const sorted = [...filtered].sort((a, b) => {
          const dateA = toDate(a.createdDateTime)?.getTime() ?? 0;
          const dateB = toDate(b.createdDateTime)?.getTime() ?? 0;
          return dateB - dateA; // 내림차순 (최신순)
        });

        // 화면용 번호 부여 (1부터 시작)
        const withDisplayNumber = sorted.map((item, index) => ({
          ...item,
          displayNumber: index + 1,
        }));

        setPosts(withDisplayNumber);
      } else {
        // showcase, playlists, spotlight는 번호 없이 그대로
        setPosts(filtered);
      }
    } catch {
      ToastUtils.error('게시글을 불러올 수 없습니다');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryType, search, searchType, shouldShowNumbers]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onSearch = () => fetchList();

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
    <section className={styles.section}>
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
          글작성
        </button>
      </div>

      {loading && posts.length === 0 ? (
        <div className={styles.loading}>로딩 중…</div>
      ) : viewMode === 'grid' ? (
        <div className={styles.grid}>
          {posts.map((p) => {
            const safeCat = category as BoardCategorySlug;
            const thumbnailUrl = getBoardThumbnailUrl(p, safeCat);
            const isShowcase = category === 'showcase';
            const videoId = isShowcase ? getShowcaseVideoId(p) : '';

            const handleCardClick = () => {
              router.push(`/boards/${p.boardId}`);
            };

            return (
              <div
                key={p.boardId}
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
              {posts.map((p) => (
                <tr
                  key={p.boardId}
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