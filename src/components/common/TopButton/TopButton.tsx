'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './TopButton.module.css';

const SCROLL_THRESHOLD = 200;

export default function TopButton() {
  const [visible, setVisible] = useState(false);

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      setVisible(window.scrollY >= SCROLL_THRESHOLD);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.btn}
        onClick={scrollToTop}
        aria-label="맨 위로 이동"
        title="맨 위로 이동"
      >
        Top
      </button>
    </div>
  );
}
