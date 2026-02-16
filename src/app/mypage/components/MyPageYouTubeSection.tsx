'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, X, Check, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { checkAuth } from '@/store/slices/authSlice';
import { YouTubePlaylistModal } from '../YouTubePlaylistModal';
import { PlaylistDetailModal } from '../PlaylistDetailModal';

interface UserInfo {
  id: string;
  email: string;
  nickname: string;
  phoneNumber: string;
  profileImage?: string;
  credits?: number;
  youtubeConnected?: boolean;
}

interface PlaylistItem {
  playlistId: number;
  youtubeListId: string;
  title: string;
  thumbnailUrl: string;
  thumbnails?: string[];
  itemCount: number;
}

interface MyPageYouTubeSectionProps {
  user: UserInfo;
  isAuthenticated: boolean;
}

const CARDS_PER_VIEW = 3;
const CARD_GAP = 24;

export function MyPageYouTubeSection({ user, isAuthenticated }: MyPageYouTubeSectionProps) {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  const [showYouTubePlaylistModal, setShowYouTubePlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<PlaylistItem | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistItem | null>(null);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [oauthResultModal, setOauthResultModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const maxSliderIndex = Math.max(0, playlists.length - CARDS_PER_VIEW);
  const slideNext = () => setSliderIndex((prev) => Math.min(prev + 1, maxSliderIndex));
  const slidePrev = () => setSliderIndex((prev) => Math.max(prev - 1, 0));

  // OAuth 리다이렉트 처리 (토큰 저장 + URL 정리 + 결과 알림)
  useEffect(() => {
    const token = searchParams.get('token');
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (!token && !success && !error) return;

    if (token) {
      tokenUtils.setAccessToken(token);
      dispatch(checkAuth());
      console.log('[MyPage] OAuth token saved');
    }

    window.history.replaceState({}, '', '/mypage');

    if (success === 'true') {
      setOauthResultModal({ type: 'success', message: '유튜브 연동 성공!\n이제 나만의 플레이리스트를 공유할 수 있습니다!' });
    } else if (error) {
      setOauthResultModal({ type: 'error', message: `유튜브 연동에 실패했습니다: ${decodeURIComponent(error)}` });
    } else if (success === 'false') {
      setOauthResultModal({ type: 'error', message: '유튜브 연동에 실패했습니다. 다시 시도해주세요.' });
    }
  }, [searchParams, dispatch]);

  // 플레이리스트 데이터 로드 (유튜브 연동된 경우에만)
  useEffect(() => {
    if (isAuthenticated && user?.youtubeConnected) {
      fetchPlaylists();
    }
  }, [isAuthenticated, user?.youtubeConnected]);

  const fetchPlaylists = async () => {
    setPlaylistsLoading(true);
    try {
      const response = await mypageApi.getMyPlaylists();
      const playlistArray = response.data?.data;

      if (Array.isArray(playlistArray)) {
        setPlaylists(playlistArray);
      } else {
        setPlaylists([]);
      }
    } catch (error) {
      console.error('플레이리스트 로드 실패:', error);
      ToastUtils.error('플레이리스트를 불러올 수 없습니다.');
      setPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlistToDelete) return;

    try {
      await mypageApi.deleteYouTubePlaylist(playlistToDelete.playlistId);
      ToastUtils.success('플레이리스트가 목록에서 삭제되었습니다.');
      setPlaylistToDelete(null);
      fetchPlaylists();
    } catch (error) {
      console.error('플레이리스트 삭제 실패:', error);
      ToastUtils.error('플레이리스트 삭제에 실패했습니다.');
    }
  };

  return (
    <>
      <div>
        {!user?.youtubeConnected ? (
          /* 유튜브 미연동 상태 플레이스홀더 */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" fill="#ccc"/>
                <polygon points="9.75,15.02 15.5,11.75 9.75,8.48" fill="#fff"/>
              </svg>
            </div>
            <p style={{
              fontSize: 16,
              color: '#666',
              marginBottom: 24,
              lineHeight: 1.6,
            }}>
              유튜브를 연동하고 나만의 플레이리스트를 관리해보세요!
            </p>
            <button
              type="button"
              disabled={!user?.email}
              onClick={() => {
                if (!user?.email) return;
                const encodedEmail = encodeURIComponent(user.email);
                window.location.href = `/oauth2/authorization/google?email=${encodedEmail}`;
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                background: darkMode ? '#242422' : '#fff',
                color: !user?.email ? (darkMode ? '#666' : '#aaa') : (darkMode ? '#B5B3A7' : '#333'),
                border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`,
                borderRadius: 8,
                cursor: !user?.email ? 'not-allowed' : 'pointer',
                fontSize: 15,
                fontWeight: 500,
                transition: 'all 0.2s',
                boxShadow: darkMode ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
                opacity: !user?.email ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!user?.email) return;
                e.currentTarget.style.background = darkMode ? '#2E2E2C' : '#f8f8f8';
                e.currentTarget.style.borderColor = darkMode ? '#8A877D' : '#999';
                e.currentTarget.style.boxShadow = darkMode ? '0 2px 6px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                if (!user?.email) return;
                e.currentTarget.style.background = darkMode ? '#242422' : '#fff';
                e.currentTarget.style.borderColor = darkMode ? '#3A3A38' : '#ddd';
                e.currentTarget.style.boxShadow = darkMode ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.08)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google 연동하기
            </button>
          </div>
        ) : (
        <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowYouTubePlaylistModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 16px',
                background: darkMode ? '#3A3934' : '#111',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <Plus size={18} />
              등록
            </button>
            {playlists.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsDeleteMode(!isDeleteMode);
                  if (isDeleteMode) {
                    setPlaylistToDelete(null);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 16px',
                  background: isDeleteMode ? '#A6534F' : '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }}
              >
                <Trash2 size={18} />
                {isDeleteMode ? '완료' : '관리'}
              </button>
            )}
          </div>
          {playlists.length > CARDS_PER_VIEW && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={slidePrev}
                disabled={sliderIndex === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  background: darkMode ? '#242422' : '#fff',
                  border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`,
                  borderRadius: '50%',
                  cursor: sliderIndex === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: sliderIndex === 0 ? 0.4 : 1,
                  color: darkMode ? '#B5B3A7' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (sliderIndex === 0) return;
                  e.currentTarget.style.background = darkMode ? '#2E2E2C' : '#f5f5f5';
                  e.currentTarget.style.borderColor = darkMode ? '#8A877D' : '#999';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = darkMode ? '#242422' : '#fff';
                  e.currentTarget.style.borderColor = darkMode ? '#3A3A38' : '#ddd';
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={slideNext}
                disabled={sliderIndex >= maxSliderIndex}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  background: darkMode ? '#242422' : '#fff',
                  border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`,
                  borderRadius: '50%',
                  cursor: sliderIndex >= maxSliderIndex ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: sliderIndex >= maxSliderIndex ? 0.4 : 1,
                  color: darkMode ? '#B5B3A7' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (sliderIndex >= maxSliderIndex) return;
                  e.currentTarget.style.background = darkMode ? '#2E2E2C' : '#f5f5f5';
                  e.currentTarget.style.borderColor = darkMode ? '#8A877D' : '#999';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = darkMode ? '#242422' : '#fff';
                  e.currentTarget.style.borderColor = '#ddd';
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
        {playlistsLoading ? (
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
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : playlists.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: 60 }}>
            등록된 플레이리스트가 없습니다.
          </div>
        ) : (
          <div style={{ overflow: 'hidden', padding: '4px 4px 8px' }}>
            <div
              style={{
                display: 'flex',
                gap: CARD_GAP,
                transition: 'transform 0.4s ease-out',
                transform: `translateX(calc(${-sliderIndex * 100 / CARDS_PER_VIEW}% - ${sliderIndex * CARD_GAP / CARDS_PER_VIEW}px))`,
              }}
            >
            {playlists.map((playlist) => (
              <div
                key={playlist.youtubeListId}
                style={{
                  position: 'relative',
                  background: darkMode ? '#242422' : 'white',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: isDeleteMode ? 'default' : 'pointer',
                  width: `calc((100% - ${CARD_GAP * (CARDS_PER_VIEW - 1)}px) / ${CARDS_PER_VIEW})`,
                  minWidth: `calc((100% - ${CARD_GAP * (CARDS_PER_VIEW - 1)}px) / ${CARDS_PER_VIEW})`,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isDeleteMode) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = darkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDeleteMode) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
                  }
                }}
                onClick={() => {
                  if (!isDeleteMode) {
                    setSelectedPlaylist(playlist);
                  }
                }}
              >
                {isDeleteMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaylistToDelete(playlist);
                    }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#A6534F',
                      border: '2px solid #fff',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#954A47';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#A6534F';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <X size={18} strokeWidth={3} />
                  </button>
                )}
                {/* Thumbnail */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 180,
                    borderRadius: '12px 12px 0 0',
                    overflow: 'hidden',
                    background: darkMode ? '#2E2E2C' : '#f0f0f0',
                  }}
                >
                  {playlist.thumbnailUrl ? (
                    <img
                      src={playlist.thumbnailUrl}
                      alt={playlist.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      fontSize: 14,
                    }}>
                      썸네일 없음
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'transparent',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDeleteMode) e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
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
          </div>
        )}
        </>
        )}
      </div>

      {/* 플레이리스트 등록 모달 */}
      <YouTubePlaylistModal
        isOpen={showYouTubePlaylistModal}
        onClose={() => setShowYouTubePlaylistModal(false)}
        onSuccess={() => {
          fetchPlaylists();
        }}
      />

      {/* 플레이리스트 상세 모달 */}
      {selectedPlaylist && (
        <PlaylistDetailModal
          isOpen={!!selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
          playlistId={selectedPlaylist.playlistId}
          playlistTitle={selectedPlaylist.title}
        />
      )}

      {/* 삭제 확인 모달 */}
      {playlistToDelete && (
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
          onClick={() => setPlaylistToDelete(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              padding: 32,
              background: darkMode ? '#2E2E2C' : '#fff',
              borderRadius: 12,
              maxWidth: 400,
              width: '90%',
              boxShadow: darkMode ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600, color: darkMode ? '#B5B3A7' : '#333', textAlign: 'center' }}>
              플레이리스트 삭제
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 15, color: darkMode ? '#8A877D' : '#666', lineHeight: 1.6, textAlign: 'center' }}>
              <strong>{playlistToDelete.title}</strong>
              <br />
              정말로 삭제하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleDeletePlaylist}
                style={{
                  padding: '10px 24px',
                  background: '#A6534F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#954A47';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#A6534F';
                }}
              >
                삭제
              </button>
              <button
                type="button"
                onClick={() => setPlaylistToDelete(null)}
                style={{
                  padding: '10px 24px',
                  background: darkMode ? '#3A3A38' : '#fff',
                  color: darkMode ? '#A19E94' : '#666',
                  border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = darkMode ? '#4A4A48' : '#f5f5f5';
                  e.currentTarget.style.borderColor = darkMode ? '#8A877D' : '#999';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = darkMode ? '#3A3A38' : '#fff';
                  e.currentTarget.style.borderColor = darkMode ? '#3A3A38' : '#ddd';
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OAuth 결과 모달 */}
      {oauthResultModal && (
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
          onClick={() => setOauthResultModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              padding: 32,
              background: darkMode ? '#2E2E2C' : '#fff',
              borderRadius: 12,
              maxWidth: 400,
              width: '90%',
              boxShadow: darkMode ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: oauthResultModal.type === 'success' ? (darkMode ? '#1a2e1a' : '#e8f5e9') : (darkMode ? '#3a1f1f' : '#fbe9e7'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              {oauthResultModal.type === 'success' ? (
                <Check size={28} color="#2e7d32" />
              ) : (
                <X size={28} color="#A6534F" />
              )}
            </div>
            <p style={{
              margin: '0 0 24px',
              fontSize: 16,
              color: darkMode ? '#B5B3A7' : '#333',
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}>
              {oauthResultModal.message}
            </p>
            <button
              type="button"
              onClick={() => {
                setOauthResultModal(null);
                window.history.replaceState({}, '', '/mypage');
              }}
              style={{
                padding: '10px 32px',
                background: oauthResultModal.type === 'success' ? '#111' : '#666',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
