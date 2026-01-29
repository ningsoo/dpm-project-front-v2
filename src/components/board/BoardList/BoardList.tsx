'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import { ToastUtils } from '@/utils/toastUtils';
import { formatCreatedDateTime } from '@/utils/createdDateTime';
import ShowcaseFeaturedSection from '@/components/board/ShowcaseFeaturedSection';
import CommonBoardCarousel from '@/components/board/CommonBoardCarousel';
import styles from './BoardList.module.css';

interface BoardListProps {
  category: string;
  viewMode: 'grid' | 'list';
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
  const [posts, setPosts] = useState<BoardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState<'title' | 'nickname'>('title');
  const [search, setSearch] = useState('');
  const [hoveredBoardId, setHoveredBoardId] = useState<number | null>(null);

  const categoryType = toBoardCategory(category);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      // Swagger 명세: GET /api/boards/{categoryType} - 배열 반환
      const { data } = await boardApi.getBoardByCategory(categoryType);
      const list = Array.isArray(data?.data) ? data.data : [];
      

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

      setPosts(filtered);
    } catch {
      ToastUtils.error('게시글을 불러올 수 없습니다');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryType, search, searchType]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onSearch = () => fetchList();

  const safeCat = ['showcase', 'playlists', 'spotlight', 'community', 'reviews'].includes(category)
    ? category
    : 'showcase';

  
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
        <Link href={`/boards/category/${safeCat}/new`} className={styles.writeBtn}>
          글작성
        </Link>
      </div>


      {loading && posts.length === 0 ? (
        <div className={styles.loading}>로딩 중…</div>
      ) : viewMode === 'grid' ? (
        <div className={styles.grid}>
          {posts.map((p) => {
            const ytId = extractYtId(p.fileUrl ?? undefined);
            const isHovered = hoveredBoardId === p.boardId;
            const isShowcase = category === 'showcase';
            const showVideo = isShowcase && isHovered && ytId;

            const handleCardClick = () => {
              router.push(`/boards/${p.boardId}`);
            };

            return (
              <div
                key={p.boardId}
                className={styles.card}
                onMouseEnter={() => setHoveredBoardId(p.boardId)}
                onMouseLeave={() => setHoveredBoardId(null)}
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
                  {showVideo ? (
                    <>
                      <iframe
                        className={styles.thumb}
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&modestbranding=1&rel=0`}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          pointerEvents: 'none',
                        }}
                      />
                    </>
                  ) : (
                    <img
                      src={
                        p.fileUrl ||
                        (ytId
                          ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                          : '/placeholder-playlist.png')
                      }
                      alt=""
                      className={styles.thumb}
                    />
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>{p.title}</div>
                  <div className={styles.meta}>
                    {p.nickname || '—'} · ♥{p.likes ?? 0} · views {p.views ?? 0}
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
                <th>제목</th>
                <th>작성자</th>
                <th>좋아요</th>
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
                  <td>
                    <Link href={`/boards/${p.boardId}`}>{p.title}</Link>
                  </td>
                  <td>{p.nickname || '—'}</td>
                  <td>{p.likes ?? 0}</td>
                  <td>{p.views ?? 0}</td>
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

    </section>
  );
}

function extractYtId(url?: string): string {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? m[1] : '';
}

// 날짜 포맷은 formatCreatedDateTime 사용
