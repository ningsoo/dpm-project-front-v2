'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { boardApi } from '@/api/boardApi';
import type { BoardCategory } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './CreatePost.module.css';

interface CreatePostProps {
  category: string;
}

export default function CreatePost({ category }: CreatePostProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const titleOk = title.length >= 3 && title.length <= 15;
  const contentOk = content.length >= 5 && content.length <= 300;
  const youtubeOk = !youtubeUrl || /^https:\/\/www\.youtube\.com\//.test(youtubeUrl);
  const photosOk = category !== 'spotlight' || (photos.length >= 1 && photos.length <= 5);
  const filesOk = !['community', 'reviews'].includes(category) || files.length <= 3;

  const buildBody = (): Record<string, unknown> => {
    const base: Record<string, unknown> = { title, content };
    if (category === 'showcase' && youtubeUrl) base.youtubeUrl = youtubeUrl;
    if (category === 'playlists' && playlistId) base.playlistId = playlistId;
    // TODO: spotlight photos, community/reviews files — 전송 시 FormData 또는 별도 업로드 API 사용
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleOk || !contentOk || (category === 'showcase' && !youtubeOk) || !photosOk || !filesOk) {
      setErrors({
        title: !titleOk ? '3~15자' : '',
        content: !contentOk ? '5~300자' : '',
        youtube: category === 'showcase' && !youtubeOk ? 'https://www.youtube.com/ 로 시작' : '',
      });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const body = buildBody();
      const { data } = await boardApi.createPost(safeCat as BoardCategory, body);
      const id = (data?.data as { boardId?: string })?.boardId;
      router.push(id ? `/boards/${category}/${id}` : `/boards/${category}`);
    } catch {
      ToastUtils.error('글 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    setPhotos((p) => [...p, ...list].slice(0, 5));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    setFiles((f) => [...f, ...list].slice(0, 3));
  };

  const safeCat = ['showcase', 'playlists', 'spotlight', 'community', 'reviews'].includes(category)
    ? category
    : 'showcase';

  return (
    <div className={styles.wrap}>
      <h1 className={styles.h1}>새 글 쓰기 · {safeCat}</h1>

      <form onSubmit={handleSubmit}>
        <label className={styles.label}>
          제목 (3~15자)
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
            YouTube URL
            <input
              type="url"
              placeholder="https://"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className={styles.input}
            />
            <span className={styles.helper}>Share your video</span>
            {errors.youtube && <span className={styles.error}>{errors.youtube}</span>}
          </label>
        )}

        {category === 'playlists' && (
          <label className={styles.label}>
            플레이리스트
            <button type="button" className={styles.addBtn}>
              플레이리스트 선택 (모달)
            </button>
            {playlistId && <div className={styles.fileList}>선택됨: {playlistId}</div>}
          </label>
        )}

        {category === 'spotlight' && (
          <label className={styles.label}>
            사진 (1~5장, 첫 사진이 카드에 사용됩니다)
            <input type="file" accept="image/*" multiple onChange={handlePhotos} />
            <span className={styles.helper}>첫 사진이 카드에 노출됩니다 (1~5장)</span>
            {photos.length > 0 && (
              <div className={styles.thumbPreview}>
                <img src={URL.createObjectURL(photos[0])} alt="미리보기" />
              </div>
            )}
            {!photosOk && <span className={styles.error}>1~5장 필요</span>}
          </label>
        )}

        {['community', 'reviews'].includes(category) && (
          <label className={styles.label}>
            첨부 (최대 3개)
            <input type="file" multiple onChange={handleFiles} />
            {files.length > 0 && (
              <div className={styles.fileList}>
                {files.map((f, i) => (
                  <span key={i}>{f.name} </span>
                ))}
              </div>
            )}
          </label>
        )}

        <label className={styles.label}>
          내용 (5~300자)
          <textarea
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textarea}
          />
          {errors.content && <span className={styles.error}>{errors.content}</span>}
        </label>

        <div className={styles.btnGroup}>
          <Link href={`/boards/${safeCat}`} className={`${styles.btn} ${styles.cancel}`}>
            취소
          </Link>
          <button
            type="submit"
            className={`${styles.btn} ${styles.submit}`}
            disabled={!titleOk || !contentOk || !photosOk || !filesOk || loading}
          >
            {loading ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
