'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { boardApi } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './EditPost.module.css';

interface EditPostProps {
  category: string;
  boardId: string;
}

export default function EditPost({ category, boardId }: EditPostProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const titleOk = title.length >= 3 && title.length <= 15;
  const contentOk = content.length >= 5 && content.length <= 300;
  const safeCat = ['showcase', 'playlists', 'spotlight', 'community', 'reviews'].includes(category)
    ? category
    : 'showcase';

  useEffect(() => {
    if (!boardId) {
      setFetching(false);
      return;
    }
    boardApi
      .getPost(boardId)
      .then(({ data }) => {
        const d = data?.data;
        if (d && typeof d === 'object' && 'title' in d && 'content' in d) {
          setTitle(String((d as { title: unknown }).title ?? ''));
          setContent(String((d as { content: unknown }).content ?? ''));
          setFileUrl(String((d as { fileUrl?: unknown }).fileUrl ?? ''));
        }
      })
      .catch(() => ToastUtils.error('글을 불러올 수 없습니다'))
      .finally(() => setFetching(false));
  }, [boardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleOk || !contentOk) {
      setErrors({
        title: !titleOk ? '3~15자' : '',
        content: !contentOk ? '5~300자' : '',
      });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      await boardApi.updatePost(boardId, { title, content, fileUrl });
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

        <label className={styles.label}>
          파일 URL (선택)
          <input
            type="text"
            placeholder="https://"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className={styles.input}
          />
        </label>

        <div className={styles.btnGroup}>
          <Link href={`/boards/${boardId}`} className={`${styles.btn} ${styles.cancel}`}>
            취소
          </Link>
          <button
            type="submit"
            className={`${styles.btn} ${styles.submit}`}
            disabled={!titleOk || !contentOk || loading}
          >
            {loading ? '수정 중…' : '수정'}
          </button>
        </div>
      </form>
    </div>
  );
}
