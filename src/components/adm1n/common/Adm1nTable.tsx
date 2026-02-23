'use client';

import styles from '@/app/adm1n/admin.module.css';

interface Adm1nTableProps {
  gridClass: string;
  headers: string[];
  children: React.ReactNode;
}

export function Adm1nTable({ gridClass, headers, children }: Adm1nTableProps) {
  return (
    <div className={`${styles.tableGrid} ${styles[gridClass as keyof typeof styles]}`}>
      <div
        className={`${styles.tableGrid} ${styles[gridClass as keyof typeof styles]} ${styles.tableHeader}`}
      >
        {headers.map((h) => (
          <div key={h}>{h}</div>
        ))}
      </div>
      {children}
    </div>
  );
}
