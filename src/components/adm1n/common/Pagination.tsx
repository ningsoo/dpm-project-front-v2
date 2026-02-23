'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '@/app/adm1n/admin.module.css';

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(0, page - 2);
  const end = Math.min(totalPages - 1, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={styles.pagination}>
      <button className={styles.pageBtn} disabled={page === 0} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={14} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={p === page ? styles.pageBtnActive : styles.pageBtn}
          onClick={() => onPage(p)}
        >
          {p + 1}
        </button>
      ))}
      <button
        className={styles.pageBtn}
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
