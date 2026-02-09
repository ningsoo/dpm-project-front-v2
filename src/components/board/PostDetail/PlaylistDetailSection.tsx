'use client';

import { useState, useMemo } from 'react';
import type { PlaylistItem } from '@/api/boardTypes';
import { getYouTubeEmbedUrl } from '@/utils/youtubeUtils';
import styles from './PlaylistDetailSection.module.css';

interface PlaylistDetailSectionProps {
  playlistTitle: string;
  playlistItems: PlaylistItem[];
}

/**
 * PLAYLISTS 게시글 상세 본문 영역용 인라인 플레이리스트 플레이어
 * PlaylistDetailModal UI/로직과 동일하나 모달이 아닌 인라인 렌더링
 * - position 기준 정렬
 * - 최초 진입 시 첫 번째 영상(position 0) 기본 재생
 * - 썸네일 클릭 시 해당 영상 재생
 */
export default function PlaylistDetailSection({
  playlistTitle,
  playlistItems,
}: PlaylistDetailSectionProps) {
  const sortedItems = useMemo(() => {
    if (!Array.isArray(playlistItems)) return [];
    return [...playlistItems].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );
  }, [playlistItems]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasUserSelected, setHasUserSelected] = useState(false);

  const currentVideoId = sortedItems[currentIndex]?.videoId ?? null;
  const embedUrl = getYouTubeEmbedUrl(currentVideoId, hasUserSelected ? { autoplay: true, mute: true } : undefined);

  const handleTrackClick = (index: number) => {
    setCurrentIndex(index);
    setHasUserSelected(true);
  };

  if (sortedItems.length === 0) return null;

  return (
    <div className={styles.section}>
      {/* Player Area */}
      <div className={styles.playerWrap}>
        {embedUrl ? (
          <iframe
            key={currentVideoId}
            className={styles.iframe}
            src={embedUrl}
            title="YouTube playlist"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className={styles.playerPlaceholder}>
            영상을 선택해주세요
          </div>
        )}
      </div>

      {/* Playlist Info */}
      <div className={styles.info}>
        <div className={styles.playlistTitle}>{playlistTitle || '플레이리스트'}</div>
        <div className={styles.trackCount}>{sortedItems.length}곡</div>
      </div>

      {/* Track List */}
      <ul className={styles.trackList}>
        {sortedItems.map((track, index) => (
          <li
            key={track.videoId + String(index)}
            className={`${styles.trackItem} ${currentIndex === index ? styles.active : ''}`}
            onClick={() => handleTrackClick(index)}
          >
            <span className={styles.trackNum}>{index + 1}</span>
            <div
              className={styles.trackThumb}
              style={{
                backgroundImage: track.thumbnailUrl
                  ? `url(${track.thumbnailUrl})`
                  : undefined,
              }}
            />
            <span className={styles.trackTitle}>{track.title || '(제목 없음)'}</span>
            {currentIndex === index && (
              <div className={styles.playingIndicator} aria-hidden>
                <span />
                <span />
                <span />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
