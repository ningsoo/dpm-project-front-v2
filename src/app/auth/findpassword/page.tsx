'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 / 10자 이상';

function validatePassword(p: string): boolean {
  return (
    p.length >= 10 &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(p)
  );
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

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authApi.findPassword(email);
      ToastUtils.success('비밀번호 재설정 메일을 보냈습니다. 이메일을 확인하세요.');
      setStep('reset');
      // In real app, token comes from email link query. For form we keep email and expect backend to accept token in next step.
    } catch {
      ToastUtils.error('전송에 실패했습니다.');
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
          <h1 className={styles.h1}>비밀번호 찾기</h1>
          <label className={styles.label}>
            이메일
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
            />
          </label>
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? '전송 중…' : '비밀번호 재설정 메일 보내기'}
          </button>
          <div className={styles.resend}>
            <Link href="/auth/login">로그인으로 돌아가기</Link>
          </div>
        </form>
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
          <button type="button" onClick={() => setStep('email')} style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}>
            이메일 다시 입력
          </button>
        </div>
      </form>
    </div>
  );
}
