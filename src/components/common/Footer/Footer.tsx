'use client';

import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { tokenUtils } from '@/utils/tokenUtils';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './Footer.module.css';

export default function Footer() {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  const handleInquiryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!tokenUtils.getAccessToken()) {
      ToastUtils.error('로그인 후 이용해주세요.');
      router.push('/auth/login');
      return;
    }
    router.push('/inquiry');
  };

  return (
    <footer className={`${styles.footer} ${darkMode ? styles.dark : ''}`}>
      <div className={styles.inner}>
        <div className={styles.brand}>SOUNDOCK</div>
        <div className={styles.inquiryLink}>
          <a href="/inquiry" onClick={handleInquiryClick}>문의하기</a>
        </div>
        <div className={styles.copyright}>© SOUNDOCK. All rights reserved.</div>
      </div>
    </footer>
  );
}
