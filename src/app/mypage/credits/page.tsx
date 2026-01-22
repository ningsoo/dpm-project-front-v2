'use client';

import { useSelector } from 'react-redux';
import Link from 'next/link';
import { RootState } from '@/store';
import { useAuth } from '@/auth/AuthContext';
import styles from '../mypage.module.css';

export default function CreditsPage() {
  const reduxUser = useSelector((s: RootState) => s.auth.user);
  const { isLoggedIn, user: mockUser } = useAuth();

  // 목로그인 상태면 mockUser 사용, 아니면 Redux user 사용
  // MockUser를 UserInfo 형태로 변환
  const user = reduxUser || (mockUser ? {
    id: String(mockUser.id),
    email: mockUser.email,
    nickname: mockUser.nickname,
    phone: undefined,
    profileImage: undefined,
    role: mockUser.role,
    credits: undefined,
  } : null);

  if (!isLoggedIn) {
    return (
      <div className={styles.wrap}>
        <p>로그인이 필요합니다.</p>
        <Link href="/auth/login">로그인</Link>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.nickname}>POP 충전</h1>
      <p style={{ marginTop: 8, color: '#666' }}>
        Toss Payments 연동 후 충전 금액 선택 및 결제 flow가 표시됩니다.
      </p>
      <p style={{ marginTop: 8 }}>현재 보유: <strong>{user?.credits ?? 0} POP</strong></p>
    </div>
  );
}
