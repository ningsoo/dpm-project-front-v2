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

export default function TopPlaylists() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<BoardListItem[]>([]);

  useEffect(() => {
    boardApi
      .getHotMainBoard('PLAYLISTS')
      .then(({ data }) => {
        const list = extractBoardListFromResponse(data);
        setPosts(list.slice(0, 8));
      })
      .catch(() => setPosts([]));
  }, []);

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
