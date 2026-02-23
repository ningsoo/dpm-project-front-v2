'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tokenUtils } from '@/utils/tokenUtils';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './Footer.module.css';

export default function Footer() {
  const router = useRouter();

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
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          {/* 좌측: 사업자/회사 정보 */}
          <div className={styles.col}>
            <div className={styles.brand}>SOUNDOCK</div>

            <ul className={styles.infoList}>
              <li>
                <span className={styles.label}>대표</span>
                <span className={styles.value}>DOPAMINE</span>
              </li>
              <li>
                <span className={styles.label}>사업자 등록번호</span>
                <span className={styles.value}>844-33547-14612</span>
              </li>
              <li>
                <span className={styles.label}>주소</span>
                <span className={styles.value}>대구 어딘가</span>
              </li>
              <li>
                <span className={styles.label}>이메일</span>
                <a className={styles.link} href="mailto:dopamine@soundock.live">
                  dopamine@soundock.live
                </a>
              </li>
            </ul>
          </div>

          {/* 가운데: 정책/공지 */}
          <div className={styles.col}>
            <div className={styles.sectionTitle}>안내</div>
            <ul className={styles.linkList}>
              <li>
                <Link className={styles.link} href="/announcement">
                  공지사항
                </Link>
              </li>
              <li>
                <Link className={styles.link} href="/terms">
                  이용약관
                </Link>
              </li>
              <li>
                <a className={styles.link} href="/efinance">
                  전자금융거래관련
                </a>
              </li>
              <li>
                <Link className={styles.link} href="/event">
                  이벤트
                </Link>
              </li>
            </ul>
          </div>

          {/* 우측: 이벤트/문의 */}
          <div className={styles.col}>
            <div className={styles.sectionTitle}>고객지원</div>
            <ul className={styles.linkList}>
              <li>
                <Link className={styles.link} href="/privacy">
                  개인정보 처리방침
                </Link>
              </li>
              <li>
                <a className={styles.link} href="/inquiry" onClick={handleInquiryClick}>
                  문의하기
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 */}
        <div className={styles.bottom}>
          <div className={styles.copyright}>© SOUNDOCK. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}