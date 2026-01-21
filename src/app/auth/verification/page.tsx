'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../auth.module.css';

function VerificationContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = sp?.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      await authApi.confirmVerification('');
      setShowModal(true);
    } catch {
      ToastUtils.error('인증 확인에 실패했습니다. 이메일 링크를 눌 후 다시 시도하세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowModal(false);
    router.push('/auth/login');
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await authApi.sendVerification(email);
      ToastUtils.success('인증 메일을 다시 보냈습니다.');
    } catch {
      ToastUtils.error('재발송에 실패했습니다.');
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <h1 className={styles.h1}>이메일 인증</h1>
        <p className={styles.verifyText}>
          거의 다 왔습니다! {email || '등록한 이메일'}로 인증 메일을 보냈습니다. 5분 이내에
          이메일의 인증 버튼을 누른 뒤, 아래 &apos;가입 완료&apos; 버튼을 클릭해 주세요.
        </p>
        <button
          type="button"
          className={styles.submit}
          onClick={handleComplete}
          disabled={loading}
        >
          {loading ? '확인 중…' : '가입 완료'}
        </button>
        <div className={styles.resend}>
          <button type="button" onClick={handleResend}>
            메일을 받지 못하셨나요? 다시 보내기
          </button>
        </div>
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
            <p style={{ margin: '0 0 16px' }}>가입이 완료되었습니다. 로그인해 주세요.</p>
            <button type="button" className={styles.submit} onClick={handleModalConfirm}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div className={styles.wrap}>로딩 중…</div>}>
      <VerificationContent />
    </Suspense>
  );
}
