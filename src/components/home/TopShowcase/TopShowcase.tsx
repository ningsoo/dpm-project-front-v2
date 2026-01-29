'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import styles from './TopShowcase.module.css';

export default function TopShowcase() {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<BoardListItem[]>([]);
  const [hoveredBoardId, setHoveredBoardId] = useState<number | null>(null);

  useEffect(() => {
    boardApi
      .getBoardByCategory('SHOWCASE')
      .then(({ data }) => {
        const list = Array.isArray(data?.data) ? data.data : [];
        setPosts(list.slice(0, 8));
      })
      .catch(() => setPosts([]));
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <h2 className={styles.title}>TOP Showcase</h2>
      <div className={styles.grid}>
        {posts.map((p) => {
          const ytId = extractYoutubeId(p.fileUrl ?? undefined);
          const isHovered = hoveredBoardId === p.boardId;
          const showVideo = isHovered && ytId;

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
                    src={p.fileUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '/placeholder-playlist.png')}
                    alt=""
                    className={styles.thumb}
                  />
                )}
              </div>
              <div className={styles.body}>
                <div className={styles.cardTitle}>{p.title}</div>
                <div className={styles.author}>{p.nickname || '—'}</div>
                <div className={styles.likes}>♥ {p.likes ?? 0}</div>
                <div className={styles.likes}>♥ {p.views ?? 0}</div>
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
