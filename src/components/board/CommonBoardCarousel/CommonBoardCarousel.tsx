'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import {
  extractBoardListFromResponse,
  getBoardThumbnailUrl,
} from '@/utils/boardThumbnailUtils';
import type { BoardCategorySlug } from '@/utils/boardThumbnailUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [center, setCenter] = useState(0);
  const [hoveredCenter, setHoveredCenter] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const CARD_GAP = 20;

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await boardApi.getBoardByCategory(category);
      const list = extractBoardListFromResponse(data);
      setPosts(list);
    } catch {
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    setIsLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  /* 자동 슬라이드 */
  useEffect(() => {
    if (posts.length === 0) return;
    const t = setInterval(() => {
      setCenter((c) => (c + 1) % Math.min(posts.length, 10));
    }, 4000);
    return () => clearInterval(t);
  }, [posts.length]);

  /* 카드 너비 계산 */
  const [cardWidths, setCardWidths] = useState({ base: 300 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const calculateCardWidths = () => {
      const containerWidth = el.clientWidth;
      if (containerWidth <= 0) return;
      const baseWidth = Math.floor((containerWidth - CARD_GAP * 2) / 3);
      setCardWidths({ base: Math.max(200, baseWidth) });
    };

    calculateCardWidths();
    const observer = new ResizeObserver(calculateCardWidths);
    observer.observe(el);
    window.addEventListener('resize', calculateCardWidths);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateCardWidths);
    };
  }, [posts.length]);

  const movePrev = () => {
    const len = Math.min(posts.length, 10);
    if (len === 0) return;
    setCenter((c) => (c - 1 + len) % len);
  };

  const moveNext = () => {
    const len = Math.min(posts.length, 10);
    if (len === 0) return;
    setCenter((c) => (c + 1) % len);
  };

  const goToPost = (postId: number) => {
    router.push(`/boards/${postId}`);
  };

  const displayPosts = posts.slice(0, 10);

  const getDisplayIndex = (offset: number) => {
    const len = displayPosts.length;
    if (len === 0) return 0;
    return (center + offset + len) % len;
  };

  if (isLoading) {
    return (
      <section className={`${styles.section} ${styles.sectionPlaceholder} ${darkMode ? 'dark' : ''}`}>
        <div className={styles.wrapper}>
          <div className={styles.track}>
            {Array.from({ length: VISIBLE }).map((_, i) => (
              <div key={`skeleton-${i}`} className={styles.skeletonCard} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section className={`${styles.section} ${styles.sectionPlaceholder} ${darkMode ? 'dark' : ''}`}>
        <div className={styles.wrapper}>
          <div className={styles.track}>
            <div className={styles.emptyState}>등록된 게시글이 없습니다.</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <div className={styles.wrapper} ref={wrapperRef}>

        <button className={styles.prevBtn} onClick={movePrev}>
          <ChevronLeft size={48} />
        </button>

        <button className={styles.nextBtn} onClick={moveNext}>
          <ChevronRight size={48} />
        </button>

        <div className={styles.track}>
          {Array.from({ length: VISIBLE }).map((_, i) => {
            const displayIndex = getDisplayIndex(i - CENTER_INDEX);
            const post = displayPosts[displayIndex];
            if (!post) return null;

            const isCenter = i === CENTER_INDEX;
            const cardWidth = cardWidths.base;

            const leftCardPosition = 0;
            const centerCardPosition = cardWidth + CARD_GAP;
            const rightCardPosition = (cardWidth + CARD_GAP) * 2;

            let cardLeft = 0;
            if (i === 0) cardLeft = leftCardPosition;
            else if (i === CENTER_INDEX) cardLeft = centerCardPosition;
            else cardLeft = rightCardPosition;

            const categorySlug = String(category).toLowerCase() as BoardCategorySlug;
            const imageUrl = getBoardThumbnailUrl(post, categorySlug);

            return (
              <div
                key={`${post.boardId}-${displayIndex}-${i}`}
                className={`${styles.card} ${isCenter ? styles.center : ''} ${
                  hoveredCenter && isCenter ? styles.expanded : ''
                }`}
                style={{
                  width: `${cardWidth}px`,
                  left: `${cardLeft}px`,
                  position: 'absolute',
                  zIndex: isCenter ? 10 : 1,
                }}
                onMouseEnter={() => isCenter && setHoveredCenter(true)}
                onMouseLeave={() => isCenter && setHoveredCenter(false)}
                onClick={() => goToPost(post.boardId)}
              >
                <div
                  className={styles.thumb}
                  style={{ backgroundImage: `url(${imageUrl})` }}
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
