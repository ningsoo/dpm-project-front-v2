'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { boardApi } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '@/utils/youtubeUtils';
import { PlaylistSelectModal, type MyPlaylistItem } from '@/components/board/CreatePost/PlaylistSelectModal';
import styles from './EditPost.module.css';

interface EditPostProps {
  category: string;
  boardId: string;
}

/** SPOTLIGHT 이미지 아이템 (기존 또는 신규) */
type SpotlightImageItem =
  | { type: 'existing'; url: string; imageId: number }
  | { type: 'new'; file: File; tempId: string };

/** COMMUNITY/REVIEWS 첨부파일 응답 타입 */
interface BoardAttachment {
  attachmentId?: number;
  attachmentid?: number;
  filekey?: string;
  originalFilename?: string;
}

/** 상세조회 응답 data 타입 */
interface BoardDetailData {
  title?: string | null;
  content?: string | null;
  linkUrl?: string | null;
  fileUrl?: string | null;
  categoryType?: string;
  playlistId?: number | string | null;
  playlistTitle?: string | null;
  playlistItems?: { thumbnailUrl?: string }[] | null;
  imageUrls?: string[] | null;
  imageIds?: (number | string)[] | null;
  attachmentIds?: (number | string)[] | null;
  attachment?: BoardAttachment | null;
}

const SPOTLIGHT_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const SPOTLIGHT_IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const COMMUNITY_ALLOWED_EXT = /\.(jpe?g|png|webp|pdf|txt|docx?|zip)$/i;

