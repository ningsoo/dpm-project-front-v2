'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { announcementApi } from '@/api/announcementApi';
import type { Announcement } from '@/api/announcementTypes';
import { formatCreatedDateTime } from '@/utils/createdDateTime';
import { getAnnounceTypeLabel, formatAnnouncePeriod, getAnnouncePeriodParts } from '@/utils/announcementUtils';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './AnnouncementList.module.css';

interface AnnouncementWithNumber extends Announcement {
  displayNumber: number;
}

export default function AnnouncementPage() {
  const router = useRouter();
  const [list, setList] = useState<AnnouncementWithNumber[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (pageNum: number, isAppend: boolean) => {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const { data } = await announcementApi.getList(pageNum);
        const rawContent = data?.data?.content ?? [];
        const activeOnly = rawContent.filter((item: Announcement) => item.isActive === true);

        const startIndex = isAppend ? list.length : 0;
        const withNumber: AnnouncementWithNumber[] = activeOnly.map(
          (item: Announcement, i: number) => ({
            ...item,
            displayNumber: startIndex + i + 1,
          })
        );

        if (isAppend) {
          setList((prev) => [...prev, ...withNumber]);
        } else {
          setList(withNumber);
        }
        setPage(pageNum);
        setLast(data?.data?.last ?? true);
        setHasError(false);
      } catch {
        ToastUtils.error('공지사항을 불러올 수 없습니다.');
        if (!isAppend) setList([]);
        setHasError(true);
      } finally {
        if (isAppend) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [list.length]
  );

  const fetchMore = useCallback(() => {
    if (loading || loadingMore || last || hasError) return;
    fetchPage(page + 1, true);
  }, [loading, loadingMore, last, hasError, page, fetchPage]);

  useEffect(() => {
    setList([]);
    setPage(0);
    setLast(false);
    setHasError(false);
    setContentVisible(false);
    fetchPage(0, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;
    if (wasLoading && !loading) {
      requestAnimationFrame(() => setContentVisible(true));
    }
  }, [loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (loading || loadingMore || last || hasError) return;
        fetchMore();
      },
      { root: null, rootMargin: '100px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, loadingMore, last, hasError, fetchMore]);

  return (
    <section className={styles.section}>
      <div className={styles.listContentWrap}>
        {/* 스켈레톤 */}
        <div
          className={`${styles.listLayer} ${loading && list.length === 0 ? styles.layerVisible : styles.layerHidden}`}
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>번호</th>
                  <th>제목</th>
                  <th>공지</th>
                  <th>기간</th>
                  <th>등록일</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className={styles.skeletonRow}>
                    <td><div className={`${styles.skeletonCell} ${styles.skeletonCellW40}`} /></td>
                    <td><div className={`${styles.skeletonCell} ${styles.skeletonCellW40pct}`} /></td>
                    <td><div className={`${styles.skeletonCell} ${styles.skeletonCellW70}`} /></td>
                    <td><div className={`${styles.skeletonCell} ${styles.skeletonCellW120}`} /></td>
                    <td><div className={`${styles.skeletonCell} ${styles.skeletonCellW80}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 실제 목록 */}
        <div
          className={`${styles.listLayer} ${contentVisible && !loading ? styles.layerVisible : styles.layerHidden}`}
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>번호</th>
                  <th>제목</th>
                  <th>공지</th>
                  <th>기간</th>
                  <th>등록일</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr
                    key={row.announceId}
                    className={styles.cursorPointer}
                    onClick={() => router.push(`/announcement/${row.announceId}`)}
                  >
                    <td>{row.displayNumber}</td>
                    <td>{row.title}</td>
                    <td>{getAnnounceTypeLabel(row.announceType)}</td>
                    <td>
                      {(() => {
                        const period = getAnnouncePeriodParts(row.startedAt, row.endedAt);
                        return (
                          <>
                            {period.start}
                            <span className={styles.periodSep}> ~</span>
                            {period.end !== null ? ` ${period.end}` : ''}
                          </>
                        );
                      })()}
                    </td>
                    <td>{formatCreatedDateTime(row.createdAt as number[])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div ref={sentinelRef} className={styles.infiniteScrollSentinel} aria-hidden />

          {loadingMore && (
            <div className={styles.loadingMore}>
              <span className={styles.loadingDot} />
              <span className={styles.loadingDot} />
              <span className={styles.loadingDot} />
            </div>
          )}

          {!loading && list.length === 0 && (
            <div className={styles.empty}>등록된 공지사항이 없습니다.</div>
          )}
        </div>
      </div>
    </section>
  );
}
