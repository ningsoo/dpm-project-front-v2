'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import styles from './CommonBoardCarousel.module.css';

const VISIBLE = 3;
const CENTER_INDEX = Math.floor(VISIBLE / 2);

interface CommonBoardCarouselProps {
  category: BoardCategory;
}

export default function CommonBoardCarousel({ category }: CommonBoardCarouselProps) {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<BoardListItem[]>([]);
  const [center, setCenter] = useState(0);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await boardApi.getBoardByCategory(category);
      const list = Array.isArray(data?.data) ? data.data : [];
      setPosts(list);
    } catch {
      setPosts([]);
    }
  }, [category]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (posts.length === 0) return;
    const t = setInterval(() => {
      setCenter((c) => (c + 1) % Math.min(posts.length, 10));
    }, 4000);
    return () => clearInterval(t);
  }, [posts.length]);

  const [cardWidths, setCardWidths] = useState({ base: 300 });
  const [hoveredCenter, setHoveredCenter] = useState(false);
  const CARD_GAP = 20;

  useEffect(() => {
    const calculateCardWidths = () => {
      const screenWidth = window.innerWidth;
      const leftPadding = 24;
      const availableWidth = screenWidth - leftPadding;
      const baseWidth = Math.floor((availableWidth - CARD_GAP * 2) / 3);
      setCardWidths({ base: baseWidth });
    };

    calculateCardWidths();
    window.addEventListener('resize', calculateCardWidths);
    return () => window.removeEventListener('resize', calculateCardWidths);
  }, []);

  const onCardClick = (index: number) => {
    const len = Math.min(posts.length, 10);
    if (len === 0) return;
    const displayIndex = (center + index - CENTER_INDEX + len) % len;
    if (index === CENTER_INDEX) {
      window.location.href = `/boards/category/${String(category).toLowerCase()}`;
    } else {
      setCenter((c) => {
        const next = c + (index - CENTER_INDEX);
        return (next + len) % len;
      });
    }
  };

  const getCardZIndex = (index: number) => {
    if (index === CENTER_INDEX) return 10;
    return 1;
  };

  const displayPosts = posts.slice(0, 10);

  const getDisplayIndex = (offset: number) => {
    const len = displayPosts.length;
    if (len === 0) return 0;
    return (center + offset + len) % len;
  };

  if (posts.length === 0 || displayPosts.length === 0) return null;

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <div className={styles.wrapper}>
        <div className={styles.track}>
          {Array.from({ length: VISIBLE }).map((_, i) => {
            const displayIndex = getDisplayIndex(i - CENTER_INDEX);
            const post = displayPosts[displayIndex];
            if (!post) return null;

            const isCenter = i === CENTER_INDEX;
            const cardWidth = cardWidths.base;
            const expandedWidth = cardWidths.base * 1.5;
            const expansionOffset =
              hoveredCenter && isCenter ? (expandedWidth - cardWidth) / 2 : 0;

            const leftCardPosition = 0;
            const centerCardPosition = cardWidth + CARD_GAP;
            const rightCardPosition = (cardWidth + CARD_GAP) * 2;

            let cardLeft = 0;
            if (i === 0) cardLeft = leftCardPosition;
            else if (i === CENTER_INDEX) cardLeft = centerCardPosition - expansionOffset;
            else cardLeft = rightCardPosition;

            const imageUrl = post.fileUrl;

            return (
              <div
                key={`${post.boardId}-${displayIndex}-${i}`}
                role="button"
                tabIndex={0}
                className={`${styles.card} ${isCenter ? styles.center : ''} ${
                  hoveredCenter && isCenter ? styles.expanded : ''
                }`}
                style={{
                  width: hoveredCenter && isCenter ? `${expandedWidth}px` : `${cardWidth}px`,
                  left: `${cardLeft}px`,
                  position: 'absolute',
                  zIndex: getCardZIndex(i),
                }}
                onMouseEnter={() => isCenter && setHoveredCenter(true)}
                onMouseLeave={() => isCenter && setHoveredCenter(false)}
                onClick={() => onCardClick(i)}
                onKeyDown={(e) => (e.key === 'Enter' ? onCardClick(i) : null)}
              >
                <div
                  className={styles.thumb}
                  style={
                    imageUrl
                      ? {
                          backgroundImage: `url(${imageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {}
                  }
                >
                  <div className={styles.overlay}>
                    <div className={styles.cardTitle}>{post.title}</div>
                    <div className={styles.desc}>{post.content || ''}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
