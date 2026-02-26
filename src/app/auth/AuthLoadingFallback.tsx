'use client';

import styles from './auth.module.css';

export default function AuthLoadingFallback() {
  return <p className={styles.loadingFallback}>로딩 중...</p>;
}
