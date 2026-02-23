'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createAnnouncement } from './announcementsService';
import { getAnnounceTypeLabel } from '@/utils/announcementUtils';
import { ToastUtils } from '@/utils/toastUtils';
import type { AnnounceType } from '@/api/announcementTypes';
import styles from '@/components/board/BoardFormLayout/BoardFormLayout.module.css';

const ANNOUNCE_TYPE_OPTIONS: { value: AnnounceType; label: string }[] = [
  { value: 'GENERAL', label: '일반' },
  { value: 'EMERGENCY', label: '긴급' },
  { value: 'EVENT', label: '이벤트' },
  { value: 'TERMS_OF_SERVICE', label: '이용약관' },
  { value: 'PRIVACY_POLICY', label: '개인정보' },
];

function getNowForDatetimeLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

interface AnnouncementsWriteSectionProps {
  announceType: AnnounceType;
}

export function AnnouncementsWriteSection({ announceType }: AnnouncementsWriteSectionProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const now = getNowForDatetimeLocal();
    setStartedAt(now);
    setEndedAt(now);
  }, []);

  const typeLabel = ANNOUNCE_TYPE_OPTIONS.find((o) => o.value === announceType)?.label ?? getAnnounceTypeLabel(announceType);

  const isImageFile = (file: File) =>
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...list]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setErrors({
        title: !trimmedTitle ? '제목을 입력해주세요.' : '',
        content: !trimmedContent ? '내용을 입력해주세요.' : '',
      });
      ToastUtils.error('제목과 내용을 입력해주세요.');
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const data = {
        announceType,
        title: trimmedTitle,
        content: trimmedContent,
        linkUrl: linkUrl.trim() || '',
        startedAt: startedAt ? new Date(startedAt).toISOString() : '',
        endedAt: endedAt ? new Date(endedAt).toISOString() : null,
      };

      const formData = new FormData();
      const dataBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      formData.append('data', dataBlob, 'data.json');
      files.forEach((file) => formData.append('files', file));

      await createAnnouncement(announceType, formData);
      ToastUtils.success('공지사항이 등록되었습니다.');
      router.push('/adm1n/announcements');
    } catch {
      ToastUtils.error('공지사항 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <Link href="/adm1n/announcements" className={styles.categoryLink}>
        <h1 className={styles.h1}>공지사항 작성 ({typeLabel})</h1>
      </Link>

      <form onSubmit={handleSubmit}>
        <label className={styles.label}>
          제목
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />
          {errors.title && <span className={styles.error}>{errors.title}</span>}
        </label>

        <label className={styles.label}>
          내용
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textarea}
          />
          {errors.content && <span className={styles.error}>{errors.content}</span>}
        </label>

        <label className={styles.label}>
          링크 URL
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className={styles.input}
            placeholder="https://"
          />
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px', alignItems: 'flex-end', marginBottom: 24 }}>
          <label className={styles.label} style={{ marginBottom: 0, flex: '1 1 200px' }}>
            시작일
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className={styles.input}
            />
          </label>
          <label className={styles.label} style={{ marginBottom: 0, flex: '1 1 200px' }}>
            종료일
            <input
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              className={styles.input}
            />
          </label>
        </div>

        <div className={styles.attachmentGroup}>
          <label className={styles.label}>
            첨부파일 <span className={styles.optional}>(선택, 여러 개)</span>
          </label>
          <div className={styles.fileUploadRow}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleFileChange}
            />
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              파일 선택
            </button>
          </div>
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {files.map((file, i) => (
                <div key={i} className={styles.attachmentPreview}>
                  {isImageFile(file) ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className={styles.attachmentThumb}
                    />
                  ) : (
                    <span className={styles.attachmentIcon} aria-hidden>
                      📄
                    </span>
                  )}
                  <span className={styles.attachmentName}>{file.name}</span>
                  <button
                    type="button"
                    className={styles.attachmentRemove}
                    onClick={() => removeFile(i)}
                    aria-label="첨부 삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.btnGroup}>
          <Link href="/adm1n/announcements" className={`${styles.btn} ${styles.cancel}`}>
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
    </div>
  );
}
