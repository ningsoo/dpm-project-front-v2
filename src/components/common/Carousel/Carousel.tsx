'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import styles from './Carousel.module.css';

const VISIBLE = 7;
const CENTER_INDEX = Math.floor(VISIBLE / 2);

interface CarouselPost {
  id: string;
  title: string;
  description?: string;
  image?: string;
  thumbnail?: string;
  youtubeUrl?: string;
  category?: string;
}

interface CarouselProps {
  category: BoardCategory;
  variant?: 'showcase' | 'playlists' | 'spotlight';
  autoSlideInterval?: number;
}

export default function Carousel({ category, variant = 'spotlight', autoSlideInterval = 4000 }: CarouselProps) {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<CarouselPost[]>([]);
  const [center, setCenter] = useState(0);
  const [hoveredCenter, setHoveredCenter] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await boardApi.getBoardByCategory(category, {});
      const list = (data?.data as { posts?: CarouselPost[] })?.posts ?? [];
      // 월간 조회수 기준 정렬 (현재는 등록일 기준으로 가정, 추후 API에서 정렬된 데이터 받아올 예정)
      setPosts(Array.isArray(list) ? list.slice(0, 10) : []);
    } catch {
      setPosts([]);
    }
  }, [category]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Auto-slide: every 4s move right (무한 루프)
  useEffect(() => {
    if (posts.length === 0) return;
    const t = setInterval(() => {
      setCenter((c) => (c + 1) % 10);
    }, autoSlideInterval);
    return () => clearInterval(t);
  }, [posts.length, autoSlideInterval]);

  // 화면 너비 기반 카드 크기 계산 (7장, 모든 카드 동일 크기)
  const [cardWidths, setCardWidths] = useState({ base: 300 });

  useEffect(() => {
    const calculateCardWidths = () => {
      const screenWidth = window.innerWidth;
      const wrapperPadding = 48; // 좌우 24px씩
      const availableWidth = screenWidth - wrapperPadding;
      
      // 7장 카드, 각 카드가 좌측 카드의 2/5를 덮음
      const baseWidth = Math.floor(availableWidth / 5);
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
        window.location.href = `/boards/${category}/${p.id}`;
      }
    } else {
      // 좌우 카드 클릭 시 가운데로 이동
      setCenter((c) => (c + (index - CENTER_INDEX) + 10) % 10);
    }
  };

  const handleCenterHover = (isHovering: boolean, post: CarouselPost) => {
    if (variant === 'showcase' && isHovering) {
      // Showcase: 가운데 영상 호버 시 무음 자동재생
      if (post.youtubeUrl) {
        setPlayingVideo(post.id);
      }
    } else if (variant === 'showcase' && !isHovering) {
      setPlayingVideo(null);
    } else if (variant !== 'showcase') {
      // Playlists/Spotlight: 가운데 카드 호버 시 확장
      setHoveredCenter(isHovering);
    }
  };

  // 각 카드의 마진 계산
  const getCardMargin = (index: number) => {
    if (index === 0) return 0; // 1카드(최좌측): 마진 없음
    if (index === 6) return 0; // 7카드(최우측): 마진 없음
    return -cardWidths.base * (2 / 5);
  };

  // 각 카드의 z-index 계산
  const getCardZIndex = (index: number) => {
    if (index === CENTER_INDEX) return 10; // 4카드(가운데)가 가장 위
    if (index === 1 || index === 4) return 5; // 2카드와 5카드
    return 1; // 나머지 카드들
  };

  // 현재 보여질 카드 인덱스 계산 (무한 루프)
  const getDisplayIndex = (offset: number) => {
    return (center + offset + 10) % 10;
  };

  // YouTube ID 추출
  const extractYoutubeId = (url?: string): string => {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  };

  if (posts.length === 0) return null;

  return (
    <section className={`${styles.section} ${styles[variant]} ${darkMode ? 'dark' : ''}`}>
      <div className={styles.wrapper}>
        <div className={styles.track}>
          {Array.from({ length: VISIBLE }).map((_, i) => {
            const displayIndex = getDisplayIndex(i - CENTER_INDEX);
            const post = posts[displayIndex];
            if (!post) return null;

            const isCenter = i === CENTER_INDEX;
            const cardWidth = hoveredCenter && isCenter && variant !== 'showcase'
              ? cardWidths.base * 1.5  // 호버 시 1.5배 확장 (Showcase 제외)
              : cardWidths.base;

            const thumbnail = post.thumbnail || 
              (variant === 'showcase' && post.youtubeUrl 
                ? `https://img.youtube.com/vi/${extractYoutubeId(post.youtubeUrl)}/mqdefault.jpg`
                : post.image);

            return (
              <div
                key={`${post.id}-${i}-${center}`}
                role="button"
                tabIndex={0}
                className={`${styles.card} ${isCenter ? styles.center : ''}`}
                style={{
                  width: `${cardWidth}px`,
                  marginLeft: `${getCardMargin(i)}px`,
                  zIndex: getCardZIndex(i),
                }}
                onMouseEnter={() => handleCenterHover(true, post)}
                onMouseLeave={() => handleCenterHover(false, post)}
                onClick={() => onCardClick(i)}
                onKeyDown={(e) => (e.key === 'Enter' ? onCardClick(i) : null)}
              >
                {variant === 'showcase' && isCenter && playingVideo === post.id && post.youtubeUrl ? (
                  <iframe
                    className={styles.video}
                    src={`https://www.youtube.com/embed/${extractYoutubeId(post.youtubeUrl)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${extractYoutubeId(post.youtubeUrl)}`}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <div
                    className={styles.thumb}
                    style={thumbnail ? { backgroundImage: `url(${thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    <div className={styles.overlay}>
                      <div className={styles.cardTitle}>{post.title}</div>
                      {post.description && (
                        <div className={styles.desc}>{post.description}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
