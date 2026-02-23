'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from '@/app/adm1n/admin.module.css';

interface Adm1nModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Adm1nModal({ open, onClose, title, children }: Adm1nModalProps) {
  if (!open) return null;
  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} type="button">
          <X size={18} />
        </button>
        <h3 className={styles.modalTitle}>{title}</h3>
        {children}
      </div>
    </div>,
    document.body
  );
}
