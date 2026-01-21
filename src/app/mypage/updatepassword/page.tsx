'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '@/app/auth/auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 / 10자 이상';

function validate(p: string): boolean {
  return (
    p.length >= 10 &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(p)
  );
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(newPassword) || newPassword !== confirm) return;
    setLoading(true);
    try {
      await mypageApi.updatePassword('', newPassword);
      setShowSuccess(true);
    } catch {
      ToastUtils.error('변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    router.push('/auth/login');
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
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowNew((s) => !s)}
              aria-label={showNew ? '숨기기' : '보기'}
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label className={styles.label}>
          새 비밀번호 확인
          <div className={styles.pwdWrap}>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="비밀번호 확인"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? '숨기기' : '보기'}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirm && newPassword !== confirm && (
            <span className={styles.error}>비밀번호가 일치하지 않습니다</span>
          )}
        </label>

        <button
          type="submit"
          className={styles.submit}
          disabled={!validate(newPassword) || newPassword !== confirm || loading}
        >
          {loading ? '변경 중…' : '변경'}
        </button>
      </form>

      {showSuccess && (
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
            <p style={{ margin: '0 0 16px' }}>비밀번호가 변경되었습니다. 다시 로그인해 주세요.</p>
            <button type="button" className={styles.submit} onClick={handleSuccessClose}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
