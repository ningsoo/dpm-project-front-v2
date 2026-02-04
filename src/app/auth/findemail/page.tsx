'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import { sanitizeEmailInput, validateEmailForUX } from '@/utils/authValidation';
import styles from '../auth.module.css';

const DEFAULT_SUCCESS_MESSAGE = '입력하신 이메일로 확인 메일을 발송했습니다.';

export default function FindEmailPage() {
  const [email, setEmail] = useState('');
  const [emailHangulError, setEmailHangulError] = useState('');
  const [emailFormatError, setEmailFormatError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { canProceed: emailFormatOk } = validateEmailForUX(email);
  const emailValid = !emailHangulError && emailFormatOk;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { value, hadKorean } = sanitizeEmailInput(raw);
    setEmail(value);
    setEmailHangulError(hadKorean ? '한글은 입력할 수 없습니다' : '');
    setEmailFormatError('');

    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = null;
    }
    if (!value) return;

    emailDebounceRef.current = setTimeout(() => {
      emailDebounceRef.current = null;
      const { error } = validateEmailForUX(value);
      setEmailFormatError(error);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) {
        clearTimeout(emailDebounceRef.current);
        emailDebounceRef.current = null;
      }
    };
  }, []);

  const handleSendEmail = async () => {
    if (!emailValid || loading) return;
    setLoading(true);
    try {
      const { data } = await authApi.findEmail(email);
      if (data?.success) {
        ToastUtils.success(data?.message ?? DEFAULT_SUCCESS_MESSAGE);
      } else {
        ToastUtils.error(data?.message ?? '요청에 실패했습니다.');
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const message = typeof res?.message === 'string' ? res.message : '요청에 실패했습니다.';
      ToastUtils.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <h1 className={styles.h1}>이메일 찾기</h1>

        <label className={styles.label} htmlFor="email">
          이메일
          <input
            type="email"
            id="email"
            name="email"
            placeholder="example@gmail.com"
            autoComplete="email"
            className={styles.input}
            value={email}
            onChange={handleEmailChange}
          />
        </label>

        <div style={{ minHeight: '22px', marginTop: 4 }}>
          {emailHangulError ? (
            <span className={styles.error}>{emailHangulError}</span>
          ) : emailFormatError ? (
            <span className={styles.error}>{emailFormatError}</span>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.submit}
          onClick={handleSendEmail}
          disabled={!emailValid || loading}
        >
          {loading ? '발송 중…' : '이메일 발송'}
        </button>

        <div className={styles.links}>
          <Link href="/auth/login">로그인으로 돌아가기</Link>
        </div>
      </form>
    </div>
  );
}
