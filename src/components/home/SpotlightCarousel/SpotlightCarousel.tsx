'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import styles from './SpotlightCarousel.module.css';

const CARD_WIDTH = 200;
const VISIBLE = 5;
const CENTER_INDEX = Math.floor(VISIBLE / 2);

interface SpotlightPost {
  id: string;
  title: string;
  description?: string;
  image?: string;
  category: string;
}

export default function SpotlightCarousel() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<SpotlightPost[]>([]);
  const [center, setCenter] = useState(CENTER_INDEX);

  const fetchSpotlights = useCallback(async () => {
    try {
      const { data } = await boardApi.getBoards();
      const list = (data?.data as { spotlights?: SpotlightPost[] })?.spotlights ?? [];
      setPosts(Array.isArray(list) ? list : []);
    } catch {
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    fetchSpotlights();
  }, [fetchSpotlights]);

  // Auto-slide: every 4s move right
  useEffect(() => {
    if (posts.length <= 1) return;
    const t = setInterval(() => {
      setCenter((c) => (c + 1) % posts.length);
    }, 4000);
    return () => clearInterval(t);
  }, [posts.length]);

  const onCardClick = (index: number) => {
    if (index === center && posts[index]) {
      const p = posts[index];
      window.location.href = `/boards/${(p.category as BoardCategory) || 'spotlight'}/${p.id}`;
    } else {
      setCenter(index);
    }
  };

  if (posts.length === 0) return null;

  const offset = -center * CARD_WIDTH + (typeof document !== 'undefined' ? (document.documentElement.clientWidth || 1200) / 2 - CARD_WIDTH / 2 : 0);

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <h2 className={styles.title}>Spotlight</h2>
      <div className={styles.wrapper}>
        <div
          className={styles.track}
          style={{ transform: `translateX(calc(50% - ${CARD_WIDTH / 2}px + ${offset}px))` }}
        >
          {posts.slice(0, 10).map((p, i) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={`${styles.card} ${i === center ? styles.center : ''}`}
              onClick={() => onCardClick(i)}
              onKeyDown={(e) => (e.key === 'Enter' ? onCardClick(i) : null)}
            >
              <div
                className={styles.thumb}
                style={p.image ? { backgroundImage: `url(${p.image})`, backgroundSize: 'cover' } : {}}
              />
              <div className={styles.cardTitle}>{p.title}</div>
              <div className={styles.desc}>{p.description || ''}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
