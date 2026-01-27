'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import ShowcaseFeaturedSection from '@/components/board/ShowcaseFeaturedSection';
import CommonBoardCarousel from '@/components/board/CommonBoardCarousel';
import styles from './BoardList.module.css';

interface Post {
  id: string;
  title: string;
  authorNickname?: string;
  likeCount?: number;
  viewCount?: number;
  createdAt?: string;
  thumbnail?: string;
  youtubeUrl?: string;
  number?: number;
}

interface BoardListProps {
  category: string;
  viewMode: 'grid' | 'list';
}

const GRID_CATS = ['showcase', 'playlists', 'spotlight'];

export default function BoardList({ category, viewMode }: BoardListProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState<'title' | 'nickname'>('title');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);

  const fetchList = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    setLoading(true);
    try {
      const { data } = await boardApi.getBoardByCategory(category as BoardCategory, {
        page: p,
        search: search || undefined,
      });
      const d = data?.data as { posts?: Post[]; total?: number };
      const list = Array.isArray(d?.posts) ? d.posts : [];
      setPosts((prev) => (reset ? list : [...prev, ...list]));
      setHasMore(list.length >= 20);
      if (reset) setPage(2);
      else setPage((x) => x + 1);
    } catch {
      ToastUtils.error('게시글을 불러올 수 없습니다');
      setPosts((prev) => (reset ? [] : prev));
    } finally {
      setLoading(false);
    }
  }, [category, page, search]);

  useEffect(() => {
    fetchList(true);
  }, [category, search]);

  const onSearch = () => fetchList(true);

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
            const ytId = extractYtId(p.youtubeUrl);
            const isHovered = hoveredPostId === p.id;
            const isShowcase = category === 'showcase';
            const showVideo = isShowcase && isHovered && ytId;

            const handleCardClick = () => {
              router.push(`/boards/${safeCat}/${p.id}`);
            };

            return (
              <div
                key={p.id}
                className={styles.card}
                onMouseEnter={() => setHoveredPostId(p.id)}
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
                        p.thumbnail ||
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
                    {p.authorNickname || '—'} · ♥{p.likeCount ?? 0}
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
                    <Link href={`/boards/${safeCat}/${p.id}`}>{p.title}</Link>
                  </td>
                  <td>{p.authorNickname || '—'}</td>
                  <td>{p.likeCount ?? 0}</td>
                  <td>{p.viewCount ?? 0}</td>
                  <td>{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className={styles.empty}>등록된 게시글이 없습니다.</div>
      )}

      {viewMode === 'list' && hasMore && posts.length > 0 && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <button
            type="button"
            className={styles.searchBtn}
            onClick={() => fetchList(false)}
            disabled={loading}
          >
            {loading ? '로딩…' : '더 보기'}
          </button>
        </div>
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
