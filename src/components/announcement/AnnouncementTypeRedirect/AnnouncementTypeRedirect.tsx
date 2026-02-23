'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { announcementApi, type FooterAnnounceType } from '@/api/announcementApi';
import styles from '@/components/board/BoardFormLayout/BoardFormLayout.module.css';

interface AnnouncementTypeRedirectProps {
  announceType: FooterAnnounceType;
}

export default function AnnouncementTypeRedirect({ announceType }: AnnouncementTypeRedirectProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'found' | 'not_found'>('loading');

  useEffect(() => {
    announcementApi
      .getByType(announceType)
      .then(({ data }) => {
        const id = data?.data?.announceId;
        if (id != null) {
          router.replace(`/announcement/${id}`);
          setStatus('found');
        } else {
          setStatus('not_found');
        }
      })
      .catch((err: unknown) => {
        const statusCode = (err as { response?: { status?: number } })?.response?.status;
        if (statusCode === 404) {
          setStatus('not_found');
        } else {
          setStatus('not_found');
        }
      });
  }, [announceType, router]);

  if (status === 'loading' || status === 'found') {
    return <div className={styles.loading}>로딩 중…</div>;
  }

  return (
    <div className={styles.loading}>
      <p>해당 공지사항이 존재하지 않습니다.</p>
      <Link href="/announcement" className={styles.retryBtn}>
        목록
      </Link>
    </div>
  );
}
