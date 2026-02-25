'use client';

import styles from './credit.module.css';

export default function CreditLoadingFallback() {
  return <div className={styles.loadingFallback}>로딩 중...</div>;
}
