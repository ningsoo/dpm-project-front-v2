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
import styles from './CreatePost.module.css';

function toBoardCategory(category: string): BoardCategory {
  const upper = category.toUpperCase();
  if (['SHOWCASE', 'PLAYLISTS', 'SPOTLIGHT', 'COMMUNITY', 'REVIEWS'].includes(upper)) {
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
  const [selectedPlaylist, setSelectedPlaylist] = useState<MyPlaylistItem | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const SPOTLIGHT_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const SPOTLIGHT_IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
  const COMMUNITY_ALLOWED_EXT = /\.(jpe?g|png|webp|pdf|txt|docx?|zip)$/i;
  const COMMUNITY_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const titleOk = title.length >= 1 && title.length <= 40;
  const contentOk = content.length >= 1 && content.length <= 3000;
  const youtubeUrlOk = !!youtubeUrl.trim() && !youtubeUrlError && !!youtubeVideoId;
  const playlistIdOk = selectedPlaylist != null && selectedPlaylist.playlistId != null;
  const spotlightPhotosOk =
    photos.length >= 1 &&
    photos.length <= 5 &&
    photos.every((f) => SPOTLIGHT_IMAGE_TYPES.includes(f.type) || SPOTLIGHT_IMAGE_EXT.test(f.name));
  const isAttachmentAllowed = (file: File) =>
    COMMUNITY_IMAGE_TYPES.includes(file.type) || COMMUNITY_ALLOWED_EXT.test(file.name);

  const handleYoutubeUrlBlur = () => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setYoutubeUrlError('');
      setYoutubeVideoId('');
      return;
    }
    const videoId = extractYouTubeVideoId(trimmed);
    if (!videoId) {
      setYoutubeUrlError('유효한 YouTube URL을 입력해주세요. (youtube.com/watch?v= 또는 youtu.be 형식)');
      setYoutubeVideoId('');
      return;
    }
    setYoutubeUrlError('');
    setYoutubeVideoId(videoId);
  };

  const handleYoutubeUrlChange = (value: string) => {
    setYoutubeUrl(value);
    if (youtubeUrlError || youtubeVideoId) {
      setYoutubeUrlError('');
      setYoutubeVideoId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (category === 'showcase') {
      if (!titleOk || !contentOk || !youtubeUrlOk) {
        setErrors({
          title: !titleOk ? '1~40자' : '',
          content: !contentOk ? '1~3000자' : '',
          youtube: !youtubeUrlOk
            ? (youtubeUrlError || (youtubeUrl.trim() ? '' : 'YouTube URL은 필수입니다.'))
            : '',
        });
        return;
      }
    } else if (category === 'spotlight') {
      if (!titleOk || !contentOk || !spotlightPhotosOk) {
        setErrors({
          title: !titleOk ? '1~40자' : '',
          content: !contentOk ? '1~3000자' : '',
          photos:
            photos.length === 0
              ? '이미지를 1장 이상 선택해주세요.'
              : photos.length > 5
                ? '이미지는 최대 5장까지 등록 가능합니다.'
                : !photos.every((f) => SPOTLIGHT_IMAGE_TYPES.includes(f.type) || SPOTLIGHT_IMAGE_EXT.test(f.name))
                  ? 'jpg, jpeg, png, webp 형식만 업로드 가능합니다.'
                  : '',
        });
        return;
      }
    } else if (category === 'playlists') {
      if (!titleOk || !contentOk || !playlistIdOk) {
        setErrors({
          title: !titleOk ? '1~40자' : '',
          content: !contentOk ? '1~3000자' : '',
          playlist: !playlistIdOk ? '플레이리스트를 선택해주세요.' : '',
        });
        return;
      }
    } else if (['community', 'reviews'].includes(category)) {
      if (!titleOk || !contentOk) {
        setErrors({
          title: !titleOk ? '1~40자' : '',
          content: !contentOk ? '1~3000자' : '',
        });
        return;
      }
      if (attachmentFile && !isAttachmentAllowed(attachmentFile)) {
        setErrors({
          attachment: 'jpg, jpeg, png, webp, pdf, txt, doc, docx, zip 형식만 업로드 가능합니다.',
        });
        return;
      }
    } else if (!titleOk || !contentOk) {
      setErrors({
        title: !titleOk ? '1~40자' : '',
        content: !contentOk ? '1~3000자' : '',
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const categoryType = toBoardCategory(category);

      if (category === 'showcase') {
        const trimmedYoutubeUrl = youtubeUrl?.trim() ?? '';
        if (!trimmedYoutubeUrl) {
          setErrors((prev) => ({ ...prev, youtube: 'YouTube URL은 필수입니다.' }));
          setLoading(false);
          return;
        }
        const createRequest = {
          title: title.trim(),
          content: content.trim(),
          youtubeUrl: trimmedYoutubeUrl,
        };
        const formData = new FormData();
        const blob = new Blob([JSON.stringify(createRequest)], {
          type: 'application/json',
        });
        formData.append('createRequest', blob);
        const { data } = await boardApi.createPostShowcase(formData);
        const boardId = typeof data?.data === 'string' ? data.data : '';
        router.push(boardId ? `/boards/${boardId}` : `/boards/category/showcase`);
      } else if (category === 'spotlight') {
        if (photos.length < 1 || photos.length > 5) {
          setErrors((prev) => ({
            ...prev,
            photos:
              photos.length === 0 ? '이미지를 1장 이상 선택해주세요.' : '이미지는 최대 5장까지 등록 가능합니다.',
          }));
          setLoading(false);
          return;
        }
        const createRequest = { title: title.trim(), content: content.trim() };
        const formData = new FormData();
        formData.append(
          'createRequest',
          new Blob([JSON.stringify(createRequest)], { type: 'application/json' })
        );
        photos.forEach((file) => formData.append('files', file));
        const { data } = await boardApi.createPostSpotlight(formData);
        const boardId = typeof data?.data === 'string' ? data.data : '';
        router.push(boardId ? `/boards/${boardId}` : `/boards/category/spotlight`);
      } else if (category === 'playlists') {
        if (!selectedPlaylist?.playlistId) {
          setErrors((prev) => ({ ...prev, playlist: '플레이리스트를 선택해주세요.' }));
          setLoading(false);
          return;
        }
        const createRequest = {
          title: title.trim(),
          content: content.trim(),
          playlistId: selectedPlaylist.playlistId,
        };
        const formData = new FormData();
        const blob = new Blob([JSON.stringify(createRequest)], {
          type: 'application/json',
        });
        formData.append('createRequest', blob);
        const { data } = await boardApi.createPostPlaylists(formData);
        const boardId = typeof data?.data === 'string' ? data.data : '';
        router.push(boardId ? `/boards/${boardId}` : `/boards/category/playlists`);
      } else if (['community', 'reviews'].includes(category)) {
        const createRequest = { title: title.trim(), content: content.trim() };
        const formData = new FormData();
        formData.append(
          'createRequest',
          new Blob([JSON.stringify(createRequest)], { type: 'application/json' })
        );
        if (attachmentFile) {
          formData.append('files', attachmentFile);
        }
        const { data } = await boardApi.createPostWithFile(categoryType, formData);
        const boardId = typeof data?.data === 'string' ? data.data : '';
        router.push(boardId ? `/boards/${boardId}` : `/boards/category/${category}`);
      } else {
        const { data } = await boardApi.createPost(categoryType, {
          title,
          content,
          category: categoryType,
        });
        const boardId = typeof data?.data === 'string' ? data.data : '';
        router.push(boardId ? `/boards/${boardId}` : `/boards/category/${category}`);
      }
    } catch {
      ToastUtils.error('글 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isImageFile = (file: File) =>
    SPOTLIGHT_IMAGE_TYPES.includes(file.type) || SPOTLIGHT_IMAGE_EXT.test(file.name);

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).filter(isImageFile);
    setPhotos((p) => [...p, ...list].slice(0, 5));
    setErrors((prev) => ({ ...prev, photos: '' }));
    e.target.value = '';
  };

  const dragPhotoIndex = useRef<number | null>(null);

  const handlePhotoDragStart = (index: number) => {
    dragPhotoIndex.current = index;
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePhotoDrop = (dropIndex: number) => {
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

  const handlePhotoDragEnd = () => {
    dragPhotoIndex.current = null;
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const file = list[list.length - 1];
    if (!file) return;
    if (!isAttachmentAllowed(file)) {
      ToastUtils.error('jpg, jpeg, png, webp, pdf, txt, doc, docx, zip 형식만 업로드 가능합니다.');
      e.target.value = '';
      return;
    }
    setAttachmentFile(file);
    setErrors((prev) => ({ ...prev, attachment: '' }));
    e.target.value = '';
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
  };

  const isImageAttachment = (file: File) =>
    COMMUNITY_IMAGE_TYPES.includes(file.type) || SPOTLIGHT_IMAGE_EXT.test(file.name);

  const safeCat = ['showcase', 'playlists', 'spotlight', 'community', 'reviews'].includes(category)
    ? category
    : 'showcase';

    const formattedCategory =
    safeCat.charAt(0).toUpperCase() + safeCat.slice(1);
    

    
  return (
    <div className={styles.wrap}>
      <h1 className={styles.h1}>{formattedCategory}</h1>

      <form onSubmit={handleSubmit}>
        <label className={styles.label}>
          제목 (1~40자)
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />
          {errors.title && <span className={styles.error}>{errors.title}</span>}
        </label>

        {category === 'showcase' && (
          <label className={styles.label}>
            YouTube URL (필수)
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v= 또는 https://youtu.be/"
              value={youtubeUrl}
              onChange={(e) => handleYoutubeUrlChange(e.target.value)}
              onBlur={handleYoutubeUrlBlur}
              className={styles.input}
            />
            <span className={styles.helper}>Share your video</span>
            {(youtubeUrlError || errors.youtube) && (
              <span className={styles.error}>{youtubeUrlError || errors.youtube}</span>
            )}
            {youtubeVideoId && !youtubeUrlError && (
              <div className={styles.thumbPreview}>
                <img
                  src={getYouTubeThumbnailUrl(youtubeVideoId, 'hqdefault')}
                  alt="YouTube 썸네일 미리보기"
                />
              </div>
            )}
          </label>
        )}

        {category === 'playlists' && (
          <label className={styles.label}>
            플레이리스트 (필수)
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => setShowPlaylistModal(true)}
            >
              플레이리스트 선택
            </button>
            {errors.playlist && (
              <span className={styles.error}>{errors.playlist}</span>
            )}
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
                    (곡 {selectedPlaylist.itemCount}개)
                  </span>
                </div>
              </div>
            )}
          </label>
        )}

        {category === 'playlists' && (
          <PlaylistSelectModal
            isOpen={showPlaylistModal}
            onClose={() => setShowPlaylistModal(false)}
            onSelect={(playlist) => {
              setSelectedPlaylist(playlist);
              setErrors((prev) => ({ ...prev, playlist: '' }));
            }}
          />
        )}

        {category === 'spotlight' && (
          <label className={styles.label}>
            사진 (필수, 1~5장)
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotos}
            />
            <span className={styles.helper}>jpg, jpeg, png, webp 형식만 업로드 가능합니다. 첫 사진이 메인에 사용됩니다.</span>
            {errors.photos && <span className={styles.error}>{errors.photos}</span>}
            {photos.length > 0 && (
              <div className={styles.spotlightThumbList}>
                {photos.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className={styles.spotlightThumbItem}
                    draggable
                    onDragStart={() => handlePhotoDragStart(index)}
                    onDragOver={handlePhotoDragOver}
                    onDrop={() => handlePhotoDrop(index)}
                    onDragEnd={handlePhotoDragEnd}
                  >
                    <img src={URL.createObjectURL(file)} alt={`미리보기 ${index + 1}`} />
                    <button
                      type="button"
                      className={styles.spotlightThumbRemove}
                      onClick={() => removePhoto(index)}
                      aria-label="삭제"
                    >
                      ×
                    </button>
                    <span className={styles.spotlightThumbOrder}>{index + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </label>
        )}

        {['community', 'reviews'].includes(category) && (
          <label className={styles.label}>
            첨부 (선택, 1개)
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx,.zip,image/jpeg,image/png,image/webp"
              onChange={handleAttachment}
            />
            <span className={styles.helper}>이미지(jpg, png, webp) 또는 일반 파일(pdf, txt, doc, docx, zip)</span>
            {errors.attachment && <span className={styles.error}>{errors.attachment}</span>}
            {attachmentFile && (
              <div className={styles.attachmentPreview}>
                {isImageAttachment(attachmentFile) ? (
                  <>
                    <img src={URL.createObjectURL(attachmentFile)} alt="" className={styles.attachmentThumb} />
                    <span className={styles.attachmentName}>{attachmentFile.name}</span>
                  </>
                ) : (
                  <>
                    <span className={styles.attachmentIcon} aria-hidden>📄</span>
                    <span className={styles.attachmentName}>{attachmentFile.name}</span>
                  </>
                )}
                <button
                  type="button"
                  className={styles.attachmentRemove}
                  onClick={removeAttachment}
                  aria-label="첨부 삭제"
                >
                  ×
                </button>
              </div>
            )}
          </label>
        )}

        <label className={styles.label}>
          내용 (1~3000자)
          <textarea
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textarea}
          />
          {errors.content && <span className={styles.error}>{errors.content}</span>}
        </label>

        <div className={styles.btnGroup}>
          <Link href={`/boards/category/${safeCat}`} className={`${styles.btn} ${styles.cancel}`}>
            취소
          </Link>
          <button
            type="submit"
            className={`${styles.btn} ${styles.submit}`}
            disabled={
              loading ||
              (category === 'showcase'
                ? !titleOk || !contentOk || !youtubeUrlOk
                : category === 'playlists'
                  ? !titleOk || !contentOk || !playlistIdOk
                  : category === 'spotlight'
                    ? !titleOk || !contentOk || !spotlightPhotosOk
                    : !titleOk || !contentOk)
            }
          >
            {loading ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
