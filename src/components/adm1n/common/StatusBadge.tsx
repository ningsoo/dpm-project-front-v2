'use client';

import styles from '@/app/adm1n/admin.module.css';

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: styles.statusPending, label: '대기' },
  ACTIVE: { cls: styles.statusActive, label: '활성' },
  PROCESSING: { cls: styles.statusProcessing, label: '처리중' },
  COMPLETED: { cls: styles.statusCompleted, label: '완료' },
  SUSPENDED: { cls: styles.statusSuspended, label: '정지' },
  REJECTED: { cls: styles.statusRejected, label: '거절' },
  APPROVED: { cls: styles.statusCompleted, label: '승인' },
  ANSWERED: { cls: styles.statusCompleted, label: '답변완료' },
  WAITING: { cls: styles.statusPending, label: '대기' },
  BANNED: { cls: styles.statusSuspended, label: '차단' },
  SETTLEMENT_REQUEST: { cls: styles.statusPending, label: '대기' },
  SETTLEMENT_COMPLETED: { cls: styles.statusCompleted, label: '완료' },
};

export function StatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();
  const info = STATUS_MAP[upper] || { cls: styles.statusPending, label: status };
  return <span className={`${styles.statusBadge} ${info.cls}`}>{info.label}</span>;
}
