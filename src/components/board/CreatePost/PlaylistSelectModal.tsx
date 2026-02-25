'use client';

import { useId, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useNonce } from '@/contexts/NonceContext';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './PlaylistSelectModal.module.css';

function escapeCssUrl(url: string): string {
  return url.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

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
  const router = useRouter();
  const nonce = useNonce();
  const baseId = useId().replace(/:/g, '');
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
        const normalized = playlistArray.map((p: Record<string, unknown>) => ({
          ...p,
          playlistId: Number(p.playlistId ?? p.playlist_id ?? 0),
          title: String(p.title ?? ''),
          thumbnailUrl: String(p.thumbnailUrl ?? p.thumbnail_url ?? ''),
          itemCount: Number(p.itemCount ?? p.item_count ?? 0),
          youtubeListId: String(p.youtubeListId ?? p.youtube_list_id ?? ''),
        })) as MyPlaylistItem[];
        setPlaylists(normalized);
      } else {
        setPlaylists([]);
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setPlaylists([]);
      } else {
        ToastUtils.error('플레이리스트를 불러오는데 실패했습니다.');
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (selectedId == null) {
      ToastUtils.error('플레이리스트를 선택해주세요.');
      return;
    }
    const playlist = playlists.find((p) => p.playlistId === selectedId);
    if (!playlist) return;

    let thumbnailUrl = playlist.thumbnailUrl ?? (playlist as unknown as Record<string, unknown>).thumbnail_url as string | undefined;
    try {
      const res = await mypageApi.getPlaylistTracks(playlist.playlistId);
      const tracks = Array.isArray(res?.data?.data) ? (res.data.data as Record<string, unknown>[]) : [];
      const first = tracks[0];
      const trackThumb = first ? String(first.thumbnailUrl ?? first.thumbnail_url ?? '') : '';
      if (trackThumb) thumbnailUrl = trackThumb;
    } catch {
      // 트랙 조회 실패 시 기존 thumbnailUrl 유지
    }
    onSelect({ ...playlist, thumbnailUrl: thumbnailUrl ?? '' });
    onClose();
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
          <div className={styles.empty}>
            <p className={styles.emptyMessage}>저장된 플레이리스트가 없습니다. 마이페이지로 이동하시겠습니까?</p>
            <div className={styles.emptyButtons}>
              <button type="button" className={styles.emptyBtnYes} onClick={() => { onClose(); router.push('/mypage'); }}>
                예
              </button>
              <button type="button" className={styles.emptyBtnNo} onClick={onClose}>
                아니요
              </button>
            </div>
          </div>
        ) : (
          <>
            {(() => {
              const thumbRules = playlists
                .map((playlist, index) => {
                  const thumbUrl = playlist.thumbnailUrl;
                  if (!nonce || !thumbUrl) return '';
                  return `.psm-thumb-${baseId}-${index}{background-image:url('${escapeCssUrl(thumbUrl)}');}`;
                })
                .filter(Boolean);
              return (
                <>
                  {nonce && thumbRules.length > 0 && (
                    <style
                      nonce={nonce}
                      dangerouslySetInnerHTML={{ __html: thumbRules.join('') }}
                    />
                  )}
                </>
              );
            })()}
            <ul className={styles.list}>
              {playlists.map((playlist, index) => {
                const thumbClass = `psm-thumb-${baseId}-${index}`;
                const thumbUrl = playlist.thumbnailUrl;
                return (
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
                      className={`${styles.thumb} ${nonce && thumbUrl ? thumbClass : ''}`}
                      style={
                        !nonce && thumbUrl
                          ? { backgroundImage: `url(${thumbUrl})` }
                          : undefined
                      }
                    />
                    <div className={styles.info}>
                      <span className={styles.playlistTitle}>{playlist.title}</span>
                      <span className={styles.itemCount}>(곡 {playlist.itemCount}개)</span>
                    </div>
                  </li>
                );
              })}
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
