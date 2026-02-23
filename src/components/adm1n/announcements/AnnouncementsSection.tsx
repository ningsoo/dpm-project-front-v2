'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import { formatAnnouncementDate } from './formatAnnouncementDate';
import { Adm1nTable } from '../common/Adm1nTable';
import { useAnnouncements } from './useAnnouncements';
import axios from 'axios';
import { deleteAnnouncement, updateAnnouncement } from './announcementsService';
import { ToastUtils } from '@/utils/toastUtils';
import { getAnnounceTypeLabel } from '@/utils/announcementUtils';
import type { AnnouncementItem } from '@/api/adminApi';
import type { AnnounceType } from '@/api/announcementTypes';
import styles from '@/app/adm1n/admin.module.css';

const HEADERS = ['NO', '제목', '기간', '작성일', '공지타입', '공지상태', '수정/삭제'];

const ANNOUNCE_TYPE_OPTIONS: { value: AnnounceType; label: string }[] = [
  { value: 'GENERAL', label: '일반' },
  { value: 'EMERGENCY', label: '긴급' },
  { value: 'EVENT', label: '이벤트' },
  { value: 'TERMS_OF_SERVICE', label: '이용약관' },
  { value: 'PRIVACY_POLICY', label: '개인정보' },
];

function periodText(startedAt?: unknown, endedAt?: unknown): string {
  const start = formatAnnouncementDate(startedAt) || '-';
  const end = formatAnnouncementDate(endedAt);
  return end ? `${start} ~ ${end}` : `${start} ~ `;
}

/** API 날짜(배열 또는 문자열) → ISO 문자열 (수정/우선공지 요청용) */
function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const [y, mo, d, h = 0, min = 0, s = 0] = value.map((x) => (typeof x === 'number' ? x : Number(x)));
    if (!Number.isFinite(y)) return null;
    const date = new Date(y, Number(mo) - 1, Number(d), Number(h), Number(min), Number(s));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function RowMenu({
  open,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div ref={ref} className={styles.announcementMenuDropdown} onClick={(e) => e.stopPropagation()}>
      <button type="button" className={styles.announcementMenuItem} onClick={onEdit}>
        수정
      </button>
      <button type="button" className={`${styles.announcementMenuItem} ${styles.announcementMenuItemDanger}`} onClick={onDelete}>
        삭제
      </button>
    </div>
  );
}

