'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import { useNonce } from '@/contexts/NonceContext';
import styles from './YouTubePlaylistModal.module.css';

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
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>YouTube 플레이리스트 선택</h2>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="닫기">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <style {...(nonce ? { nonce } : {})}>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
          </div>
        ) : playlists.length === 0 ? (
          <div className={styles.emptyMessage}>플레이리스트가 없습니다.</div>
        ) : (
          <>
            <div className={styles.grid}>
              {playlists.map((playlist) => (
                <div
                  key={playlist.youtubeListId}
                  onClick={() => handlePlaylistSelect(playlist)}
                  className={`${styles.card} ${registering ? styles.cardDisabled : ''}`}
                >
                  <div className={styles.thumbWrap}>
                    <img src={playlist.thumbnailUrl || ''} alt={playlist.title} className={styles.thumbImg} />
                    <div className={styles.thumbOverlay} />
                  </div>
                  <div className={styles.body}>
                    <div className={styles.cardTitle}>{playlist.title}</div>
                    <div className={styles.cardMeta}>{playlist.itemCount}곡</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.footer}>
              <svg viewBox="0 0 90 20" fill="#FF0000">
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
