'use client';

import styles from './mypage.module.css';

export interface ReportCancelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReportCancelConfirmModal({ isOpen, onClose, onConfirm }: ReportCancelConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlayCenter} role="dialog" aria-modal="true">
      <div className={styles.modalCardSmall}>
        <p className={`${styles.modalTitleMb16} ${styles.modalTitleMb16Dark}`}>이 신고를 취소하시겠어요?</p>
        <div className={styles.flexGap12Center}>
          <button type="button" onClick={onClose} className={styles.modalBtnCancel}>
            취소
          </button>
          <button type="button" onClick={onConfirm} className={styles.modalBtn}>
            예
          </button>
        </div>
      </div>
    </div>
  );
}
