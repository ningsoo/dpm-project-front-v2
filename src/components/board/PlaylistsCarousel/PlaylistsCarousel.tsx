'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import styles from './PlaylistsCarousel.module.css';

const VISIBLE = 3;
const CENTER_INDEX = Math.floor(VISIBLE / 2);

interface PlaylistPost {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  category: string;
}

export default function PlaylistsCarousel() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<PlaylistPost[]>([]);
  const [center, setCenter] = useState(0);

  const fetchPlaylists = useCallback(async () => {
    try {
      const { data } = await boardApi.getBoardByCategory('playlists' as BoardCategory, {});
      const d = data?.data as { posts?: PlaylistPost[] };
      const list = Array.isArray(d?.posts) ? d.posts : [];
      setPosts(list);
    } catch {
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // Auto-slide: every 4s move right (무한 루프)
  useEffect(() => {
    if (posts.length === 0) return;
    const t = setInterval(() => {
      setCenter((c) => (c + 1) % 10);
    }, 4000);
    return () => clearInterval(t);
  }, [posts.length]);

  // 화면 너비 기반 카드 크기 계산 (3장, 모든 카드 동일 크기)
  const [cardWidths, setCardWidths] = useState({ base: 300 });
  const [hoveredCenter, setHoveredCenter] = useState(false);
  const CARD_GAP = 20; // 카드 간 마진

  useEffect(() => {
    const calculateCardWidths = () => {
      const screenWidth = window.innerWidth;
      const leftPadding = 24; // 좌측만 24px
      const availableWidth = screenWidth - leftPadding;
      
      // 3장 카드가 한 번에 들어가도록 계산 (우측 여백 없음)
      const baseWidth = Math.floor((availableWidth - CARD_GAP * 2) / 3);
      setCardWidths({ base: baseWidth });
    };

    calculateCardWidths();
    window.addEventListener('resize', calculateCardWidths);
    return () => window.removeEventListener('resize', calculateCardWidths);
  }, []);

  const onCardClick = (index: number) => {
    const displayIndex = (center + index - CENTER_INDEX + 10) % 10;
    if (index === CENTER_INDEX) {
      // 가운데 카드 클릭 시 게시글 페이지로 이동
      const p = posts[displayIndex];
      if (p) {
        window.location.href = `/boards/playlists/${p.id}`;
      }
    } else {
      // 좌우 카드 클릭 시 가운데로 이동
      setCenter((c) => (c + (index - CENTER_INDEX) + 10) % 10);
    }
  };

  // 각 카드의 z-index 계산
  const getCardZIndex = (index: number) => {
    if (index === CENTER_INDEX) return 10; // 가운데 카드가 가장 위
    return 1; // 나머지 카드들
  };

  // 현재 보여질 카드 인덱스 계산 (무한 루프)
  const getDisplayIndex = (offset: number) => {
    return (center + offset + 10) % 10;
  };

  // 10개의 카드만 사용
  const displayPosts = posts.slice(0, 10);
  
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
            const expandedWidth = cardWidths.base * 1.5; // 호버 시 1.5배 확장
            const expansionOffset = hoveredCenter && isCenter 
              ? (expandedWidth - cardWidth) / 2  // 좌우로 균등하게 확장하기 위한 오프셋
              : 0;

            // 좌우 카드의 절대 위치 계산
            const leftCardPosition = 0;
            const centerCardPosition = cardWidth + CARD_GAP;
            const rightCardPosition = (cardWidth + CARD_GAP) * 2;

            let cardLeft = 0;
            if (i === 0) {
              cardLeft = leftCardPosition;
            } else if (i === CENTER_INDEX) {
              cardLeft = centerCardPosition - expansionOffset;
            } else {
              cardLeft = rightCardPosition;
            }

            return (
              <div
                key={`${post.id}-${i}-${center}`}
                role="button"
                tabIndex={0}
                className={`${styles.card} ${isCenter ? styles.center : ''} ${hoveredCenter && isCenter ? styles.expanded : ''}`}
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
                  style={post.thumbnail ? { backgroundImage: `url(${post.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  <div className={styles.overlay}>
                    <div className={styles.cardTitle}>{post.title}</div>
                    <div className={styles.desc}>{post.description || ''}</div>
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
