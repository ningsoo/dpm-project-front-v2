'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './NotificationNavigateModal.module.css';

interface NotificationNavigateModalProps {
  open: boolean;
  onClose: () => void;
  boardId: number | null;
}

/** 알림 클릭 후 "해당 게시글로 이동하시겠습니까?" 확인 모달 (후원 모달 디자인 재사용) */
export default function NotificationNavigateModal({
  open,
  onClose,
  boardId,
}: NotificationNavigateModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleConfirm = () => {
    if (boardId != null && boardId > 0) {
      router.push(`/boards/${boardId}`);
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-navigate-title"
      onClick={handleBackdropClick}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <p id="notification-navigate-title" className={styles.message}>
          해당 게시글로 이동하시겠습니까?
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            아니요
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirm}
          >
            예
          </button>
        </div>
      </div>
    </div>
  );
}
