'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import {
  extractBoardListFromResponse,
  getBoardThumbnailUrl,
  getShowcaseVideoId,
} from '@/utils/boardThumbnailUtils';
import YouTubeHoverThumbnail from '@/components/board/YouTubeHoverThumbnail';
import { formatViews } from '@/utils/displayFormatters';
import styles from './TopShowcase.module.css';

export default function TopShowcase() {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<BoardListItem[]>([]);

  useEffect(() => {
    boardApi
      .getBoardByCategory('SHOWCASE')
      .then(({ data }) => {
        const list = extractBoardListFromResponse(data);
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
          const thumbnailUrl = getBoardThumbnailUrl(p, 'showcase');
          const videoId = getShowcaseVideoId(p);

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
                {videoId ? (
                  <YouTubeHoverThumbnail
                    thumbnailUrl={thumbnailUrl}
                    videoId={videoId}
                    alt={p.title}
                  />
                ) : (
                  <img src={thumbnailUrl} alt="" className={styles.thumb} />
                )}
              </div>
              <div className={styles.body}>
                <div className={styles.cardTitle}>{p.title}</div>
                <div className={styles.author}>{p.nickname || '—'}</div>
                <div className={styles.likes}>♥ {p.likes ?? 0}</div>
                <div className={styles.likes}>♥ {formatViews(p.views)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