export default function EditPost({ category, boardId }: EditPostProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeUrlError, setYoutubeUrlError] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<MyPlaylistItem | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [imageItems, setImageItems] = useState<SpotlightImageItem[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [communityExistingAttachment, setCommunityExistingAttachment] = useState<{
    attachmentId: number;
    originalFilename: string;
  } | null>(null);
  const [communityNewAttachmentFile, setCommunityNewAttachmentFile] = useState<File | null>(null);
  const [communityDeleteAttachmentIds, setCommunityDeleteAttachmentIds] = useState<number[]>([]);
  const [communityLoadMode, setCommunityLoadMode] = useState<'image' | 'attachment' | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resolvedCategory, setResolvedCategory] = useState<string>(category || 'showcase');

  const dragPhotoIndex = useRef<number | null>(null);

  const safeCat = ['showcase', 'playlists', 'spotlight', 'community', 'reviews'].includes(
    resolvedCategory?.toLowerCase()
  )
    ? resolvedCategory.toLowerCase()
    : 'showcase';

  const isShowcase = resolvedCategory?.toLowerCase() === 'showcase';
  const isPlaylists = resolvedCategory?.toLowerCase() === 'playlists';
  const isSpotlight = resolvedCategory?.toLowerCase() === 'spotlight';
  const isCommunityOrReviews =
    resolvedCategory?.toLowerCase() === 'community' || resolvedCategory?.toLowerCase() === 'reviews';

  const spotlightPhotosOk =
    imageItems.length >= 1 &&
    imageItems.length <= 5;

  // SHOWCASE: title 1~40, content 1~3000, youtubeUrl 필수
  const titleOk = title.length >= 1 && title.length <= 40;
  const contentOk = content.length >= 1 && content.length <= 3000;
  const youtubeUrlOk = !!youtubeUrl.trim() && !youtubeUrlError && !!youtubeVideoId;
  const playlistIdOk = selectedPlaylist != null && selectedPlaylist.playlistId != null;

  // 상세조회 API 호출 → 폼 초기값 세팅
  useEffect(() => {
    if (!boardId) {
      setFetching(false);
      return;
    }
    boardApi
      .getPost(boardId)
      .then(({ data }) => {
        const d = data?.data as BoardDetailData | undefined;
        if (!d || typeof d !== 'object') return;

        const cat = String(d.categoryType ?? category ?? 'SHOWCASE').toUpperCase();
        setResolvedCategory(cat);

        const t = String(d.title ?? '').trim();
        const c = String(d.content ?? '').trim();
        const link = String(d.linkUrl ?? d.fileUrl ?? '').trim();

        setTitle(t);
        setContent(c);
        setYoutubeUrl(link);

        if (cat === 'SHOWCASE' && link) {
          const videoId = extractYouTubeVideoId(link);
          if (videoId) {
            setYoutubeVideoId(videoId);
            setYoutubeUrlError('');
          }
        }

        if (cat === 'PLAYLISTS') {
          const pid = d.playlistId;
          const pt = d.playlistTitle ?? '';
          const items = d.playlistItems ?? [];
          const thumb =
            (items[0] as { thumbnailUrl?: string } | undefined)?.thumbnailUrl ?? '';
          if (pid != null && (pt || items.length > 0)) {
            setSelectedPlaylist({
              playlistId: Number(pid),
              youtubeListId: '',
              title: String(pt),
              thumbnailUrl: thumb,
              itemCount: items.length,
            });
          }
        }

        if (cat === 'SPOTLIGHT') {
          const urls = (d.imageUrls ?? []).filter((u): u is string => typeof u === 'string' && u.trim() !== '');
          const ids = (d.imageIds ?? d.attachmentIds ?? []) as (number | string)[];
          const items: SpotlightImageItem[] = urls.map((url, i) => ({
            type: 'existing',
            url,
            imageId: typeof ids[i] === 'number' ? ids[i] : Number(ids[i]) || i,
          }));
          setImageItems(items);
          setDeletedImageIds([]);
        }

        if (cat === 'COMMUNITY' || cat === 'REVIEWS') {
          const urls = (d.imageUrls ?? []).filter((u): u is string => typeof u === 'string' && u.trim() !== '');
          const att = d.attachment;
          const attId = att?.attachmentId ?? (att as { attachmentid?: number })?.attachmentid;
          const attName = att?.originalFilename ?? '';

          if (urls.length > 0) {
            const ids = (d.imageIds ?? d.attachmentIds ?? []) as (number | string)[];
            const items: SpotlightImageItem[] = urls.map((url, i) => ({
              type: 'existing',
              url,
              imageId: typeof ids[i] === 'number' ? ids[i] : Number(ids[i]) || i,
            }));
            setImageItems(items);
            setDeletedImageIds([]);
            setCommunityLoadMode('image');
            setCommunityExistingAttachment(null);
            setCommunityDeleteAttachmentIds([]);
          } else if (attId != null && attName) {
            setCommunityExistingAttachment({
              attachmentId: Number(attId),
              originalFilename: String(attName),
            });
            setCommunityLoadMode('attachment');
            setImageItems([]);
            setDeletedImageIds([]);
            setCommunityDeleteAttachmentIds([]);
          } else {
            setCommunityLoadMode(null);
          }
        }
      })
      .catch(() => ToastUtils.error('글을 불러올 수 없습니다'))
      .finally(() => setFetching(false));
  }, [boardId, category]);

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

  const isSpotlightImageFile = (file: File) =>
    SPOTLIGHT_IMAGE_TYPES.includes(file.type) || SPOTLIGHT_IMAGE_EXT.test(file.name);

  const handleSpotlightPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).filter(isSpotlightImageFile);
    const toAdd = list.slice(0, Math.max(0, 5 - imageItems.length));
    if (toAdd.length < list.length) {
      ToastUtils.error('최대 5장까지 등록 가능합니다.');
    }
    setImageItems((prev) =>
      [...prev, ...toAdd.map((f, i) => ({ type: 'new' as const, file: f, tempId: `new-${Date.now()}-${i}` }))].slice(0, 5)
    );
    setErrors((prev) => ({ ...prev, photos: '' }));
    e.target.value = '';
  };

  const removeSpotlightImage = (index: number) => {
    const item = imageItems[index];
    if (item?.type === 'existing') {
      setDeletedImageIds((prev) => [...prev, item.imageId]);
    }
    setImageItems((prev) => prev.filter((_, i) => i !== index));
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
    setImageItems((prev) => {
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

  const isCommunityAttachmentAllowed = (file: File) =>
    SPOTLIGHT_IMAGE_TYPES.includes(file.type) || COMMUNITY_ALLOWED_EXT.test(file.name);

  const isCommunityImageAttachment = (file: File) =>
    SPOTLIGHT_IMAGE_TYPES.includes(file.type) || SPOTLIGHT_IMAGE_EXT.test(file.name);

  const handleCommunityAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const file = list[list.length - 1];
    if (!file) return;
    if (!isCommunityAttachmentAllowed(file)) {
      ToastUtils.error('jpg, jpeg, png, webp, pdf, txt, doc, docx, zip 형식만 업로드 가능합니다.');
      e.target.value = '';
      return;
    }
    if (communityExistingAttachment) {
      setCommunityDeleteAttachmentIds((prev) => [...prev, communityExistingAttachment.attachmentId]);
      setCommunityExistingAttachment(null);
    }
    setCommunityNewAttachmentFile(file);
    setErrors((prev) => ({ ...prev, attachment: '' }));
    e.target.value = '';
  };

  const removeCommunityAttachment = () => {
    if (communityNewAttachmentFile) {
      setCommunityNewAttachmentFile(null);
    } else if (communityExistingAttachment) {
      setCommunityDeleteAttachmentIds((prev) => [...prev, communityExistingAttachment.attachmentId]);
      setCommunityExistingAttachment(null);
    }
  };

  const handleCommunityImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).filter(isSpotlightImageFile);
    const toAdd = list.slice(0, Math.max(0, 5 - imageItems.length));
    if (toAdd.length < list.length) {
      ToastUtils.error('최대 5장까지 등록 가능합니다.');
    }
    setImageItems((prev) =>
      [...prev, ...toAdd.map((f, i) => ({ type: 'new' as const, file: f, tempId: `new-${Date.now()}-${i}` }))].slice(0, 5)
    );
    setErrors((prev) => ({ ...prev, photos: '' }));
    e.target.value = '';
  };

  const removeCommunityImage = (index: number) => {
    const item = imageItems[index];
    if (item?.type === 'existing') {
      setDeletedImageIds((prev) => [...prev, item.imageId]);
    }
    setImageItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isShowcase) {
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
    } else if (isPlaylists) {
      if (!titleOk || !contentOk || !playlistIdOk) {
        setErrors({
          title: !titleOk ? '1~40자' : '',
          content: !contentOk ? '1~3000자' : '',
          playlist: !playlistIdOk ? '플레이리스트를 선택해주세요.' : '',
        });
        return;
      }
    } else if (isSpotlight) {
      if (!titleOk || !contentOk || !spotlightPhotosOk) {
        setErrors({
          title: !titleOk ? '1~40자' : '',
          content: !contentOk ? '1~3000자' : '',
          photos:
            imageItems.length === 0
              ? '이미지를 1장 이상 선택해주세요.'
              : imageItems.length > 5
                ? '이미지는 최대 5장까지 등록 가능합니다.'
                : '',
        });
        return;
      }
    } else {
      if (!titleOk || !contentOk) {
        setErrors({
          title: !titleOk ? '1~40자' : '',
          content: !contentOk ? '1~3000자' : '',
        });
        return;
      }
    }

    setLoading(true);
    setErrors({});

    try {
      if (isShowcase) {
        const trimmedYoutubeUrl = youtubeUrl?.trim() ?? '';
        const requestData = {
          title: title.trim(),
          content: content.trim(),
          youtubeUrl: trimmedYoutubeUrl,
        };
        const formData = new FormData();
        formData.append(
          'data',
          new Blob([JSON.stringify(requestData)], { type: 'application/json' })
        );
        await boardApi.updatePostShowcase(boardId, formData);
      } else if (isPlaylists) {
        const playlistId = selectedPlaylist?.playlistId ?? 0;
        const requestData = {
          title: title.trim(),
          content: content.trim(),
          playlistId: Number(playlistId),
        };
        const formData = new FormData();
        formData.append(
          'data',
          new Blob([JSON.stringify(requestData)], { type: 'application/json' })
        );
        await boardApi.updatePostPlaylists(boardId, formData);
      } else if (isSpotlight) {
        let newFileIndex = 0;
        const imageOrder = imageItems.map((it) =>
          it.type === 'existing' ? `existing_${it.imageId}` : `new_${newFileIndex++}`
        );
        const newFiles = imageItems.filter((it): it is { type: 'new'; file: File; tempId: string } => it.type === 'new').map((it) => it.file);
        const requestData = { title: title.trim(), content: content.trim() };
        const fd = new FormData();
        fd.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }));
        deletedImageIds.forEach((id) => fd.append('deleteIds', String(id)));
        imageOrder.forEach((order) => fd.append('imageOrder', order));
        newFiles.forEach((file) => fd.append('files', file));
        await boardApi.updatePostSpotlight(boardId, fd);
      } else if (isCommunityOrReviews) {
        const requestData = { title: title.trim(), content: content.trim() };
        const fd = new FormData();
        fd.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }));
        const allDeleteIds = [
          ...deletedImageIds,
          ...communityDeleteAttachmentIds,
        ];
        
        allDeleteIds.forEach((id) => fd.append('deleteIds', String(id)));
        if (communityLoadMode === 'image') {
          const newFiles = imageItems
            .filter((it): it is { type: 'new'; file: File; tempId: string } => it.type === 'new')
            .map((it) => it.file);
          newFiles.forEach((file) => fd.append('files', file));
        } else if (communityNewAttachmentFile) {
          fd.append('files', communityNewAttachmentFile);
        }
        await boardApi.updatePostCommunityReviews(boardId, fd);
      } else {
        await boardApi.updatePost(boardId, {
          title: title.trim(),
          content: content.trim(),
          fileUrl: (youtubeUrl || '').trim(),
        });
      }

      ToastUtils.success('수정되었습니다.');
      router.push(`/boards/${boardId}`);
    } catch {
      ToastUtils.error('수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className={styles.loading}>로딩 중…</div>;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.h1}>글 수정 · {safeCat}</h1>

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

        {isShowcase && (
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

        {isPlaylists && (
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

        {isSpotlight && (
          <div className={styles.label}>
            <span>사진 (필수, 1~5장)</span>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id="edit-spotlight-photos-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                onChange={handleSpotlightPhotos}
                className={styles.fileInputHidden}
              />
              <label htmlFor="edit-spotlight-photos-input" className={styles.fileSelectBtn}>
                파일선택
              </label>
            </div>
            <span className={styles.helper}>jpg, jpeg, png, webp 형식만 업로드 가능합니다. 첫 사진이 메인에 사용됩니다. 드래그하여 순서 변경 가능.</span>
            {errors.photos && <span className={styles.error}>{errors.photos}</span>}
            {imageItems.length > 0 && (
              <div className={styles.spotlightThumbList}>
                {imageItems.map((item, index) => (
                  <div
                    key={item.type === 'existing' ? `ex-${item.imageId}` : item.tempId}
                    className={styles.spotlightThumbItem}
                    draggable
                    onDragStart={() => handleSpotlightDragStart(index)}
                    onDragOver={handleSpotlightDragOver}
                    onDrop={() => handleSpotlightDrop(index)}
                    onDragEnd={handleSpotlightDragEnd}
                  >
                    <img
                      src={item.type === 'existing' ? item.url : URL.createObjectURL(item.file)}
                      alt={`미리보기 ${index + 1}`}
                    />
                    <button
                      type="button"
                      className={styles.spotlightThumbRemove}
                      onClick={() => removeSpotlightImage(index)}
                      aria-label="삭제"
                    >
                      ×
                    </button>
                    <span className={styles.spotlightThumbOrder}>{index + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

        {isCommunityOrReviews && communityLoadMode === 'image' && (
          <div className={styles.label}>
            <span>사진 (선택)</span>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id="edit-community-photos-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                onChange={handleCommunityImages}
                className={styles.fileInputHidden}
              />
              <label htmlFor="edit-community-photos-input" className={styles.fileSelectBtn}>
                파일선택
              </label>
            </div>
            <span className={styles.helper}>
              jpg, jpeg, png, webp 형식. 삭제/교체 시 기존 이미지는 삭제됩니다. 신규 업로드 가능.
            </span>
            {imageItems.length > 0 && (
              <div className={styles.spotlightThumbList}>
                {imageItems.map((item, index) => (
                  <div
                    key={item.type === 'existing' ? `ex-${item.imageId}` : item.tempId}
                    className={styles.spotlightThumbItem}
                  >
                    <img
                      src={item.type === 'existing' ? item.url : URL.createObjectURL(item.file)}
                      alt={`미리보기 ${index + 1}`}
                    />
                    <button
                      type="button"
                      className={styles.spotlightThumbRemove}
                      onClick={() => removeCommunityImage(index)}
                      aria-label="삭제"
                    >
                      ×
                    </button>
                    <span className={styles.spotlightThumbOrder}>{index + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isCommunityOrReviews && communityLoadMode === 'attachment' && (
          <label className={styles.label}>
            첨부 (선택, 1개)
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx,.zip,image/jpeg,image/png,image/webp"
              onChange={handleCommunityAttachment}
              className={styles.fileInputHidden}
              id="edit-community-attachment-input"
            />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="edit-community-attachment-input" className={styles.fileSelectBtn}>
                파일선택
              </label>
            </div>
            <span className={styles.helper}>이미지(jpg, png, webp) 또는 일반 파일(pdf, txt, doc, docx, zip)</span>
            {(communityExistingAttachment || communityNewAttachmentFile) && (
              <div className={styles.attachmentPreview}>
                {communityNewAttachmentFile ? (
                  isCommunityImageAttachment(communityNewAttachmentFile) ? (
                    <>
                      <img
                        src={URL.createObjectURL(communityNewAttachmentFile)}
                        alt=""
                        className={styles.attachmentThumb}
                      />
                      <span className={styles.attachmentName}>{communityNewAttachmentFile.name}</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.attachmentIcon} aria-hidden>
                        📄
                      </span>
                      <span className={styles.attachmentName}>{communityNewAttachmentFile.name}</span>
                    </>
                  )
                ) : communityExistingAttachment ? (
                  <>
                    <span className={styles.attachmentIcon} aria-hidden>
                      📄
                    </span>
                    <span className={styles.attachmentName}>
                      [첨부파일] {communityExistingAttachment.originalFilename}
                    </span>
                  </>
                ) : null}
                <button
                  type="button"
                  className={styles.attachmentRemove}
                  onClick={removeCommunityAttachment}
                  aria-label="첨부 삭제"
                >
                  ×
                </button>
              </div>
            )}
          </label>
        )}

        {!isShowcase && !isPlaylists && !isSpotlight && !isCommunityOrReviews && (
          <label className={styles.label}>
            파일 URL (선택)
            <input
              type="text"
              placeholder="https://"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className={styles.input}
            />
          </label>
        )}

        <div className={styles.btnGroup}>
          <Link href={`/boards/${boardId}`} className={`${styles.btn} ${styles.cancel}`}>
            취소
          </Link>
          <button
            type="submit"
            className={`${styles.btn} ${styles.submit}`}
            disabled={
              loading ||
              (isShowcase
                ? !titleOk || !contentOk || !youtubeUrlOk
                : isPlaylists
                  ? !titleOk || !contentOk || !playlistIdOk
                  : isSpotlight
                    ? !titleOk || !contentOk || !spotlightPhotosOk
                    : !titleOk || !contentOk)
            }
          >
            {loading ? '수정 중…' : '수정 완료'}
          </button>
        </div>
      </form>

      {isPlaylists && (
        <PlaylistSelectModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          onSelect={(playlist) => {
            setSelectedPlaylist(playlist);
            setErrors((prev) => ({ ...prev, playlist: '' }));
          }}
        />
      )}
    </div>
  );
}
