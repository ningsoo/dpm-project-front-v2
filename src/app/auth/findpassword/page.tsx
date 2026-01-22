'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 10자 이상, 공백금지';

function validatePassword(p: string): boolean {
  return (
    p.length >= 10 &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(p) &&
    !/\s/.test(p)
  );
}

function validatePasswordErrors(p: string): string[] {
  const err: string[] = [];
  if (/\s/.test(p)) err.push('공백은 사용할 수 없습니다');
  if (p.length < 10) err.push('10자 이상');
  if (!/[A-Z]/.test(p)) err.push('대문자 포함');
  if (!/[0-9]/.test(p)) err.push('숫자 포함');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) err.push('특수문자 포함');
  return err;
}

export default function FindPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [emailError, setEmailError] = useState('');
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // 기존 타이머가 있으면 취소
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }
    
    // input을 지우면 에러 메시지 제거
    if (!value) {
      setEmailError('');
      return;
    }
    
    // 입력이 멈춘 후 500ms 지연 후 @ 검증
    emailDebounceRef.current = setTimeout(() => {
      if (value && !value.includes('@')) {
        setEmailError('@가 포함되어야 합니다');
      } else {
        setEmailError('');
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) {
        clearTimeout(emailDebounceRef.current);
      }
    };
  }, []);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || emailError) return;
    setLoading(true);
    try {
      await authApi.findPassword(email);
      setShowModal(true);
    } catch {
      ToastUtils.error('전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowModal(false);
    setStep('reset');
  };

  const handleResendEmail = async () => {
    if (!email || emailError) return;
    setLoading(true);
    try {
      await authApi.findPassword(email);
      ToastUtils.success('이메일을 다시 보냈습니다.');
    } catch {
      ToastUtils.error('재전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(newPassword) || newPassword !== confirmPassword) return;
    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      ToastUtils.success('비밀번호가 변경되었습니다. 로그인해 주세요.');
      window.location.href = '/auth/login';
    } catch {
      ToastUtils.error('변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <div className={styles.wrap}>
        <form onSubmit={handleSendEmail} className={styles.form}>
          <h1 className={styles.h1}>비밀번호 재설정</h1>
          <label className={styles.label}>
            이메일
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={handleEmailChange}
              className={styles.input}
            />
            {emailError && <span className={styles.error}>{emailError}</span>}
          </label>
          <button type="submit" className={styles.submit} disabled={loading || !!emailError}>
            {loading ? '전송 중…' : '비밀번호 재설정 메일 보내기'}
          </button>
          <div className={styles.resend}>
            <Link href="/auth/login">로그인으로 돌아가기</Link>
          </div>
        </form>

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
                maxWidth: 400,
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 16px', lineHeight: 1.6 }}>
                <strong>{email}</strong>로 비밀번호 재설정 확인 메일이 발송되었어요. 5분 안에 비밀번호 재설정 버튼을 누른 후, 아래에서 새로운 비밀번호를 설정 해 주세요
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

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleReset} className={styles.form}>
        <h1 className={styles.h1}>비밀번호 변경</h1>
        <p className={styles.verifyText}>{email}로 보낸 링크에서 토큰을 확인한 후, 새 비밀번호를 입력하세요.</p>

        <label className={styles.label}>
          토큰 (이메일 링크에 포함)
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="토큰 입력"
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          새 비밀번호
          <div className={styles.pwdWrap}>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder={PWD_REQUIRE}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {newPassword && validatePasswordErrors(newPassword).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {validatePasswordErrors(newPassword).map((err, idx) => (
                <span key={idx} className={styles.error}>{err}</span>
              ))}
            </div>
          )}
        </label>

        <label className={styles.label}>
          새 비밀번호 확인
          <div className={styles.pwdWrap}>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <span className={styles.error}>비밀번호가 일치하지 않습니다</span>
          )}
        </label>

        <button
          type="submit"
          className={styles.submit}
          disabled={
            loading ||
            !validatePassword(newPassword) ||
            newPassword !== confirmPassword
          }
        >
          {loading ? '변경 중…' : '비밀번호 변경'}
        </button>

        <div className={styles.resend}>
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={loading}
            style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
          >
            이메일을 받지 못하셨다면?
          </button>
        </div>
      </form>
    </div>
  );
}
