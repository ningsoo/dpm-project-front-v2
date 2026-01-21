'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import styles from './Footer.module.css';

export default function Footer() {
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  return (
    <footer className={`${styles.footer} ${darkMode ? styles.dark : ''}`}>
      <div className={styles.inner}>
        <div className={styles.brand}>SOUNDOCK</div>
        <div className={styles.copyright}>© SOUNDOCK. All rights reserved.</div>
      </div>
    </footer>
  );
}
