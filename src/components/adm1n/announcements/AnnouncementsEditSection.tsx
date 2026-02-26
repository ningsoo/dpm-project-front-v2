'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAnnouncementDetail, updateAnnouncement } from './announcementsService';
import { getAnnounceTypeLabel } from '@/utils/announcementUtils';
import { ToastUtils } from '@/utils/toastUtils';
import type { AnnounceType } from '@/api/announcementTypes';
import type { AnnouncementItem } from '@/api/adminApi';
import styles from '@/components/board/BoardFormLayout/BoardFormLayout.module.css';

const ANNOUNCE_TYPE_OPTIONS: { value: AnnounceType; label: string }[] = [
  { value: 'GENERAL', label: '일반' },
  { value: 'EMERGENCY', label: '긴급' },
  { value: 'EVENT', label: '이벤트' },
  { value: 'TERMS_OF_SERVICE', label: '이용약관' },
  { value: 'PRIVACY_POLICY', label: '개인정보' },
];

/** API 날짜(배열 또는 ISO 문자열) → datetime-local 값 "YYYY-MM-DDTHH:mm" */
function toDateTimeLocalValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    const [y, mo, d, h = 0, min = 0] = value.map((x) => (typeof x === 'number' ? x : Number(x)));
    if (!Number.isFinite(y)) return '';
    const year = y;
    const month = Number.isFinite(mo) ? Math.max(1, Math.min(12, mo)) : 1;
    const day = Number.isFinite(d) ? Math.max(1, Math.min(31, d)) : 1;
    const hour = Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 0;
    const minute = Number.isFinite(min) ? Math.max(0, Math.min(59, min)) : 0;
    const m = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const hourStr = String(hour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');
    return `${year}-${m}-${dayStr}T${hourStr}:${minStr}`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  }
  return '';
}

interface AnnouncementsEditSectionProps {
  announceId: number;
}

export function AnnouncementsEditSection({ announceId }: AnnouncementsEditSectionProps) {
  const router = useRouter();
  const [initial, setInitial] = useState<AnnouncementItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [announceType, setAnnounceType] = useState<AnnounceType>('GENERAL');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const item = await getAnnouncementDetail(announceId);
      if (!item) {
        ToastUtils.error('공지사항을 불러올 수 없습니다.');
        router.push('/adm1n/announcements');
        return;
      }
      setInitial(item);
      setTitle(item.title ?? '');
      setContent(item.content ?? '');
      setLinkUrl(item.linkUrl ?? '');
      setStartedAt(toDateTimeLocalValue(item.startedAt) || '');
      setEndedAt(toDateTimeLocalValue(item.endedAt) || '');
      setAnnounceType((item.announceType as AnnounceType) || 'GENERAL');
    } catch {
      ToastUtils.error('공지사항을 불러올 수 없습니다.');
      router.push('/adm1n/announcements');
    } finally {
      setLoadingDetail(false);
    }
  }, [announceId, router]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const typeLabel = ANNOUNCE_TYPE_OPTIONS.find((o) => o.value === announceType)?.label ?? getAnnounceTypeLabel(announceType);

  const isImageFile = (file: File) =>
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setNewFiles((prev) => [...prev, ...list]);
    e.target.value = '';
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
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
    if (!initial) return;
    setErrors({});
    setLoading(true);

    try {
      const startedIso = startedAt ? new Date(startedAt).toISOString() : null;
      const endedIso = endedAt ? new Date(endedAt).toISOString() : null;

      const data = {
        announceType,
        title: trimmedTitle,
        content: trimmedContent,
        linkUrl: linkUrl.trim() || '',
        priority: initial.priority ?? 1,
        isActive: initial.isActive ?? true,
        startedAt: startedIso,
        endedAt: endedIso,
      };

      const formData = new FormData();
      const dataBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      formData.append('data', dataBlob, 'data.json');
      newFiles.forEach((file) => formData.append('files', file));

      await updateAnnouncement(announceId, formData);
      ToastUtils.success('공지사항이 수정되었습니다.');
      router.push('/adm1n/announcements');
    } catch {
      ToastUtils.error('공지사항 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingDetail || !initial) {
    return (
      <div className={styles.wrap}>
        <p className={styles.loadingP}>로딩 중…</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <Link href="/adm1n/announcements" className={styles.categoryLink}>
        <h1 className={styles.h1}>공지사항 수정 ({typeLabel})</h1>
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

        <div className={styles.formRow}>
          <label className={`${styles.label} ${styles.labelFlex}`}>
            시작일
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className={styles.input}
            />
          </label>
          <label className={`${styles.label} ${styles.labelFlex}`}>
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
            첨부파일
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
          {newFiles.length > 0 && (
            <div className={styles.colGap12Mt12}>
              {newFiles.map((file, i) => (
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
                    onClick={() => removeNewFile(i)}
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
            {loading ? '수정 중…' : '수정'}
          </button>
        </div>
      </form>
    </div>
  );
}
