'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import {
  extractBoardListFromResponse,
  getBoardThumbnailUrl,
} from '@/utils/boardThumbnailUtils';
import { BoardCard } from '@/components/board/BoardCard';
import styles from './TopPlaylists.module.css';

const PLACEHOLDER_COUNT = 8;

export default function TopPlaylists() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<BoardListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    boardApi
      .getHotMainBoard('PLAYLISTS')
      .then(({ data }) => {
        const list = extractBoardListFromResponse(data);
        setPosts(list.slice(0, 8));
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
        <h2 className={styles.title}>TOP Playlists</h2>
        <div className={styles.grid}>
          {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
            <div key={i} className={styles.placeholderCell} aria-hidden>
              <div className={styles.placeholderThumb} />
              <div className={styles.placeholderBody} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <h2 className={styles.title}>TOP Playlists</h2>
      <div className={styles.grid}>
        {posts.map((p) => (
          <BoardCard
            key={p.boardId}
            thumbnail={
              <img
                src={getBoardThumbnailUrl(p, 'playlists')}
                alt=""
                className={styles.thumb}
              />
            }
            title={p.title}
            nickname={p.nickname}
            deleted={p.deleted}
            profileUrl={p.profileUrl}
            profileImage={p.profileImage}
            likeCount={p.likes}
            viewCount={p.views}
            href={`/boards/${p.boardId}`}
          />
        ))}
      </div>
    </section>
  );
}
