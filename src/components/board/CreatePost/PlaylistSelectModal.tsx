'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './PlaylistSelectModal.module.css';

export interface MyPlaylistItem {
  playlistId: number;
  youtubeListId: string;
  title: string;
  thumbnailUrl: string;
  itemCount: number;
}

interface PlaylistSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (playlist: MyPlaylistItem) => void;
}

export function PlaylistSelectModal({
  isOpen,
  onClose,
  onSelect,
}: PlaylistSelectModalProps) {
  const [playlists, setPlaylists] = useState<MyPlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      fetchPlaylists();
    }
  }, [isOpen]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const response = await mypageApi.getMyPlaylists();
      const playlistArray = response.data?.data;

      if (Array.isArray(playlistArray)) {
        setPlaylists(playlistArray);
      } else {
        setPlaylists([]);
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        ToastUtils.error('로그인이 필요합니다.');
      } else {
        ToastUtils.error('플레이리스트를 불러오는데 실패했습니다.');
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    if (selectedId == null) {
      ToastUtils.error('플레이리스트를 선택해주세요.');
      return;
    }
    const playlist = playlists.find((p) => p.playlistId === selectedId);
    if (playlist) {
      onSelect(playlist);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>플레이리스트 선택</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : playlists.length === 0 ? (
          <div className={styles.empty}>등록된 플레이리스트가 없습니다.</div>
        ) : (
          <>
            <ul className={styles.list}>
              {playlists.map((playlist) => (
                <li
                  key={playlist.playlistId}
                  className={`${styles.item} ${selectedId === playlist.playlistId ? styles.itemSelected : ''}`}
                  onClick={() => setSelectedId(playlist.playlistId)}
                >
                  <label className={styles.radioWrap}>
                    <input
                      type="radio"
                      name="playlist"
                      checked={selectedId === playlist.playlistId}
                      onChange={() => setSelectedId(playlist.playlistId)}
                      className={styles.radio}
                    />
                  </label>
                  <div
                    className={styles.thumb}
                    style={{
                      backgroundImage: playlist.thumbnailUrl
                        ? `url(${playlist.thumbnailUrl})`
                        : undefined,
                    }}
                  />
                  <div className={styles.info}>
                    <span className={styles.playlistTitle}>{playlist.title}</span>
                    <span className={styles.itemCount}>(곡 {playlist.itemCount}개)</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.registerBtn}
                onClick={handleRegister}
              >
                등록
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
