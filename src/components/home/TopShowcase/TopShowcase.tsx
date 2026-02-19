'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import type { BoardListItem } from '@/api/boardTypes';
import {
  extractBoardListFromResponse,
  getBoardThumbnailUrl,
  getShowcaseVideoId,
} from '@/utils/boardThumbnailUtils';
import YouTubeHoverThumbnail from '@/components/board/YouTubeHoverThumbnail';
import { BoardCard } from '@/components/board/BoardCard';
import styles from './TopShowcase.module.css';

export default function TopShowcase() {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [posts, setPosts] = useState<BoardListItem[]>([]);

  useEffect(() => {
    boardApi
      .getBoardByCategory('SHOWCASE')
      .then(({ data }) => {
        const list = extractBoardListFromResponse(data);
        setPosts(list.slice(0, 8));
      })
      .catch(() => setPosts([]));
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className={`${styles.section} ${darkMode ? 'dark' : ''}`}>
      <h2 className={styles.title}>TOP Showcase</h2>
      <div className={styles.grid}>
        {posts.map((p) => {
          const thumbnailUrl = getBoardThumbnailUrl(p, 'showcase');
          const videoId = getShowcaseVideoId(p);
          const thumbnail = videoId ? (
            <YouTubeHoverThumbnail
              thumbnailUrl={thumbnailUrl}
              videoId={videoId}
              alt={p.title}
            />
          ) : (
            <img src={thumbnailUrl} alt="" className={styles.thumb} />
          );

          return (
            <BoardCard
              key={p.boardId}
              thumbnail={thumbnail}
              title={p.title}
              nickname={p.nickname}
              profileImage={p.profileImage}
              likeCount={p.likes}
              viewCount={p.views}
              onClick={() => router.push(`/boards/${p.boardId}`)}
            />
          );
        })}
      </div>
    </section>
  );
}
