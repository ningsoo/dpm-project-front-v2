'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import { sanitizeEmailInput, validateEmailForUX } from '@/utils/authValidation';
import styles from '../auth.module.css';

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FindPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailHangulError, setEmailHangulError] = useState('');
  const [emailFormatError, setEmailFormatError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailSentMessage, setEmailSentMessage] = useState('');
  const [remainingSec, setRemainingSec] = useState(0);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailFormatOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const sendButtonEnabled =
    !!email &&
    !emailHangulError &&
    !emailFormatError &&
    !errors.email &&
    emailFormatOk &&
    remainingSec === 0;
  const sendButtonInCooldown = remainingSec > 0;
  const verifyCodeOk = /^\d{6}$/.test(verifyCode);
  const confirmButtonEnabled = verifyCodeOk;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { value, hadKorean } = sanitizeEmailInput(raw);
    setEmail(value);
    setEmailHangulError(hadKorean ? '한글은 입력할 수 없습니다' : '');
    setEmailFormatError('');
    setErrors((prev) => ({ ...prev, email: '' }));

    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }
    if (!value) {
      setErrors((prev) => ({ ...prev, email: '' }));
      return;
    }

    emailDebounceRef.current = setTimeout(() => {
      const { error } = validateEmailForUX(value);
      setEmailFormatError(error);
      setErrors((prev) => ({ ...prev, email: '' }));
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) {
        clearTimeout(emailDebounceRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  const handleSendEmail = async () => {
    if (!sendButtonEnabled || loading) return;
    setLoading(true);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    try {
      await authApi.findPassword(email);
      setEmailSent(true);
      setEmailSentMessage('인증 이메일이 발송되었습니다. 메일함을 확인 해 주세요.');
      setRemainingSec(300);
      countdownIntervalRef.current = setInterval(() => {
        setRemainingSec((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setErrors((prev) => ({ ...prev, email: '인증 메일 발송에 실패했습니다' }));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 6);
    setVerifyCode(digitsOnly);
  };

  const handleConfirmVerify = async () => {
    if (!confirmButtonEnabled || verifyLoading) return;
    setVerifyLoading(true);
    try {
      const { data } = await authApi.verifyFindPasswordCode(email, verifyCode);
      const resetToken = data?.data;
      if (typeof window !== 'undefined' && resetToken) {
        sessionStorage.setItem('findpassword_email', email);
        sessionStorage.setItem('findpassword_reset_token', resetToken);
      }
      router.push('/auth/findpassword/reset');
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const message = data?.message;
      const msg =
        message != null && String(message).trim() !== ''
          ? String(message).trim()
          : '인증번호 확인에 실패했습니다. 다시 확인해 주세요.';
      ToastUtils.error(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <h1 className={styles.h1}>비밀번호 재설정</h1>

        <label className={styles.label}>
          이메일
          <div className={styles.flexRow8}>
            <input
              type="text"
              inputMode="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={handleEmailChange}
              className={`${styles.input} ${styles.inputFullHeight}`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={!sendButtonEnabled || loading}
              className={`${styles.emailVerifyBtn} ${sendButtonEnabled && !loading ? styles.emailVerifyBtnReady : styles.emailVerifyBtnPending}`}
            >
              {loading ? '전송 중…' : sendButtonInCooldown ? formatCountdown(remainingSec) : '인증번호'}
            </button>
          </div>
          <div className={styles.messageRow}>
            {errors.email ? <span className={styles.error}>{errors.email}</span> : null}
            {!errors.email && emailHangulError ? (
              <span className={styles.error}>{emailHangulError}</span>
            ) : null}
            {!errors.email && !emailHangulError && emailFormatError ? (
              <span className={styles.error}>{emailFormatError}</span>
            ) : null}
            {!errors.email && !emailHangulError && !emailFormatError && emailSentMessage ? (
              <span className={styles.textWarning}>{emailSentMessage}</span>
            ) : null}
          </div>
        </label>

        {emailSent && (
          <>
            <label className={`${styles.label} ${styles.labelMt16}`}>
              인증번호
              <div className={styles.flexRow8}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="이메일로 받은 6자리 숫자"
                  value={verifyCode}
                  onChange={handleVerifyCodeChange}
                  maxLength={6}
                  className={`${styles.input} ${styles.inputFullHeight}`}
                  disabled={verifyLoading}
                />
                <button
                  type="button"
                  onClick={handleConfirmVerify}
                  disabled={!confirmButtonEnabled || verifyLoading}
                  className={`${styles.emailVerifyBtn} ${confirmButtonEnabled && !verifyLoading ? styles.emailVerifyBtnReady : styles.emailVerifyBtnPending}`}
                >
                  {verifyLoading ? '확인 중…' : '확인'}
                </button>
              </div>
            </label>
          </>
        )}
      </div>
    </div>
  );
}
