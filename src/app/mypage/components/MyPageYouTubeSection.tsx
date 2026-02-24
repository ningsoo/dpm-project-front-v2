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
import styles from '../mypage.module.css';
import ytStyles from './MyPageYouTubeSection.module.css';

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
  onLoadingChange?: (loading: boolean) => void;
}

const CARDS_PER_VIEW = 3;
const CARD_GAP = 24;

export function MyPageYouTubeSection({ user, isAuthenticated, onLoadingChange }: MyPageYouTubeSectionProps) {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  const [showYouTubePlaylistModal, setShowYouTubePlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
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
    } else {
      setPlaylistsLoading(false);
    }
  }, [isAuthenticated, user?.youtubeConnected]);

  useEffect(() => {
    onLoadingChange?.(playlistsLoading);
  }, [playlistsLoading, onLoadingChange]);

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
      ToastUtils.error('게시글에 등록된 플레이리스트는 삭제할 수 없습니다.');
    }
  };

  return (
    <>
      <div className={`${ytStyles.root} ${darkMode ? ytStyles.dark : ''}`}>
        {!user?.youtubeConnected ? (
          <div className={ytStyles.placeholderWrap}>
            <div className={ytStyles.placeholderIconBox}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" fill="#ccc"/>
                <polygon points="9.75,15.02 15.5,11.75 9.75,8.48" fill="#fff"/>
              </svg>
            </div>
            <p className={ytStyles.placeholderText}>
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
              className={ytStyles.placeholderBtn}
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
        <div className={ytStyles.headerRow}>
          <div className={ytStyles.headerActions}>
            <button
              type="button"
              onClick={() => setShowYouTubePlaylistModal(true)}
              className={`${styles.playlistActionBtn} ${ytStyles.btnRegister}`}
            >
              <Plus size={18} />
              등록
            </button>
            <button
              type="button"
              disabled={playlistsLoading || playlists.length === 0}
              onClick={() => {
                if (playlistsLoading || playlists.length === 0) return;
                setIsDeleteMode(!isDeleteMode);
                if (isDeleteMode) {
                  setPlaylistToDelete(null);
                }
              }}
              className={`${styles.playlistActionBtn} ${isDeleteMode ? ytStyles.btnDeleteMode : ytStyles.btnRegister}`}
            >
              <Trash2 size={18} />
              {isDeleteMode ? '완료' : '관리'}
            </button>
          </div>
          <div className={ytStyles.navWrap}>
              <button
                type="button"
                onClick={slidePrev}
                disabled={playlistsLoading || sliderIndex === 0}
                className={ytStyles.navBtn}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={slideNext}
                disabled={playlistsLoading || sliderIndex >= maxSliderIndex}
                className={ytStyles.navBtn}
              >
                <ChevronRight size={20} />
              </button>
            </div>
        </div>
        <div className={styles.fadeWrap}>
          {/* 스켈레톤 카드 레이어 */}
          <div className={`${styles.fadeLayer} ${playlistsLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
            <div className={ytStyles.skeletonRow}>
              {Array.from({ length: CARDS_PER_VIEW }).map((_, i) => (
                <div key={i} className={`${styles.skeletonCard} ${ytStyles.skeletonCardFlex}`}>
                  <div className={styles.skeletonCardThumb} />
                  <div className={styles.skeletonCardBody}>
                    <div className={`${styles.skeletonBar} ${ytStyles.skeletonBar80}`} />
                    <div className={`${styles.skeletonBar} ${ytStyles.skeletonBar50}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 실제 콘텐츠 레이어 */}
          <div className={`${styles.fadeLayer} ${!playlistsLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
        {playlists.length === 0 && !playlistsLoading ? (
          <div className={ytStyles.emptyState}>
            등록된 플레이리스트가 없습니다.
          </div>
        ) : (
          <div className={ytStyles.sliderTrackWrap}>
            <div
              className={`${ytStyles.sliderTrack} ${(ytStyles as Record<string, string>)[`ytSlide${Math.min(sliderIndex, 29)}`] ?? ''}`}
            >
            {playlists.map((playlist) => (
              <div
                key={playlist.youtubeListId}
                className={`${ytStyles.card} ${isDeleteMode ? ytStyles.cardDeleteMode : ''}`}
                onClick={() => {
                  if (!isDeleteMode) {
                    setSelectedPlaylist(playlist);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isDeleteMode) setSelectedPlaylist(playlist);
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
                    className={ytStyles.cardDeleteBtn}
                  >
                    <X size={18} strokeWidth={3} />
                  </button>
                )}
                <div className={ytStyles.thumbWrap}>
                  {playlist.thumbnailUrl ? (
                    <img
                      src={playlist.thumbnailUrl}
                      alt={playlist.title}
                      className={ytStyles.thumbImg}
                    />
                  ) : (
                    <div className={ytStyles.thumbPlaceholder}>
                      썸네일 없음
                    </div>
                  )}
                  <div className={ytStyles.thumbOverlay} aria-hidden />
                </div>
                <div className={ytStyles.cardBody}>
                  <div className={ytStyles.cardTitle}>
                    {playlist.title}
                  </div>
                  <div className={ytStyles.cardMeta}>
                    {playlist.itemCount}곡
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}
          </div>
        </div>
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
          className={ytStyles.modalBackdrop}
          onClick={() => setPlaylistToDelete(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className={ytStyles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={ytStyles.modalTitle}>
              플레이리스트 삭제
            </h3>
            <p className={ytStyles.modalText}>
              <strong>{playlistToDelete.title}</strong>
              <br />
              정말로 삭제하시겠습니까?
            </p>
            <div className={ytStyles.modalActions}>
              <button type="button" onClick={handleDeletePlaylist} className={ytStyles.btnDanger}>
                삭제
              </button>
              <button type="button" onClick={() => setPlaylistToDelete(null)} className={ytStyles.btnCancel}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OAuth 결과 모달 */}
      {oauthResultModal && (
        <div
          className={ytStyles.modalBackdrop}
          onClick={() => setOauthResultModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`${ytStyles.modalBox} ${ytStyles.oauthModalBox}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`${ytStyles.oauthIconWrap} ${oauthResultModal.type === 'error' ? ytStyles.error : ''}`}>
              {oauthResultModal.type === 'success' ? (
                <Check size={28} color="#2e7d32" />
              ) : (
                <X size={28} color="#A6534F" />
              )}
            </div>
            <p className={ytStyles.oauthMessage}>
              {oauthResultModal.message}
            </p>
            <button
              type="button"
              onClick={() => {
                setOauthResultModal(null);
                window.history.replaceState({}, '', '/mypage');
              }}
              className={`${ytStyles.btnOauthOk} ${oauthResultModal.type === 'error' ? ytStyles.error : ''}`}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
