'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import styles from './TopShowcase.module.css';

interface ShowcasePost {
  id: string;
  title: string;
  authorNickname?: string;
  likeCount?: number;
  thumbnail?: string;
  youtubeUrl?: string;
}

export default function TopShowcase() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<ShowcasePost[]>([]);

  useEffect(() => {
    boardApi
      .getBoardByCategory('showcase' as BoardCategory, {})
      .then(({ data }) => {
        const d = data?.data as { posts?: ShowcasePost[] };
        setPosts(Array.isArray(d?.posts) ? d.posts.slice(0, 8) : []);
      })
      .catch(() => setPosts([]));
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <h2 className={styles.title}>TOP Showcase</h2>
      <div className={styles.grid}>
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/boards/showcase/${p.id}`}
            className={styles.card}
          >
            <div className={styles.thumbWrap}>
              <img
                src={p.thumbnail || `https://img.youtube.com/vi/${extractYoutubeId(p.youtubeUrl)}/mqdefault.jpg`}
                alt=""
                className={styles.thumb}
              />
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

function extractYoutubeId(url?: string): string {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? m[1] : '';
}
