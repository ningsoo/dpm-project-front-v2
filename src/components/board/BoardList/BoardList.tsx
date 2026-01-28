'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import { ToastUtils } from '@/utils/toastUtils';
import ShowcaseFeaturedSection from '@/components/board/ShowcaseFeaturedSection';
import CommonBoardCarousel from '@/components/board/CommonBoardCarousel';
import styles from './BoardList.module.css';

type Post = BoardListItem & {
  id?: string; // 응답에는 없지만 UI에서 사용
  number?: number; // UI에서 사용
};

interface BoardListProps {
  category: string;
  viewMode: 'grid' | 'list';
}

const GRID_CATS = ['showcase', 'playlists', 'spotlight'];

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState<'title' | 'nickname'>('title');
  const [search, setSearch] = useState('');
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);

  const categoryType = toBoardCategory(category);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      // Swagger 명세: GET /api/boards/{categoryType} - 배열 반환
      const { data } = await boardApi.getBoardByCategory(categoryType);
      const list = Array.isArray(data) ? data : [];
      
      // 검색 필터링 (프론트엔드에서 처리, 백엔드에 search 파라미터가 없음)
      let filtered = list;
      if (search) {
        const kw = search.toLowerCase();
        filtered = list.filter((p) => {
          if (searchType === 'title') {
            return p.title.toLowerCase().includes(kw);
          } else {
            return p.nickname.toLowerCase().includes(kw);
          }
        });
      }
      
      setPosts(filtered.map((p, i) => ({ ...p, id: String(i), number: list.length - i })));
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
          <CommonBoardCarousel category={category as BoardCategory} />
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
        <Link href={`/boards/${safeCat}/new`} className={styles.writeBtn}>
          글작성
        </Link>
      </div>


      {loading && posts.length === 0 ? (
        <div className={styles.loading}>로딩 중…</div>
      ) : viewMode === 'grid' ? (
        <div className={styles.grid}>
          {posts.map((p, i) => {
            const ytId = extractYtId(p.fileUrl);
            const isHovered = hoveredPostId === p.id;
            const isShowcase = category === 'showcase';
            const showVideo = isShowcase && isHovered && ytId;

            const handleCardClick = () => {
              router.push(`/boards/${safeCat}/${p.id || ''}`);
            };

            return (
              <div
                key={p.id}
                className={styles.card}
                onMouseEnter={() => setHoveredPostId(p.id || null)}
                onMouseLeave={() => setHoveredPostId(null)}
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
                      {/* 클릭 가능한 투명 레이어 */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          zIndex: 1,
                          cursor: 'pointer',
                        }}
                        onClick={handleCardClick}
                      />
                    </>
                  ) : (
                    <img
                      src={
                        p.fileUrl ||
                        (ytId
                          ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
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
                    {p.nickname || '—'} · ♥{p.likes ?? 0}
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
                <th>번호</th>
                <th>제목</th>
                <th>작성자</th>
                <th>좋아요</th>
                <th>조회</th>
                <th>날짜</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.number ?? p.id}</td>
                  <td>
                    <Link href={`/boards/${safeCat}/${p.id || ''}`}>{p.title}</Link>
                  </td>
                  <td>{p.nickname || '—'}</td>
                  <td>{p.likes ?? 0}</td>
                  <td>{p.views ?? 0}</td>
                  <td>{formatDate(p.createdDateTime)}</td>
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

function formatDate(s?: string): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return s;
  }
}
