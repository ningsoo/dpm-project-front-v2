'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './HomeTopButton.module.css';

export default function HomeTopButton() {
  const [visible, setVisible] = useState(false);
  const scrollCountRef = useRef(0);

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (visible) return;
      scrollCountRef.current += 1;
      if (scrollCountRef.current >= 2) {
        setVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={styles.topButtonContainer}>
      <button
        type="button"
        className={styles.topButton}
        onClick={scrollToTop}
        aria-label="맨 위로 이동"
        title="맨 위로 이동"
      >
        Top
      </button>
    </div>
  );
}