function Row({
  item,
  onRequestDelete,
  onRequestPriorityChange,
}: {
  item: AnnouncementItem;
  onRequestDelete: (announceId: number) => void;
  onRequestPriorityChange: (item: AnnouncementItem) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleEdit = useCallback(() => {
    setMenuOpen(false);
    router.push(`/adm1n/announcements/${item.announceId}/edit`);
  }, [router, item.announceId]);
  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    onRequestDelete(item.announceId);
  }, [item.announceId, onRequestDelete]);

  const isPriority = item.priority === 0;

  return (
    <div className={`${styles.tableGrid} ${styles.announcementsGrid} ${styles.tableRow}`}>
      <div className={styles.tableCell}>{item.announceId}</div>
      <div className={styles.tableCell}>
        <Link
          href={`/adm1n/announcements/${item.announceId}`}
          style={{ color: 'inherit', textDecoration: 'none', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {item.title ?? '-'}
        </Link>
      </div>
      <div className={styles.tableCell}>{periodText(item.startedAt, item.endedAt)}</div>
      <div className={styles.tableCell}>{formatAnnouncementDate(item.createdAt) || '-'}</div>
      <div className={styles.tableCell}>
        {item.announceType ? getAnnounceTypeLabel(item.announceType as AnnounceType) : '-'}
      </div>
      <div className={styles.tableCell}>
        {isPriority ? (
          <button type="button" className={styles.priorityBtnPrimary} disabled aria-disabled="true">
            우선 공지
          </button>
        ) : (
          <button
            type="button"
            className={styles.priorityBtnNormal}
            onClick={() => onRequestPriorityChange(item)}
          >
            일반 공지
          </button>
        )}
      </div>
      <div className={`${styles.tableCell} ${styles.announcementMenuWrap} ${styles.announcementMenuCell}`}>
        <button
          type="button"
          aria-label="메뉴"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((p) => !p);
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <MoreVertical size={18} />
        </button>
        <RowMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

export function AnnouncementsSection() {
  const { announcements, isLoading, hasNext, loadMore, fetchAnnouncements } = useAnnouncements();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [selectedType, setSelectedType] = useState<AnnounceType>('GENERAL');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [priorityChangeTarget, setPriorityChangeTarget] = useState<AnnouncementItem | null>(null);
  const [isPriorityChanging, setIsPriorityChanging] = useState(false);

  const handleRequestDelete = useCallback((announceId: number) => {
    setDeleteTargetId(announceId);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    if (!isDeleting) setDeleteTargetId(null);
  }, [isDeleting]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteTargetId == null || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteAnnouncement(deleteTargetId);
      setDeleteTargetId(null);
      ToastUtils.success('삭제되었습니다.');
      fetchAnnouncements(0);
    } catch (err: unknown) {
      let message = '삭제에 실패했습니다. 잠시 후 다시 시도해주세요.';
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message ?? err.response?.data?.error;
        if (typeof msg === 'string') message = msg;
        else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout'))
          message = '요청 시간이 만료되었습니다. 다시 시도해주세요.';
        else if (err.message) message = err.message;
      } else if (err instanceof Error && err.message) message = err.message;
      ToastUtils.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTargetId, isDeleting, fetchAnnouncements]);

  const handleRequestPriorityChange = useCallback((item: AnnouncementItem) => {
    setPriorityChangeTarget(item);
  }, []);

  const handleClosePriorityModal = useCallback(() => {
    if (!isPriorityChanging) setPriorityChangeTarget(null);
  }, [isPriorityChanging]);

  const handleConfirmPriorityChange = useCallback(async () => {
    const item = priorityChangeTarget;
    if (item == null || isPriorityChanging) return;
    setIsPriorityChanging(true);
    try {
      const data = {
        announceType: item.announceType ?? 'GENERAL',
        title: item.title ?? '',
        content: item.content ?? '',
        linkUrl: item.linkUrl ?? '',
        priority: 0 as const,
        isActive: item.isActive ?? true,
        startedAt: toIsoOrNull(item.startedAt),
        endedAt: toIsoOrNull(item.endedAt),
      };
      const formData = new FormData();
      const dataBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      formData.append('data', dataBlob, 'data.json');
      await updateAnnouncement(item.announceId, formData);
      setPriorityChangeTarget(null);
      ToastUtils.success('우선 공지로 변경되었습니다.');
      fetchAnnouncements(0);
    } catch (err: unknown) {
      let message = '변경에 실패했습니다. 잠시 후 다시 시도해주세요.';
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message ?? err.response?.data?.error;
        if (typeof msg === 'string') message = msg;
        else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout'))
          message = '요청 시간이 만료되었습니다. 다시 시도해주세요.';
        else if (err.message) message = err.message;
      } else if (err instanceof Error && err.message) message = err.message;
      ToastUtils.error(message);
    } finally {
      setIsPriorityChanging(false);
    }
  }, [priorityChangeTarget, isPriorityChanging, fetchAnnouncements]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNext || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: '100px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNext, isLoading, loadMore]);

  return (
    <>
      <div className={styles.announcementsSectionHeader}>
        <h1 className={styles.sectionTitle}>공지사항</h1>
        <div className={styles.announcementsSectionActions}>
          <select
            className={styles.filterSelect}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as AnnounceType)}
            aria-label="공지 타입"
          >
            {ANNOUNCE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Link
            href={`/adm1n/announcements/write?announceType=${encodeURIComponent(selectedType)}`}
            className={styles.filterBtn}
            style={{ textDecoration: 'none' }}
          >
            작성
          </Link>
        </div>
      </div>
      <div className={styles.sectionContent}>
        <div className={styles.announcementsTableWrap}>
          <Adm1nTable gridClass="announcementsGrid" headers={HEADERS}>
            {!isLoading && announcements.length === 0 ? null : (
              <>
                {announcements.map((item) => (
                  <Row
                    key={item.announceId}
                    item={item}
                    onRequestDelete={handleRequestDelete}
                    onRequestPriorityChange={handleRequestPriorityChange}
                  />
                ))}
                <div ref={sentinelRef} style={{ gridColumn: '1 / -1', height: 1, minHeight: 1 }} aria-hidden />
              </>
            )}
          </Adm1nTable>
        </div>
        {!isLoading && announcements.length === 0 && (
          <div className={styles.emptyState}>공지사항이 없습니다.</div>
        )}
      </div>

      {deleteTargetId != null &&
        createPortal(
          <div
            className={styles.modalOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } }}
          >
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <h3 id="delete-modal-title" className={styles.modalTitle}>
                삭제하시겠습니까?
              </h3>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCloseDeleteModal}
                  disabled={isDeleting}
                >
                  아니요
                </button>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? '처리 중...' : '예'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {priorityChangeTarget != null &&
        createPortal(
          <div
            className={styles.modalOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="priority-modal-title"
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } }}
          >
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <h3 id="priority-modal-title" className={styles.modalTitle}>
                우선 공지로 변경하시겠습니까?
              </h3>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleClosePriorityModal}
                  disabled={isPriorityChanging}
                >
                  아니요
                </button>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={handleConfirmPriorityChange}
                  disabled={isPriorityChanging}
                >
                  {isPriorityChanging ? '처리 중...' : '예'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
