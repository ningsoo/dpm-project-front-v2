'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import {
  extractBoardListFromResponse,
  getBoardThumbnailUrl,
} from '@/utils/boardThumbnailUtils';
import { formatViews } from '@/utils/displayFormatters';
import styles from './TopPlaylists.module.css';

export default function TopPlaylists() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<BoardListItem[]>([]);

  useEffect(() => {
    boardApi
      .getBoardByCategory('PLAYLISTS')
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
          <Link key={p.boardId} href={`/boards/${p.boardId}`} className={styles.card}>
            <div className={styles.thumbWrap}>
              <img src={getBoardThumbnailUrl(p, 'playlists')} alt="" className={styles.thumb} />
            </div>
            <div className={styles.body}>
              <div className={styles.cardTitle}>{p.title}</div>
              <div className={styles.author}>{p.nickname || '—'}</div>
              <div className={styles.likes}>♥ {p.likes ?? 0}</div>
              <div className={styles.likes}>♥ {formatViews(p.views)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
