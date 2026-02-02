'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../auth.module.css';

// localStorage 키 생성 함수
const getResendKey = (email: string) => `verification_resend_${email}`;

// 재전송 기록 가져오기
const getResendHistory = (email: string): number[] => {
  if (typeof window === 'undefined' || !email) return [];
  try {
    const data = localStorage.getItem(getResendKey(email));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// 재전송 기록 저장하기
const saveResendHistory = (email: string, timestamps: number[]) => {
  if (typeof window === 'undefined' || !email) return;
  try {
    localStorage.setItem(getResendKey(email), JSON.stringify(timestamps));
  } catch {
    // localStorage 저장 실패 무시
  }
};

function VerificationContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = sp?.get('email') || '';

  const [checkingComplete, setCheckingComplete] = useState(false);
  const [resending, setResending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const lastResendTimeRef = useRef<number | null>(null);
  const resendCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 재전송 가능 여부 체크
  const checkResendAvailability = () => {
    if (!email) {
      setCanResend(false);
      return;
    }

    const history = getResendHistory(email);
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;

    // 10분보다 오래된 항목 제거
    const recentHistory = history.filter((timestamp) => timestamp > tenMinutesAgo);
    if (recentHistory.length !== history.length) {
      saveResendHistory(email, recentHistory);
    }

    // 10분 3회 제한 체크
    if (recentHistory.length >= 3) {
      setCanResend(false);
      return;
    }

    // 60초 쿨다운 체크
    if (lastResendTimeRef.current) {
      const timeSinceLastResend = now - lastResendTimeRef.current;
      if (timeSinceLastResend < 60 * 1000) {
        setCanResend(false);
        return;
      }
    }

    setCanResend(true);
  };

  // 주기적으로 재전송 가능 여부 체크
  useEffect(() => {
    checkResendAvailability();
    resendCheckIntervalRef.current = setInterval(checkResendAvailability, 1000);

    return () => {
      if (resendCheckIntervalRef.current) {
        clearInterval(resendCheckIntervalRef.current);
      }
    };
  }, [email]);

  // unmount 시 자동 이동 타이머 정리
  useEffect(() => {
    return () => {
      if (autoRedirectTimerRef.current) {
        clearTimeout(autoRedirectTimerRef.current);
        autoRedirectTimerRef.current = null;
      }
    };
  }, []);

  const handleComplete = async () => {
    if (!email) {
      ToastUtils.error('이메일 정보가 없습니다.');
      return;
    }

    if (checkingComplete || resending) return;

    setCheckingComplete(true);
    try {
      const { data } = await authApi.verifyStatus(email);

      // response.data.message 기준으로 ACTIVE / PENDING 판정
      if (data?.success === true && data?.message === 'ACTIVE') {
        if (autoRedirectTimerRef.current) {
          clearTimeout(autoRedirectTimerRef.current);
          autoRedirectTimerRef.current = null;
        }
        setShowModal(true);
        // 모달이 열린 시점에 3~5초 후 자동 이동 (중복 방지: 시작 전 clearTimeout 처리됨)
        autoRedirectTimerRef.current = setTimeout(() => {
          autoRedirectTimerRef.current = null;
          setShowModal(false);
          router.push('/auth/login');
        }, 4000);
      } else if (data?.success === true && data?.message === 'PENDING') {
        ToastUtils.error('이메일 인증을 먼저 진행하신 후 가입완료 버튼을 눌러주세요.\n인증은 5분 이내에 이루어져야 합니다.');
      } else {
        const message = data?.message || '인증 확인에 실패했습니다.';
        ToastUtils.error(message);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      ToastUtils.error(msg || '인증 확인에 실패했습니다.');
    } finally {
      setCheckingComplete(false);
    }
  };

  const handleModalConfirm = () => {
    if (autoRedirectTimerRef.current) {
      clearTimeout(autoRedirectTimerRef.current);
      autoRedirectTimerRef.current = null;
    }
    setShowModal(false);
    router.push('/auth/login');
  };

  const handleResend = async () => {
    if (!email) return;
    if (!canResend || checkingComplete || resending) return;

    setResending(true);
    try {
      await authApi.sendVerification(email);
      ToastUtils.success('메일이 다시 발송되었어요.\n그래도 메일이 보이지 않는다면 스팸함도 확인 해 주세요.');
      
      // 재전송 성공 시각 기록
      const now = Date.now();
      lastResendTimeRef.current = now;
      const history = getResendHistory(email);
      const tenMinutesAgo = now - 10 * 60 * 1000;
      const recentHistory = history.filter((timestamp) => timestamp > tenMinutesAgo);
      recentHistory.push(now);
      saveResendHistory(email, recentHistory);
      
      // 재전송 가능 여부 재체크
      checkResendAvailability();
    } catch {
      ToastUtils.error('재발송에 실패했습니다.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <h1 className={styles.h1}>이메일 인증</h1>
        <p className={styles.verifyText} style={{ whiteSpace: 'pre-line' }}>
          거의 다 왔어요!{'\n'}
          <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{email || '등록한 이메일'}</span> 으로 메일이 발송되었어요.{'\n'}
          5분 안에 이메일 인증 버튼을 누른 후,{'\n'}
          하단의 가입완료 버튼을 눌러주세요.
        </p>
        <button
          type="button"
          className={styles.submit}
          onClick={handleComplete}
          disabled={checkingComplete || resending}
        >
          {checkingComplete ? '확인 중…' : '가입완료'}
        </button>
        <div className={styles.resend}>
          <button 
            type="button" 
            onClick={handleResend}
            disabled={!canResend || checkingComplete || resending}
          >
            이메일을 받지 못하셨다면?
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
            <p style={{ margin: '0 0 16px', whiteSpace: 'pre-line' }}>
              이메일 인증이 완료되었어요. 환영합니다!{'\n'}확인 버튼을 눌러서 로그인을 진행 해 주세요.
            </p>
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
