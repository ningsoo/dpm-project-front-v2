'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
} from '@/utils/youtubeUtils';
import {
  PlaylistSelectModal,
  type MyPlaylistItem,
} from './PlaylistSelectModal';
import styles from '../BoardFormLayout/BoardFormLayout.module.css';

function toBoardCategory(category: string): BoardCategory {
  const upper = category.toUpperCase();
  if (
    ['SHOWCASE', 'PLAYLISTS', 'SPOTLIGHT', 'COMMUNITY', 'REVIEWS'].includes(
      upper
    )
  ) {
    return upper as BoardCategory;
  }
  return 'SHOWCASE';
}

interface CreatePostProps {
  category: string;
}

export default function CreatePost({ category }: CreatePostProps) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeUrlError, setYoutubeUrlError] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<MyPlaylistItem | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const photoInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const dragPhotoIndex = useRef<number | null>(null);

  const SPOTLIGHT_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];
  const SPOTLIGHT_IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
  const COMMUNITY_ALLOWED_EXT = /\.(jpe?g|png|webp|pdf|txt|docx?|zip)$/i;
  const COMMUNITY_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  const titleOk = title.length >= 1 && title.length <= 40;
  const contentOk = content.length >= 1 && content.length <= 3000;

  const youtubeUrlOk =
    !!youtubeUrl.trim() && !youtubeUrlError && !!youtubeVideoId;

  const playlistIdOk =
    selectedPlaylist != null && selectedPlaylist.playlistId != null;

  const spotlightPhotosOk =
    photos.length >= 1 &&
    photos.length <= 5 &&
    photos.every(
      (f) =>
        SPOTLIGHT_IMAGE_TYPES.includes(f.type) ||
        SPOTLIGHT_IMAGE_EXT.test(f.name)
    );

  const isAttachmentAllowed = (file: File) =>
    COMMUNITY_IMAGE_TYPES.includes(file.type) ||
    COMMUNITY_ALLOWED_EXT.test(file.name);

  /* ---------------- YouTube ---------------- */

  const handleYoutubeUrlBlur = () => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setYoutubeVideoId('');
      return;
    }

    const id = extractYouTubeVideoId(trimmed);

    if (!id) {
      setYoutubeUrlError(
        '유효한 YouTube URL을 입력해주세요.'
      );
      setYoutubeVideoId('');
      return;
    }

    setYoutubeUrlError('');
    setYoutubeVideoId(id);
  };

  const handleYoutubeUrlChange = (value: string) => {
    setYoutubeUrl(value);
    setYoutubeUrlError('');
    setYoutubeVideoId('');
  };

  /* ---------------- Files ---------------- */

  const isImageFile = (file: File) =>
    SPOTLIGHT_IMAGE_TYPES.includes(file.type) ||
    SPOTLIGHT_IMAGE_EXT.test(file.name);

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).filter(isImageFile);
    setPhotos((p) => [...p, ...list].slice(0, 5));
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSpotlightDragStart = (index: number) => {
    dragPhotoIndex.current = index;
  };

  const handleSpotlightDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSpotlightDrop = (dropIndex: number) => {
    const from = dragPhotoIndex.current;
    if (from == null || from === dropIndex) return;
    setPhotos((prev) => {
      const arr = [...prev];
      const [removed] = arr.splice(from, 1);
      arr.splice(dropIndex, 0, removed);
      return arr;
    });
    dragPhotoIndex.current = null;
  };

  const handleSpotlightDragEnd = () => {
    dragPhotoIndex.current = null;
  };

  const handleAttachment = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAttachmentAllowed(file)) {
      ToastUtils.error('업로드 불가 형식');
      return;
    }

    setAttachmentFile(file);
  };

  /* ---------------- Submit ---------------- */

  /** 공통: createRequest Blob을 FormData에 붙이는 헬퍼 */
  const appendCreateRequest = (formData: FormData, payload: object) => {
    formData.append(
      'createRequest',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    // 1. 공통 유효성: title, content 필수
    if (!trimmedTitle || !trimmedContent) {
      setErrors((prev) => ({
        ...prev,
        title: !trimmedTitle ? '제목을 입력해주세요.' : '',
        content: !trimmedContent ? '내용을 입력해주세요.' : '',
      }));
      ToastUtils.error('제목과 내용을 입력해주세요.');
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const categoryType = toBoardCategory(category);

      switch (category) {
        case 'showcase': {
          if (!youtubeUrlOk) {
            ToastUtils.error('유효한 YouTube URL을 입력해주세요.');
            setLoading(false);
            return;
          }
          const formData = new FormData();
          appendCreateRequest(formData, {
            title: trimmedTitle,
            content: trimmedContent,
            youtubeUrl: youtubeUrl.trim(),
          });
          await boardApi.createPostShowcase(formData);
          break;
        }

        case 'playlists': {
          if (!playlistIdOk) {
            ToastUtils.error('플레이리스트를 선택해주세요.');
            setLoading(false);
            return;
          }
          const formData = new FormData();
          appendCreateRequest(formData, {
            title: trimmedTitle,
            content: trimmedContent,
            playlistId: selectedPlaylist!.playlistId,
          });
          await boardApi.createPostPlaylists(formData);
          break;
        }

        case 'spotlight': {
          if (!spotlightPhotosOk) {
            ToastUtils.error('사진을 1~5장 선택해주세요.');
            setLoading(false);
            return;
          }
          const formData = new FormData();
          appendCreateRequest(formData, {
            title: trimmedTitle,
            content: trimmedContent,
          });
          photos.forEach((file) => formData.append('files', file));
          await boardApi.createPostSpotlight(formData);
          break;
        }

        case 'community':
        case 'reviews': {
          const formData = new FormData();
          appendCreateRequest(formData, {
            title: trimmedTitle,
            content: trimmedContent,
          });
          if (attachmentFile) {
            formData.append('files', attachmentFile);
          }
          await boardApi.createPostWithFile(categoryType, formData);
          break;
        }

        default: {
          ToastUtils.error('지원하지 않는 카테고리입니다.');
          setLoading(false);
          return;
        }
      }

      // 201 Created 성공 시 해당 카테고리 목록으로 이동
      const listSlug = ['showcase', 'playlists', 'spotlight', 'community', 'reviews'].includes(category)
        ? category
        : 'showcase';
      router.push(`/boards/category/${listSlug}`);
    } catch {
      ToastUtils.error('글 등록 실패');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Render ---------------- */

  const safeCat = [
    'showcase',
    'playlists',
    'spotlight',
    'community',
    'reviews',
  ].includes(category)
    ? category
    : 'showcase';

  const formattedCategory =
    safeCat.charAt(0).toUpperCase() + safeCat.slice(1);

  return (
    <div className={styles.wrap}>
      <Link
        href={`/boards/category/${safeCat}`}
        className={styles.categoryLink}
      >
        <h1 className={styles.h1}>{formattedCategory}</h1>
      </Link>

      <form onSubmit={handleSubmit}>
        {/* 제목 */}
        <label className={styles.label}>
          제목
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />
        </label>

        {/* 내용 */}
        <label className={styles.label}>
          내용
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textarea}
          />
        </label>

        {/* Showcase: YouTube URL 입력 */}
        {category === 'showcase' && (
          <label className={styles.label}>
            YouTube URL
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v= 또는 https://youtu.be/"
              value={youtubeUrl}
              onChange={(e) => handleYoutubeUrlChange(e.target.value)}
              onBlur={handleYoutubeUrlBlur}
              className={styles.input}
            />
            {youtubeUrlError && (
              <span className={styles.error}>{youtubeUrlError}</span>
            )}
          </label>
        )}

        {/* Showcase: 썸네일 미리보기 */}
        {category === 'showcase' && youtubeVideoId && (
          <div className={styles.thumbPreview}>
            <img
              src={getYouTubeThumbnailUrl(
                youtubeVideoId,
                'hqdefault'
              )}
              alt=""
            />
          </div>
        )}

        {/* Playlists: 플레이리스트 선택 + 미리보기 */}
        {category === 'playlists' && (
          <div className={styles.label}>
            플레이리스트
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => setShowPlaylistModal(true)}
            >
              등록
            </button>
            {selectedPlaylist && (
              <div className={styles.playlistPreview}>
                <div
                  className={styles.playlistPreviewThumb}
                  style={{
                    backgroundImage: selectedPlaylist.thumbnailUrl
                      ? `url(${selectedPlaylist.thumbnailUrl})`
                      : undefined,
                  }}
                />
                <div className={styles.playlistPreviewInfo}>
                  <span className={styles.playlistPreviewTitle}>
                    {selectedPlaylist.title}
                  </span>
                  <span className={styles.playlistPreviewCount}>
                    {selectedPlaylist.itemCount != null
                      ? `곡 ${selectedPlaylist.itemCount}개`
                      : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spotlight: 파일선택 + 썸네일 미리보기 */}
        {category === 'spotlight' && (
          <div className={styles.label}>
            사진 (1~5장)
            <input
              ref={photoInputRef}
              type="file"
              multiple
              hidden
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handlePhotos}
            />
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => photoInputRef.current?.click()}
            >
              파일 선택
            </button>
            {photos.length > 0 && (
              <div className={styles.spotlightThumbList}>
                {photos.map((file, i) => (
                  <div
                    key={i}
                    className={`${styles.spotlightThumbItem}${i === 0 ? ` ${styles.spotlightThumbItemFirst}` : ''}`}
                    draggable
                    onDragStart={() => handleSpotlightDragStart(i)}
                    onDragOver={handleSpotlightDragOver}
                    onDrop={() => handleSpotlightDrop(i)}
                    onDragEnd={handleSpotlightDragEnd}
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`미리보기 ${i + 1}`}
                      draggable={false}
                    />
                    <button
                      type="button"
                      className={styles.spotlightThumbRemove}
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(i);
                      }}
                      aria-label="삭제"
                    >
                      ×
                    </button>
                    <span className={styles.spotlightThumbOrder}>
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Community / Reviews: 첨부 + 미리보기 */}
        {['community', 'reviews'].includes(category) && (
          <div className={styles.label}>
            첨부
            <input
              ref={attachmentInputRef}
              type="file"
              hidden
              onChange={handleAttachment}
            />
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => attachmentInputRef.current?.click()}
            >
              선택
            </button>
            {attachmentFile && (
              <div className={styles.attachmentPreview}>
                {SPOTLIGHT_IMAGE_TYPES.includes(attachmentFile.type) ||
                SPOTLIGHT_IMAGE_EXT.test(attachmentFile.name) ? (
                  <img
                    src={URL.createObjectURL(attachmentFile)}
                    alt=""
                    className={styles.attachmentThumb}
                  />
                ) : (
                  <span className={styles.attachmentIcon} aria-hidden>
                    📄
                  </span>
                )}
                <span className={styles.attachmentName}>
                  {attachmentFile.name}
                </span>
                <button
                  type="button"
                  className={styles.attachmentRemove}
                  onClick={() => setAttachmentFile(null)}
                  aria-label="첨부 삭제"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        <div className={styles.btnGroup}>
          <Link
            href={`/boards/category/${safeCat}`}
            className={`${styles.btn} ${styles.cancel}`}
          >
            취소
          </Link>
          <button
            type="submit"
            className={`${styles.btn} ${styles.submit}`}
            disabled={loading}
          >
            {loading ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>

      <PlaylistSelectModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        onSelect={(playlist) =>
          setSelectedPlaylist(playlist)
        }
      />
    </div>
  );
}
