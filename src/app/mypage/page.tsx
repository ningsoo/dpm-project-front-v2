'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { CreditCard, Key, User } from 'lucide-react';
import { RootState } from '@/store';
import styles from './mypage.module.css';

const TABS = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'posts', label: 'My Posts' },
  { id: 'comments', label: 'My Comments' },
  { id: 'liked', label: 'Liked Posts' },
  { id: 'payment', label: 'Payment History' },
  { id: 'creditUsage', label: 'Credit Usage History' },
  { id: 'settlement', label: 'Settlement History' },
  { id: 'reports', label: 'Report History' },
] as const;

export default function MypagePage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const [tab, setTab] = useState<string>('playlists');

  if (!user) {
    return (
      <div className={styles.wrap}>
        <p>로그인이 필요합니다.</p>
        <Link href="/auth/login">로그인</Link>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.profile}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar} />
        </div>
        <div className={styles.profileText}>
          <h1 className={styles.nickname}>{user.nickname}</h1>
          <div className={styles.email}>{user.email}</div>
          <div className={styles.phone}>{user.phone || '—'}</div>
          <div className={styles.credits}>POP {user.credits ?? 0}</div>
        </div>
        <div className={styles.profileActions}>
          <Link href="/mypage/credits" className={styles.iconLink} title="POP 충전">
            <CreditCard size={22} />
          </Link>
          <Link href="/mypage/updatepassword" className={styles.iconLink} title="비밀번호 변경">
            <Key size={22} />
          </Link>
          <Link href="/mypage/updateprofile" className={styles.iconLink} title="프로필 수정">
            <User size={22} />
          </Link>
        </div>
      </section>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? styles.tabActive : styles.tab}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {tab === 'playlists' && <div>Playlists 탭: 플레이리스트 목록</div>}
        {tab === 'posts' && <div>My Posts: 검색 + Board/Title/Date/Views/Likes</div>}
        {tab === 'comments' && <div>My Comments: 검색 + Content/Date/Original post/Board</div>}
        {tab === 'liked' && <div>Liked Posts: Board/Title/Author/Date/Views/Likes</div>}
        {tab === 'payment' && <div>Payment History: 기간, Charge date/Amount/Remaining/...</div>}
        {tab === 'creditUsage' && <div>Credit Usage: Donation/Advertisement 필터</div>}
        {tab === 'settlement' && <div>Settlement History: Pending/Approved/Rejected/Completed</div>}
        {tab === 'reports' && <div>Report History: 일괄 삭제</div>}
      </div>
    </div>
  );
}
