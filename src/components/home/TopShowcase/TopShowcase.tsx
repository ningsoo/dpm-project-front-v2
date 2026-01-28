'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory, BoardListItem } from '@/api/boardApi';
import styles from './TopShowcase.module.css';

interface ShowcasePost extends BoardListItem {
  id?: string; // UI에서 사용
}

export default function TopShowcase() {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<ShowcasePost[]>([]);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);

  useEffect(() => {
    boardApi
      .getBoardByCategory('SHOWCASE')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setPosts(list.slice(0, 8).map((p, i) => ({ ...p, id: String(i) })));
      })
      .catch(() => setPosts([]));
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <h2 className={styles.title}>TOP Showcase</h2>
      <div className={styles.grid}>
        {posts.map((p) => {
          const ytId = extractYoutubeId(p.fileUrl);
          const isHovered = hoveredPostId === p.id;
          const showVideo = isHovered && ytId;

          const handleCardClick = () => {
            router.push(`/boards/showcase/${p.id}`);
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
                    src={p.fileUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '/placeholder-playlist.png')}
                    alt=""
                    className={styles.thumb}
                  />
                )}
              </div>
              <div className={styles.body}>
                <div className={styles.author}>{p.authorNickname || '—'}</div>
                <div className={styles.cardTitle}>{p.title}</div>
                <div className={styles.likes}>♥ {p.likeCount ?? 0}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function extractYoutubeId(url?: string): string {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? m[1] : '';
}
