'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import { normalizePasswordInput, validatePasswordBySignupRule } from '@/utils/authValidation';
import styles from '@/app/auth/auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 10자 이상, 공백금지';

const SAME_PASSWORD_MESSAGE = '현재 비밀번호와 동일한 비밀번호로 변경할 수 없습니다.';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const pwdErrors = newPassword ? validatePasswordBySignupRule(newPassword) : [];
  const pwdOk = pwdErrors.length === 0;
  const confirmOk = newPassword && confirm && newPassword === confirm;
  const confirmError = confirm && newPassword && newPassword !== confirm;

  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) router.push('/auth/login');
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return (
      <div className={styles.wrap}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdOk || !confirmOk) return;
    setLoading(true);
    try {
      await mypageApi.updatePassword(newPassword);
      setShowSuccessModal(true);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const message = typeof res?.message === 'string' ? res.message : '';
      if (message === SAME_PASSWORD_MESSAGE) {
        ToastUtils.error(message);
      } else {
        ToastUtils.error(message || '변경에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.h1}>비밀번호 변경</h1>

        <label className={styles.label}>
          새 비밀번호
          <div className={styles.pwdWrap}>
            <input
              type={showNew ? 'text' : 'password'}
              placeholder={PWD_REQUIRE}
              value={newPassword}
              onChange={(e) => setNewPassword(normalizePasswordInput(e.target.value))}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowNew((s) => !s)}
              aria-label={showNew ? '숨기기' : '보기'}
              tabIndex={-1}
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className={styles.pwdHelperRow}>
            {newPassword && (
              <>
                {pwdErrors.length > 0 ? (
                  <span className={styles.pwdError}>{pwdErrors.join(' / ')}</span>
                ) : (
                  <span className={styles.pwdOk}>✓ 모든 조건을 만족합니다</span>
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
              value={confirm}
              onChange={(e) => setConfirm(normalizePasswordInput(e.target.value))}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? '숨기기' : '보기'}
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
          disabled={!pwdOk || !confirmOk || loading}
        >
          {loading ? '변경 중…' : '변경하기'}
        </button>
      </form>

      {showSuccessModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.modalCardSm}>
            <p className={styles.modalMessage}>정상적으로 수정되었습니다.</p>
            <button
              type="button"
              className={styles.submit}
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/mypage');
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
