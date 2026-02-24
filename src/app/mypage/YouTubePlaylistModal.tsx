'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import { useNonce } from '@/contexts/NonceContext';

interface PlaylistItem {
  playlistId: number;
  youtubeListId: string;
  title: string;
  thumbnailUrl: string;
  thumbnails?: string[];
  itemCount: number;
}

interface YouTubePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function YouTubePlaylistModal({ isOpen, onClose, onSuccess }: YouTubePlaylistModalProps) {
  const nonce = useNonce();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
    }
  }, [isOpen]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const response = await mypageApi.getYouTubePlaylists();
      const playlistArray = response.data?.data; 

      // 배열이 존재하고 길이가 있는 확인 후 바로 세팅
      if (Array.isArray(playlistArray)) {
        setPlaylists(playlistArray);
      } else {
        setPlaylists([]);
      }
    } catch (error: unknown) {
      const errRes = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
      const status = errRes?.status;
      const msg = errRes?.data?.message;

      if (status === 401) {
        ToastUtils.error(msg || '로그인이 필요합니다.');
      } else if (status === 403) {
        ToastUtils.error(msg || 'Google 계정 연동이 필요합니다.');
      } else {
        ToastUtils.error(msg || '플레이리스트를 불러오는데 실패했습니다.');
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistSelect = async (playlist: PlaylistItem) => {
    if (registering) return;

    setRegistering(true);
    try {
      await mypageApi.registerYouTubePlaylist({
        youtubeListId: playlist.youtubeListId,
        title: playlist.title,
        thumbnailUrl: playlist.thumbnailUrl,
        itemCount: playlist.itemCount,
      });

      ToastUtils.success('플레이리스트가 성공적으로 등록되었습니다.');
      onClose();
      onSuccess();
    } catch (error: unknown) {
      const errRes = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
      const status = errRes?.status;
      const msg = errRes?.data?.message;

      if (status === 401) {
        ToastUtils.error(msg || '로그인이 필요합니다.');
      } else if (status === 403) {
        ToastUtils.error(msg || 'Google 계정 연동이 필요합니다.');
      } else if (status === 409) {
        ToastUtils.error(msg || '이미 등록된 플레이리스트입니다.');
      } else {
        ToastUtils.error(msg || '플레이리스트 등록에 실패했습니다.');
      }
    } finally {
      setRegistering(false);
    }
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
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          padding: 24,
          background: darkMode ? '#2E2E2C' : '#fff',
          borderRadius: 12,
          maxWidth: 800,
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: darkMode ? '#B5B3A7' : '#333' }}>YouTube 플레이리스트 선택</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: darkMode ? '#8A877D' : '#666',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: `4px solid ${darkMode ? '#333' : '#f0f0f0'}`,
                borderTop: `4px solid ${darkMode ? '#3A3934' : '#111'}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style {...(nonce ? { nonce } : {})}>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .playlist-scroll-container::-webkit-scrollbar {
                width: 8px;
              }
              .playlist-scroll-container::-webkit-scrollbar-track {
                background: #f0f0f0;
                border-radius: 4px;
              }
              .playlist-scroll-container::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 4px;
              }
              .playlist-scroll-container::-webkit-scrollbar-thumb:hover {
                background: #999;
              }
            `}</style>
          </div>
        ) : playlists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
            플레이리스트가 없습니다.
          </div>
        ) : (
          <>
            <div
              className="playlist-scroll-container"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 20,
                overflowY: 'auto',
                maxHeight: '60vh',
                padding: '4px 4px 20px',
              }}
            >
              {playlists.map((playlist) => (
                <div
                  key={playlist.youtubeListId}
                  onClick={() => handlePlaylistSelect(playlist)}
                  style={{
                    background: darkMode ? '#242422' : 'white',
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: registering ? 'not-allowed' : 'pointer',
                    opacity: registering ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!registering) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = darkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!registering) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingBottom: '56.25%',
                      background: '#000',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={playlist.thumbnailUrl || ''} 
                      alt={playlist.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
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
                        background: 'rgba(0,0,0,0.1)',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!registering) {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!registering) {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                        }
                      }}
                    />
                  </div>
                  <div style={{ padding: 16, minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: darkMode ? '#B5B3A7' : '#333',
                        marginBottom: 8,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.4,
                        minHeight: '2.8em',
                      }}
                    >
                      {playlist.title}
                    </div>
                    <div style={{ fontSize: 14, color: darkMode ? '#8A877D' : '#666', marginTop: 'auto' }}>
                      {playlist.itemCount}곡
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 0 0',
                borderTop: '1px solid #e0e0e0',
                fontSize: 13,
                color: '#666',
              }}
            >
              <svg
                style={{ height: 18 }}
                viewBox="0 0 90 20"
                fill="#FF0000"
              >
                <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 0 14.285 0 14.285 0C14.285 0 5.35042 0 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C0 5.35042 0 10 0 10C0 10 0 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" />
                <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white" />
              </svg>
              <span>Powered by YouTube</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
