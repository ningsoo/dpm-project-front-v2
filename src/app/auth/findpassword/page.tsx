'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 10자 이상, 공백금지';

function validatePassword(p: string): string[] {
  const err: string[] = [];
  if (p.length < 10) err.push('10자 이상');
  if (!/[A-Z]/.test(p)) err.push('대문자 포함');
  if (!/[0-9]/.test(p)) err.push('숫자 포함');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) err.push('특수문자 포함');
  return err;
}

export default function FindPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const pwdErrors = newPassword ? validatePassword(newPassword) : [];
  const pwdOk = pwdErrors.length === 0;
  const confirmOk = newPassword && confirmPassword && newPassword === confirmPassword;
  const confirmError = confirmPassword && newPassword && newPassword !== confirmPassword;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // 기존 타이머가 있으면 취소
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }
    
    // input을 지우면 에러 메시지 제거
    if (!value) {
      setErrors((prev) => ({ ...prev, email: '' }));
      return;
    }
    
    // 입력이 멈춘 후 500ms 지연 후 검증
    emailDebounceRef.current = setTimeout(() => {
      let errorMsg = '';
      
      // 1순위: 한글 포함 검사 (완성형 한글 + 자음/모음 전부 금지)
      // 완성형 한글: \uAC00-\uD7A3, 한글 자음: \u1100-\u11FF, 한글 모음: \u1160-\u1175
      if (/[\uAC00-\uD7A3\u1100-\u11FF\u1160-\u1175]/.test(value)) {
        errorMsg = '이메일에 한글 사용 불가';
      }
      // 2순위: @ 없거나 이메일 형식이 아님
      else if (!value.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errorMsg = '올바른 이메일 형식이 아닙니다';
      }
      
      setErrors((prev) => ({ ...prev, email: errorMsg }));
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) {
        clearTimeout(emailDebounceRef.current);
      }
    };
  }, []);

  const handleSendEmail = async () => {
    if (!email || errors.email) return;
    setLoading(true);
    try {
      await authApi.findPassword(email);
      setEmailSent(true);
      setShowModal(true);
    } catch {
      ToastUtils.error('전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowModal(false);
  };

  const handleResendEmail = async () => {
    if (!email || errors.email) return;
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
    if (!pwdOk || !confirmOk) return;
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

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleReset} className={styles.form} noValidate>
        <h1 className={styles.h1}>비밀번호 재설정</h1>

        {/* 1. 이메일 input */}
        <label className={styles.label}>
          이메일
          <input
            type="text"
            inputMode="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={handleEmailChange}
            className={styles.input}
            disabled={loading}
          />
          <span className={styles.error}>{errors.email || ''}</span>
        </label>

        {/* 2. 비밀번호 재설정 메일 보내기 버튼 */}
        <button
          type="button"
          className={styles.submit}
          onClick={handleSendEmail}
          disabled={loading || !!errors.email || !email}
        >
          {loading ? '전송 중…' : '비밀번호 재설정 메일 전송'}
        </button>

        {/* 시각적 구분선 */}
        <div style={{ margin: '32px 0', borderTop: '1px solid #e0e0e0' }} />

        {/* 3. 새 비밀번호 input */}
        <label className={styles.label}>
          새 비밀번호
          <div className={styles.pwdWrap}>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder={PWD_REQUIRE}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              disabled={loading}
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
          <div style={{ marginTop: 4, fontSize: '0.8rem', lineHeight: 1.5, minHeight: '18px' }}>
            {newPassword && (
              <>
                {pwdErrors.length > 0 ? (
                  <span style={{ color: '#c62828' }}>{pwdErrors.join(' / ')}</span>
                ) : (
                  <span style={{ color: '#4caf50' }}>✓ 모든 조건을 만족합니다</span>
                )}
              </>
            )}
          </div>
        </label>

        {/* 4. 새 비밀번호 확인 input */}
        <label className={styles.label}>
          새 비밀번호 확인
          <div className={styles.pwdWrap}>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              disabled={loading}
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
          <span className={styles.error}>
            {confirmError ? '비밀번호가 일치하지 않습니다' : ''}
          </span>
        </label>

        {/* 5. 비밀번호 재설정 버튼 */}
        <button
          type="submit"
          className={styles.submit}
          disabled={loading || !pwdOk || !confirmOk}
        >
          {loading ? '처리 중…' : '비밀번호 재설정'}
        </button>

        {/* 6. 로그인으로 돌아가기 */}
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
