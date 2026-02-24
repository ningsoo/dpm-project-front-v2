'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import { normalizePasswordInput, validatePasswordBySignupRule } from '@/utils/authValidation';
import styles from '../../auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 10자 이상, 공백금지';

export default function FindPasswordResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const pwdErrors = newPassword ? validatePasswordBySignupRule(newPassword) : [];
  const pwdOk = pwdErrors.length === 0;
  const confirmOk = newPassword && confirmPassword && newPassword === confirmPassword;
  const confirmError = confirmPassword && newPassword && newPassword !== confirmPassword;
  const submitEnabled = pwdOk && confirmOk;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedEmail = sessionStorage.getItem('findpassword_email');
    const storedToken = sessionStorage.getItem('findpassword_reset_token');
    if (storedEmail && storedToken) {
      setEmail(storedEmail);
      setResetToken(storedToken);
    } else {
      router.replace('/auth/findpassword');
    }
  }, [router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !resetToken || !submitEnabled) return;
    setLoading(true);
    try {
      await authApi.resetPassword(email, resetToken, newPassword);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('findpassword_email');
        sessionStorage.removeItem('findpassword_reset_token');
      }
      setShowModal(true);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const message = data?.message;
      ToastUtils.error(
        message != null && String(message).trim() !== ''
          ? String(message).trim()
          : '변경에 실패했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowModal(false);
    router.push('/auth/login');
  };

  if (email === null || resetToken === null) {
    return null;
  }

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleReset} className={styles.form} noValidate>
        <h1 className={styles.h1}>비밀번호 재설정</h1>

        <label className={styles.label}>
          새 비밀번호
          <div className={styles.pwdWrap}>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder={PWD_REQUIRE}
              value={newPassword}
              onChange={(e) => setNewPassword(normalizePasswordInput(e.target.value))}
              className={styles.input}
              disabled={loading}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? '비밀번호 숨기기' : '비밀번호 보기'}
              tabIndex={-1}
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

        <label className={styles.label}>
          새 비밀번호 확인
          <div className={styles.pwdWrap}>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(normalizePasswordInput(e.target.value))}
              className={styles.input}
              disabled={loading}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <span className={styles.error}>
            {confirmError ? '비밀번호가 일치하지 않습니다' : ''}
          </span>
        </label>

        <button
          type="submit"
          className={styles.submit}
          disabled={loading || !submitEnabled}
        >
          {loading ? '처리 중…' : '비밀번호 재설정'}
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
          <div style={{ padding: 24, background: '#fff', borderRadius: 12, maxWidth: 480, width: '90%', textAlign: 'center' }}>
            <p style={{ margin: '0 0 16px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              비밀번호가 성공적으로 변경되었습니다.{'\n'}로그인을 진행 해 주세요.
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
