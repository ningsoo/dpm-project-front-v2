'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getAnnouncementDetail } from './announcementsService';
import { getAnnounceTypeLabel } from '@/utils/announcementUtils';
import { ToastUtils } from '@/utils/toastUtils';
import type { AnnouncementItem } from '@/api/adminApi';
import type { AnnounceType } from '@/api/announcementTypes';
import { formatAnnouncementDate } from './formatAnnouncementDate';
import styles from '@/components/board/BoardFormLayout/BoardFormLayout.module.css';
import detailStyles from './AnnouncementsDetailSection.module.css';

/** ISO 날짜 문자열 → YYYY.MM.DD */
function formatIsoToDisplay(iso: string | null | undefined): string {
  if (!iso || typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** API 응답(ISO 문자열 또는 배열) → YYYY.MM.DD, 없으면 '-' */
function toDisplayDate(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const iso = typeof value === 'string' && value.includes('T') ? formatIsoToDisplay(value) : '';
  const arr = formatAnnouncementDate(value);
  return iso || arr || '-';
}

/** 게시 기간: startedAt ~ endedAt (날짜만) */
function formatPeriodDisplay(startedAt: unknown, endedAt: unknown): string {
  const start = toDisplayDate(startedAt);
  if (start === '-') return '-';
  const end = toDisplayDate(endedAt);
  return end === '-' ? `${start} ~` : `${start} ~ ${end}`;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i;
function isImageUrl(url: string): boolean {
  return IMAGE_EXT.test(url);
}

interface AnnouncementsDetailSectionProps {
  announceId: number;
}

export function AnnouncementsDetailSection({ announceId }: AnnouncementsDetailSectionProps) {
  const [detail, setDetail] = useState<AnnouncementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<false | 'not_found' | 'server'>(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);

  const fileUrls = (detail && Array.isArray(detail.fileUrls) ? detail.fileUrls : []) as string[];
  const imageUrls = useMemo(
    () => fileUrls.filter((u) => typeof u === 'string' && isImageUrl(u)),
    [fileUrls]
  );
  const otherUrls = useMemo(
    () => fileUrls.filter((u) => typeof u === 'string' && !isImageUrl(u)),
    [fileUrls]
  );

  useEffect(() => {
    setImageIndex(0);
  }, [imageUrls.length]);

  const load = useCallback(async () => {
    const id = Number(announceId);
    if (!Number.isInteger(id) || id < 1) {
      setLoading(false);
      setDetail(null);
      setFetchError('not_found');
      return;
    }
    setLoading(true);
    setFetchError(false);
    try {
      const item = await getAnnouncementDetail(id);
      if (item) {
        setDetail(item);
        setFetchError(false);
      } else {
        setDetail(null);
        setFetchError('not_found');
      }
    } catch {
      ToastUtils.error('공지사항을 불러올 수 없습니다.');
      setDetail(null);
      setFetchError('server');
    } finally {
      setLoading(false);
    }
  }, [announceId, retryTrigger]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className={styles.loading}>로딩 중…</div>;
  }

  if (!detail) {
    if (fetchError === 'not_found') {
      return (
        <div className={styles.loading}>
          <p>공지사항을 불러올 수 없습니다.</p>
          <Link href="/adm1n/announcements" className={styles.retryBtn}>
            목록
          </Link>
        </div>
      );
    }
    if (fetchError === 'server') {
      return (
        <div className={styles.loading}>
          <p style={{ marginBottom: 12 }}>일시적인 오류가 발생했습니다.</p>
          <p style={{ marginBottom: 16, fontSize: '0.9rem', color: '#666' }}>
            잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => setRetryTrigger((t) => t + 1)}
          >
            다시 시도
          </button>
        </div>
      );
    }
    return (
      <div className={styles.loading}>
        <p>공지가 없습니다.</p>
        <Link href="/adm1n/announcements" className={styles.retryBtn}>
          목록
        </Link>
      </div>
    );
  }

  const typeLabel = getAnnounceTypeLabel((detail.announceType as AnnounceType) || 'GENERAL');
  const hasLink = detail.linkUrl && String(detail.linkUrl).trim() !== '';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <article className={styles.wrap}>
        <div className={styles.categoryRow}>
          <span className={styles.h1}>{typeLabel}</span>
        </div>

        <div className={styles.titleRow}>
          <h1 className={styles.title}>{detail.title}</h1>
          <div className={styles.actions}>
            <span className={styles.iconBtn} style={{ cursor: 'default' }}>
              {formatPeriodDisplay(detail.startedAt, detail.endedAt)}
            </span>
            <span className={styles.iconBtn} style={{ cursor: 'default' }}>
              {toDisplayDate(detail.createdAt)}
            </span>
          </div>
        </div>

        <div className={styles.contentBlock}>
          <div className={styles.text}>{detail.content ?? ''}</div>

          {imageUrls.length > 0 &&
            (imageUrls.length === 1 ? (
              <div className={styles.videoWrap}>
                <img src={imageUrls[0]} alt="" className={styles.heroImage} />
              </div>
            ) : (
              <div className={styles.photoNavWrap}>
                <div className={styles.videoWrap}>
                  <img
                    src={imageUrls[Math.min(imageIndex, imageUrls.length - 1)]}
                    alt=""
                    className={styles.heroImage}
                  />
                </div>
                <button
                  type="button"
                  className={`${styles.photoNavBtn} ${styles.photoNavPrev}`}
                  onClick={() =>
                    setImageIndex((i) => (i <= 0 ? imageUrls.length - 1 : i - 1))
                  }
                  aria-label="이전 사진"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`${styles.photoNavBtn} ${styles.photoNavNext}`}
                  onClick={() =>
                    setImageIndex((i) => (i >= imageUrls.length - 1 ? 0 : i + 1))
                  }
                  aria-label="다음 사진"
                >
                  ›
                </button>
              </div>
            ))}

          {otherUrls.length > 0 && (
            <div className={styles.attachmentBlock}>
              {otherUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.attachmentBtn}
                >
                  [첨부파일] {decodeURIComponent(url.split('/').pop() || `파일 ${i + 1}`)}
                </a>
              ))}
            </div>
          )}
        </div>

        {hasLink && (
          <section className={detailStyles.pageMoveCard}>
            <span style={{ flex: 1 }} />
            <a
              href={detail.linkUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.retryBtn}
              style={{ textDecoration: 'none', flexShrink: 0 }}
            >
              링크 이동
            </a>
          </section>
        )}
      </article>

      <div style={{ padding: '0 40px', marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <Link href="/adm1n/announcements" className={styles.retryBtn}>
          목록
        </Link>
        <Link
          href={`/adm1n/announcements/${detail.announceId}/edit`}
          className={styles.retryBtn}
          style={{ textDecoration: 'none' }}
        >
          수정
        </Link>
      </div>
    </div>
  );
}
