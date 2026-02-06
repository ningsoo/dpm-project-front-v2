'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        padding: '40px 20px',
      }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          maxWidth: 400,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'relative',
            background: 'white',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 20,
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <X size={20} color="#333" />
          </button>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  border: '4px solid #f0f0f0',
                  borderTop: '4px solid #FF0000',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : tracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
              트랙이 없습니다.
            </div>
          ) : (
            <>
              {/* Player Area */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '56.25%',
                  background: '#000',
                  minHeight: 270,
                }}
              >
                {/* IFrame Wrapper - Always rendered */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <div
                    ref={playerContainerRef}
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                  />
                </div>

                {/* Thumbnail Wrapper - Overlays the player */}
                {showThumbnail && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      zIndex: 1,
                    }}
                    onClick={startPlaylist}
                  >
                    <img
                      src={tracks[0]?.thumbnailUrl || ''}
                      alt="Playlist Thumbnail"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                      }}
                    >
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          background: 'rgba(255,255,255,0.95)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.2s ease',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderLeft: '24px solid #333',
                            borderTop: '16px solid transparent',
                            borderBottom: '16px solid transparent',
                            marginLeft: 6,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Playlist Info */}
              <div
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                }}
              >
                {/* Header Info */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#333',
                      marginBottom: 6,
                    }}
                  >
                    {playlistTitle}
                  </div>
                  <div style={{ fontSize: 14, color: '#666' }}>
                    {tracks.length}곡
                  </div>
                </div>

                {/* Track List Container */}
                <div
                  className="track-list-container"
                  style={{
                    flex: 1,
                    maxHeight: 280,
                    overflowY: 'auto',
                    marginBottom: 12,
                    borderRadius: 8,
                  }}
                >
                  <style>{`
                    .track-list-container::-webkit-scrollbar {
                      width: 8px;
                    }
                    .track-list-container::-webkit-scrollbar-track {
                      background: #f0f0f0;
                      border-radius: 4px;
                    }
                    .track-list-container::-webkit-scrollbar-thumb {
                      background: #ccc;
                      border-radius: 4px;
                    }
                    .track-list-container::-webkit-scrollbar-thumb:hover {
                      background: #999;
                    }
                    @keyframes wave {
                      0%, 100% {
                        transform: scaleY(0.5);
                      }
                      50% {
                        transform: scaleY(1);
                      }
                    }
                  `}</style>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tracks.map((track, index) => (
                      <li
                        key={track.videoId}
                        onClick={() => handleTrackClick(index)}
                        style={{
                          padding: 12,
                          color: currentTrackIndex === index ? '#1a73e8' : '#555',
                          fontSize: 14,
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          borderRadius: 6,
                          marginBottom: 4,
                          background: currentTrackIndex === index ? '#e8f0fe' : 'transparent',
                          fontWeight: currentTrackIndex === index ? 500 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (currentTrackIndex !== index) {
                            e.currentTarget.style.background = '#f9f9f9';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentTrackIndex !== index) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <span
                          style={{
                            color: currentTrackIndex === index ? '#1a73e8' : '#999',
                            minWidth: 24,
                            fontSize: 13,
                          }}
                        >
                          {index + 1}
                        </span>
                        <span style={{ flex: 1 }}>{track.title}</span>
                        {currentTrackIndex === index && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              marginLeft: 'auto',
                            }}
                          >
                            <div
                              style={{
                                width: 3,
                                height: 14,
                                background: '#1a73e8',
                                borderRadius: 2,
                                animation: 'wave 1.2s ease-in-out infinite',
                              }}
                            />
                            <div
                              style={{
                                width: 3,
                                height: 14,
                                background: '#1a73e8',
                                borderRadius: 2,
                                animation: 'wave 1.2s ease-in-out infinite 0.1s',
                              }}
                            />
                            <div
                              style={{
                                width: 3,
                                height: 14,
                                background: '#1a73e8',
                                borderRadius: 2,
                                animation: 'wave 1.2s ease-in-out infinite 0.2s',
                              }}
                            />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* YouTube Branding */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 14,
                    background: '#f9f9f9',
                    borderTop: '1px solid #e0e0e0',
                    fontSize: 13,
                    color: '#666',
                    marginLeft: -20,
                    marginRight: -20,
                    marginBottom: -20,
                  }}
                >
                  <svg style={{ height: 18 }} viewBox="0 0 90 20" fill="#FF0000">
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
