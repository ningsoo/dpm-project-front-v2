'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import { useNonce } from '@/contexts/NonceContext';
import styles from './PlaylistDetailModal.module.css';

interface TrackItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
}

interface PlaylistDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: number;
  playlistTitle: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function PlaylistDetailModal({ isOpen, onClose, playlistId, playlistTitle }: PlaylistDetailModalProps) {
  const nonce = useNonce();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [apiReady, setApiReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setApiReady(true);
      };
    } else {
      setApiReady(true);
    }
  }, []);

  // Fetch tracks when modal opens
  useEffect(() => {
    if (isOpen && playlistId) {
      fetchTracks();
      setShowThumbnail(true);
      setCurrentTrackIndex(null);
      setPlayerReady(false);
    }
  }, [isOpen, playlistId]);

  // Initialize player when API is ready and modal is open
  useEffect(() => {
    if (apiReady && isOpen && tracks.length > 0 && !playerRef.current && playerContainerRef.current) {
      console.log('Initializing YouTube Player...');
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            console.log('YouTube Player is ready');
            setPlayerReady(true);
          },
          onError: (event: any) => {
            const err = event.data;
            console.error('YouTube Player error:', err);
            // 100: 삭제/비공개, 101/150: 임베드 제한
            if ([100, 101, 150].includes(err)) {
              ToastUtils.error('이 영상은 유튜브 정책이나 작성자 설정으로 재생할 수 없습니다.');
            }
          },
        },
      });
    }
  }, [apiReady, isOpen, tracks]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // Pause video when tab is hidden (YouTube policy compliance)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        console.log('Tab hidden - pausing video');
        playerRef.current.pauseVideo();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const response = await mypageApi.getPlaylistTracks(playlistId);
      const trackArray = response.data?.data;

      if (Array.isArray(trackArray)) {
        setTracks(trackArray);
      } else {
        setTracks([]);
      }
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401) {
        ToastUtils.error('로그인이 필요합니다.');
      } else if (status === 404) {
        ToastUtils.error('플레이리스트를 찾을 수 없습니다.');
      } else {
        ToastUtils.error('트랙 목록을 불러오는데 실패했습니다.');
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleTrackClick = (index: number) => {
    if (!playerReady || !playerRef.current || typeof playerRef.current.loadVideoById !== 'function') {
      console.error('YouTube Player is not ready. playerReady:', playerReady, 'playerRef.current:', playerRef.current);
      ToastUtils.error('플레이어가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const videoId = tracks[index].videoId;
    console.log('Playing video:', videoId, 'at index:', index);
    playerRef.current.loadVideoById(videoId);
    setCurrentTrackIndex(index);
    setShowThumbnail(false);
  };

  const startPlaylist = () => {
    if (tracks.length > 0) {
      handleTrackClick(0);
    }
  };

  const handleClose = () => {
    if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
      playerRef.current.stopVideo();
    }
    setShowThumbnail(true);
    setCurrentTrackIndex(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.card}>
          <button type="button" onClick={handleClose} className={styles.closeBtn} aria-label="닫기">
            <X size={20} color={darkMode ? '#8A877D' : '#333'} />
          </button>

          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <style {...(nonce ? { nonce } : {})}>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
            </div>
          ) : tracks.length === 0 ? (
            <div className={styles.emptyMessage}>트랙이 없습니다.</div>
          ) : (
            <>
              <div className={styles.playerWrap}>
                <div className={styles.playerInner}>
                  <div ref={playerContainerRef} className={styles.playerContainer} />
                </div>
                {showThumbnail && (
                  <div className={styles.thumbWrap} onClick={startPlaylist}>
                    <img src={tracks[0]?.thumbnailUrl || ''} alt="Playlist Thumbnail" className={styles.thumbImg} />
                    <div className={styles.thumbOverlay}>
                      <div className={styles.playBtn}>
                        <div className={styles.playTriangle} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.infoSection}>
                <div className={styles.infoHeader}>
                  <div className={styles.infoTitle}>{playlistTitle}</div>
                  <div className={styles.infoMeta}>{tracks.length}곡</div>
                </div>

                <div className={styles.trackList}>
                  <style {...(nonce ? { nonce } : {})}>{`
                    @keyframes wave { 0%,100%{transform:scaleY(0.5);} 50%{transform:scaleY(1);} }
                  `}</style>
                  <ul className={styles.trackListInner}>
                    {tracks.map((track, index) => (
                      <li
                        key={track.videoId}
                        onClick={() => handleTrackClick(index)}
                        className={`${styles.trackItem} ${currentTrackIndex === index ? styles.trackItemActive : ''}`}
                      >
                        <span className={styles.trackIndex}>{index + 1}</span>
                        <span className={styles.trackTitle}>{track.title}</span>
                        {currentTrackIndex === index && (
                          <div className={styles.equalizer}>
                            <div className={styles.equalizerBar} />
                            <div className={styles.equalizerBar} />
                            <div className={styles.equalizerBar} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.youtubeBadge}>
                  <svg viewBox="0 0 90 20" fill="#FF0000">
                    <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 0 14.285 0 14.285 0C14.285 0 5.35042 0 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C0 5.35042 0 10 0 10C0 10 0 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" />
                    <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white" />
                  </svg>
                  <span>Powered by YouTube</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
