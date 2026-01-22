'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import styles from './SpotlightCarousel.module.css';

const VISIBLE = 3;
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
  const [center, setCenter] = useState(0);

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

  // Auto-slide: every 4s move right (무한 루프)
  useEffect(() => {
    if (posts.length === 0) return;
    const t = setInterval(() => {
      setIsTransitioning(true);
      // 슬라이드 애니메이션 시작 (약간의 지연 후 카드 변경)
      setTimeout(() => {
        setCenter((c) => (c + 1) % 10);
        // 애니메이션 완료 후 transition 상태 해제
        setTimeout(() => {
          setIsTransitioning(false);
        }, 600);
      }, 10);
    }, 4000);
    return () => clearInterval(t);
  }, [posts.length]);

  // 화면 너비 기반 카드 크기 계산 (3장, 모든 카드 동일 크기)
  const [cardWidths, setCardWidths] = useState({ base: 300 });
  const [hoveredCenter, setHoveredCenter] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const CARD_GAP = 20; // 카드 간 마진

  useEffect(() => {
    const calculateCardWidths = () => {
      const screenWidth = window.innerWidth;
      const leftPadding = 24; // 좌측만 24px
      const availableWidth = screenWidth - leftPadding;
      
      // 3장 카드가 한 번에 들어가도록 계산 (우측 여백 없음)
      // 전체 너비 = 카드 너비 * 3 + 마진 * 2
      // availableWidth = base * 3 + CARD_GAP * 2
      // base = (availableWidth - CARD_GAP * 2) / 3
      
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
        window.location.href = `/boards/${(p.category as BoardCategory) || 'spotlight'}/${p.id}`;
      }
    } else {
      // 좌우 카드 클릭 시 가운데로 이동
      setIsTransitioning(true);
      setTimeout(() => {
        setCenter((c) => (c + (index - CENTER_INDEX) + 10) % 10);
        setTimeout(() => setIsTransitioning(false), 600);
      }, 100);
    }
  };

  // 각 카드의 마진 계산 (겹치지 않게 양수 마진)
  const getCardMargin = (index: number) => {
    if (index === 0) return 0; // 1카드(좌측): 마진 없음
    return CARD_GAP; // 나머지 카드들: 양수 마진
  };

  // 각 카드의 z-index 계산
  // 2카드(가운데)가 가장 위, 그 다음 1카드와 3카드
  const getCardZIndex = (index: number) => {
    if (index === CENTER_INDEX) return 10; // 2카드(가운데)가 가장 위
    return 1; // 1카드와 3카드
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

            // 슬라이드 애니메이션을 위한 transform 계산
            // 모든 카드가 왼쪽으로 이동하고, 새 카드가 우측에서 들어옴
            let slideOffset = 0;
            
            if (isTransitioning) {
              if (i === 0) {
                // 좌측 카드: 왼쪽으로 슬라이드하며 사라짐
                slideOffset = -(cardWidth + CARD_GAP);
              } else if (i === 1) {
                // 가운데 카드: 왼쪽으로 이동하여 좌측 카드 위치로
                slideOffset = -(cardWidth + CARD_GAP);
              } else if (i === 2) {
                // 우측 카드: 왼쪽으로 이동하여 가운데 카드 위치로
                slideOffset = -(cardWidth + CARD_GAP);
              }
            }

            return (
              <div
                key={`card-${i}`}
                role="button"
                tabIndex={0}
                className={`${styles.card} ${isCenter ? styles.center : ''} ${hoveredCenter && isCenter ? styles.expanded : ''} ${isTransitioning ? styles.sliding : ''}`}
                style={{
                  width: hoveredCenter && isCenter ? `${expandedWidth}px` : `${cardWidth}px`,
                  left: `${cardLeft}px`,
                  position: 'absolute',
                  zIndex: getCardZIndex(i),
                  transform: `translateX(${slideOffset}px)`,
                  opacity: isTransitioning && i === 0 ? 0 : 1,
                }}
                onMouseEnter={() => isCenter && setHoveredCenter(true)}
                onMouseLeave={() => isCenter && setHoveredCenter(false)}
                onClick={() => onCardClick(i)}
                onKeyDown={(e) => (e.key === 'Enter' ? onCardClick(i) : null)}
              >
                <div
                  className={styles.thumb}
                  style={post.image ? { backgroundImage: `url(${post.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  key={`content-${post.id}-${center}`}
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
