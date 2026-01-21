'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import styles from './TopPlaylists.module.css';

interface PlaylistPost {
  id: string;
  title: string;
  authorNickname?: string;
  likeCount?: number;
  thumbnail?: string;
}

export default function TopPlaylists() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<PlaylistPost[]>([]);

  useEffect(() => {
    boardApi
      .getBoardByCategory('playlists' as BoardCategory, {})
      .then(({ data }) => {
        const d = data?.data as { posts?: PlaylistPost[] };
        setPosts(Array.isArray(d?.posts) ? d.posts.slice(0, 8) : []);
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
              <img src={p.thumbnail || '/placeholder-playlist.png'} alt="" className={styles.thumb} />
            </div>
            <div className={styles.body}>
              <div className={styles.author}>{p.authorNickname || '—'}</div>
              <div className={styles.cardTitle}>{p.title}</div>
              <div className={styles.likes}>♥ {p.likeCount ?? 0}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
