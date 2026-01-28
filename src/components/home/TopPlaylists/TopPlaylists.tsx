'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import styles from './TopPlaylists.module.css';

interface PlaylistPost extends BoardListItem {
  id?: string; // UI에서 사용
}

export default function TopPlaylists() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<PlaylistPost[]>([]);

  useEffect(() => {
    boardApi
      .getBoardByCategory('PLAYLISTS')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setPosts(list.slice(0, 8).map((p, i) => ({ ...p, id: String(i) })));
      })
      .catch(() => setPosts([]));
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <h2 className={styles.title}>TOP Playlists</h2>
      <div className={styles.grid}>
        {posts.map((p) => (
          <Link key={p.id} href={`/boards/playlists/${p.id}`} className={styles.card}>
            <div className={styles.thumbWrap}>
              <img src={p.fileUrl || '/placeholder-playlist.png'} alt="" className={styles.thumb} />
            </div>
            <div className={styles.body}>
              <div className={styles.author}>{p.nickname || '—'}</div>
              <div className={styles.cardTitle}>{p.title}</div>
              <div className={styles.likes}>♥ {p.likes ?? 0}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
