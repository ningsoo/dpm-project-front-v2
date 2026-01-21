'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import styles from '@/app/auth/auth.module.css';

const TERMS = `
회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
적립된 POP, 작성 글, 댓글, 플레이리스트 등이 모두 삭제됩니다.
`;

export default function WithdrawPage() {
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const [checked, setChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const handleWithdraw = () => {
    if (!checked) return;
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // API: e.g. DELETE /api/auth/withdraw or PATCH /api/mypage/withdraw
      // await authApi.withdraw();
      // dispatch(logout());
      router.push('/');
    } catch {
      // ToastUtils.error('탈퇴 처리에 실패했습니다.');
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <h1 className={styles.h1}>회원 탈퇴</h1>
        <pre
          style={{
            marginBottom: 20,
            padding: 16,
            fontSize: '0.9rem',
            lineHeight: 1.6,
            background: '#f5f5f5',
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
          }}
        >
          {TERMS}
        </pre>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          위 내용을 모두 확인했습니다.
        </label>
        <button
          type="button"
          className={styles.submit}
          style={{ background: '#c62828' }}
          onClick={handleWithdraw}
          disabled={!checked}
        >
          탈퇴하기
        </button>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              padding: 24,
              background: '#fff',
              borderRadius: 12,
              maxWidth: 360,
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 16px' }}>정말 탈퇴하시겠습니까?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className={styles.submit}
                style={{ background: '#999' }}
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.submit}
                style={{ background: '#c62828' }}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? '처리 중…' : '탈퇴'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
