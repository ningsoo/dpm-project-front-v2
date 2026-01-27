'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import styles from '@/app/auth/auth.module.css';

const TERMS = `동일한 이메일 주소로는 1달 이내에 재가입할 수 없습니다.
재가입 제한을 위해 개인정보는 30일간 보관 후 파기됩니다.

구매하신 POP에 대한 안내

- 구매 시점으로 7일 이내
    POP을 사용하지 않으셨다면 전액 환불
    사용 내역이 있으시면 사용분 제외한 잔여 POP 환불

- 구매 시점으로 7일 초과
    환불 수수료를 공제하고 환불 (공제율 총 비용의 10%)`;

export default function WithdrawPage() {
  const router = useRouter();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const [checked, setChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return (
      <div className={styles.wrap}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.wrap}>
        <p>로그인이 필요합니다.</p>
        <Link href="/auth/login">로그인</Link>
      </div>
    );
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
        <div
          style={{
            marginBottom: 20,
            padding: 0,
            fontSize: '0.9rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            textAlign: 'left',
          }}
        >
          {TERMS}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          위 내용을 모두 확인하였습니다
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
                onClick={() => {
                  setShowModal(false);
                  router.push('/mypage');
                }}
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
