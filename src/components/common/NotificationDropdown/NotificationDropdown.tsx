'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  notificationApi,
  type NotificationItem,
  type NotificationType,
} from '@/api/notificationApi';
import { formatNotificationDate } from '@/utils/createdDateTime';
import { setUnreadNotificationCount } from '@/store/slices/uiSlice';
import { AppDispatch } from '@/store';
import NotificationNavigateModal from './NotificationNavigateModal';
import styles from './NotificationDropdown.module.css';

const PAGE_SIZE = 10;

const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  LIKE: '회원님의 게시글을 좋아합니다',
  COMMENT: '회원님의 게시글에 댓글을 남겼습니다',
  DONATION: '회원님의 게시글에 POP을 선물 하였습니다',
};

function getTypeLabel(type: NotificationType | string): string {
  const key = (type || '').toUpperCase() as NotificationType;
  return NOTIFICATION_TYPE_LABEL[key] ?? '';
}

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export default function NotificationDropdown({
  open,
  onClose,
  anchorRef,
}: NotificationDropdownProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [clickingId, setClickingId] = useState<number | null>(null);
  const loadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  loadingRef.current = loading;

  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
      if (clickingId != null) return;

      setClickingId(item.notificationId);
      notificationApi
        .getNotificationDetail(item.notificationId)
        .then(({ data }) => {
          const payload = data?.data;
          if (!payload) return;

          setNotifications((prev) =>
            prev.map((n) =>
              n.notificationId === payload.notificationId ? payload : n
            )
          );

          notificationApi.getUnreadCount().then(({ data: countData }) => {
            const count = countData?.data;
            if (typeof count === 'number') {
              dispatch(setUnreadNotificationCount(count));
            }
          });

          onClose();
          setSelectedBoardId(payload.boardId ?? null);
          setIsNotificationModalOpen(true);
        })
        .catch((err) => {
          console.error('[notification detail]', err);
        })
        .finally(() => {
          setClickingId(null);
        });
    },
    [clickingId, dispatch, onClose]
  );

  const fetchPage = useCallback((pageNum: number, append: boolean) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    notificationApi
      .getNotificationList({ page: pageNum, size: PAGE_SIZE })
      .then(({ data }) => {
        const payload = data?.data;
        const list = Array.isArray(payload?.content) ? payload.content : [];
        const isLast = payload && typeof payload.last === 'boolean' ? payload.last : list.length < PAGE_SIZE;
        setNotifications((prev) => (append ? [...prev, ...list] : list));
        setHasNext(!isLast);
      })
      .catch((err) => {
        console.error('[notification list]', err);
      })
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
        setInitialLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!open) return;

    setPage(0);
    setHasNext(true);
    setInitialLoaded(false);
    fetchPage(0, false);
  }, [open, fetchPage]);

  useEffect(() => {
    if (!open || !initialLoaded) return;

    const sentinel = sentinelRef.current;
    const scrollEl = scrollRef.current;
    if (!sentinel || !scrollEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || loadingRef.current || !hasNext) return;

        setPage((prev) => {
          const next = prev + 1;
          fetchPage(next, true);
          return next;
        });
      },
      { root: scrollEl, rootMargin: '50px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, initialLoaded, hasNext, fetchPage]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose, anchorRef]);

  const isEmpty = initialLoaded && notifications.length === 0;
  const showEndMessage = isEmpty || (!hasNext && notifications.length > 0);

  return (
    <>
    {open && (
    <div ref={dropdownRef} className={styles.dropdown}>
      <div
        ref={scrollRef}
        className={styles.scrollArea}
      >
        {!initialLoaded ? (
          <div className={styles.loading}>로딩 중…</div>
        ) : (
          <>
            {notifications.map((item) => (
              <button
                key={item.notificationId}
                type="button"
                className={`${styles.item} ${item.read ? styles.itemRead : ''} ${clickingId === item.notificationId ? styles.itemClicking : ''}`}
                onClick={() => handleNotificationClick(item)}
                disabled={clickingId != null}
              >
                <span className={styles.itemText}>
                  {item.senderNickname} 님께서 {getTypeLabel(item.notificationtype)}
                </span>
                <span className={styles.itemDate}>
                  {formatNotificationDate(item.createdAt)}
                </span>
              </button>
            ))}
            {loading && notifications.length > 0 && (
              <div className={styles.loadingMore}>로딩 중…</div>
            )}
            <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
            {showEndMessage && (
              <div className={styles.empty}>확인 할 알림이 없습니다</div>
            )}
          </>
        )}
      </div>
    </div>
    )}

      <NotificationNavigateModal
        open={isNotificationModalOpen}
        onClose={() => {
          setIsNotificationModalOpen(false);
          setSelectedBoardId(null);
        }}
        boardId={selectedBoardId}
      />
    </>
  );
}
