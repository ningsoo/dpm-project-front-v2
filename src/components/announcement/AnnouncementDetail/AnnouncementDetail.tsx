'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { announcementApi } from '@/api/announcementApi';
import type { Announcement } from '@/api/announcementTypes';
import { formatCreatedDateTimeFull } from '@/utils/createdDateTime';
import { getAnnounceTypeLabel, formatAnnouncePeriod } from '@/utils/announcementUtils';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '@/components/board/BoardFormLayout/BoardFormLayout.module.css';
import detailStyles from './AnnouncementDetail.module.css';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i;
function isImageUrl(url: string): boolean {
  return IMAGE_EXT.test(url);
}

interface AnnouncementDetailProps {
  announceId: string;
}

export default function AnnouncementDetail({ announceId }: AnnouncementDetailProps) {
  const [detail, setDetail] = useState<Announcement | null>(null);
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

  useEffect(() => {
    const id = Number(announceId);
    if (!Number.isInteger(id) || id < 1) {
      setLoading(false);
      setDetail(null);
      setFetchError('not_found');
      return;
    }

    setLoading(true);
    setFetchError(false);

    announcementApi
      .getDetail(id)
      .then(({ data }) => {
        const d = data?.data;
        if (d) setDetail(d as Announcement);
        else setDetail(null);
        setFetchError(false);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { status?: number } };
        const status = e?.response?.status;
        if (status === 404) {
          ToastUtils.error('삭제되었거나 존재하지 않는 공지입니다.');
          setFetchError('not_found');
        } else {
          ToastUtils.error('공지사항을 불러올 수 없습니다.');
          setFetchError('server');
        }
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [announceId, retryTrigger]);

  if (loading) {
    return <div className={styles.loading}>로딩 중…</div>;
  }

  if (!detail) {
    if (fetchError === 'not_found') {
      return (
        <div className={styles.loading}>
          <p>공지사항을 불러올 수 없습니다.</p>
          <Link href="/announcement" className={styles.retryBtn}>
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
    return <div className={styles.loading}>공지가 없습니다.</div>;
  }

  const typeLabel = getAnnounceTypeLabel(detail.announceType);
  const hasLink = detail.linkUrl != null && String(detail.linkUrl).trim() !== '';

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
              {formatAnnouncePeriod(detail.startedAt, detail.endedAt)}
            </span>
            <span className={styles.iconBtn} style={{ cursor: 'default' }}>
              {formatCreatedDateTimeFull(detail.createdAt)}
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

      <div style={{ padding: '0 40px', marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <Link href="/announcement" className={styles.retryBtn}>
          목록
        </Link>
      </div>
    </div>
  );
}
