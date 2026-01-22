'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useAuth } from '@/auth/AuthContext';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '@/app/auth/auth.module.css';

function formatPhone(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 7) return `${n.slice(0, 3)}-${n.slice(3)}`;
  return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
}

export default function UpdateProfilePage() {
  const router = useRouter();
  const reduxUser = useSelector((s: RootState) => s.auth.user);
  const { isLoggedIn, user: mockUser } = useAuth();
  const [nickname, setNickname] = useState(reduxUser?.nickname || mockUser?.nickname || '');
  const [phone, setPhone] = useState(reduxUser?.phone ? formatPhone(reduxUser.phone) : '');
  const [loading, setLoading] = useState(false);

  // 목로그인 상태면 mockUser 사용, 아니면 Redux user 사용
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await mypageApi.updateProfile({
        nickname,
        phone: phone.replace(/-/g, ''),
      });
      ToastUtils.success('Successfully updated');
      router.push('/mypage');
    } catch {
      ToastUtils.error('수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.h1}>프로필 수정</h1>

        <label className={styles.label}>
          닉네임
          <input
            type="text"
            placeholder="닉네임 (중복 확인)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          휴대폰 번호
          <input
            type="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className={styles.input}
          />
        </label>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? '저장 중…' : '저장'}
        </button>
      </form>

      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Link
          href="/mypage/withdraw"
          style={{ fontSize: '0.9rem', color: '#c62828', textDecoration: 'underline' }}
        >
          회원 탈퇴
        </Link>
      </div>
    </div>
  );
}
