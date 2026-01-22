'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setMockLogin, clearMockLogin, cleanupAllMockData } from '@/auth/mock/mockAuth';
import { useAuth } from '@/auth/AuthContext';

export default function MockLoginPage() {
  const router = useRouter();
  const { isLoggedIn, user, refreshFromStorage } = useAuth();

  // production이면 즉시 리다이렉트
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/');
    }
  }, [router]);

  // production이면 렌더링 차단
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleMockLogin = (destination: string) => {
    setMockLogin();
    refreshFromStorage();
    router.push(destination);
  };

  const handleMockLogout = () => {
    clearMockLogin();
    refreshFromStorage();
    router.push('/');
  };

  const handleCleanup = () => {
    cleanupAllMockData();
    refreshFromStorage();
  };

  const loginButtons = [
    { label: '목로그인 → 홈', destination: '/' },
    { label: '목로그인 → 마이페이지', destination: '/mypage' },
    { label: '목로그인 → 정보수정', destination: '/mypage/updateprofile' },
    { label: '목로그인 → 비밀번호 변경', destination: '/mypage/updatepassword' },
    { label: '목로그인 → 크레딧', destination: '/mypage/credits' },
    { label: '목로그인 → 보드', destination: '/boards' },
  ];

  return (
    <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 24 }}>목로그인 (개발 전용)</h1>

      <div style={{ marginBottom: 32, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>현재 상태</h2>
        <p>
          <strong>로그인 상태:</strong> {isLoggedIn ? '로그인됨' : '로그아웃됨'}
        </p>
        {user && (
          <div style={{ marginTop: 12 }}>
            <p>
              <strong>사용자 정보:</strong>
            </p>
            <pre style={{ background: '#fff', padding: 12, borderRadius: 4, overflow: 'auto' }}>
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>목로그인 버튼</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loginButtons.map((btn) => (
            <button
              key={btn.destination}
              type="button"
              onClick={() => handleMockLogin(btn.destination)}
              style={{
                padding: '12px 24px',
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          type="button"
          onClick={handleMockLogout}
          style={{
            padding: '12px 24px',
            background: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          목로그아웃
        </button>

        <button
          type="button"
          onClick={handleCleanup}
          style={{
            padding: '12px 24px',
            background: '#ed6c02',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          전체 목데이터 삭제
        </button>
      </div>
    </div>
  );
}
