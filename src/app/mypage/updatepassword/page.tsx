'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useAuth } from '@/auth/AuthContext';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '@/app/auth/auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 10자 이상, 공백금지';

function validate(p: string): boolean {
  return (
    p.length >= 10 &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(p) &&
    !/\s/.test(p)
  );
}

function validatePassword(p: string): string[] {
  const err: string[] = [];
  if (/\s/.test(p)) err.push('공백은 사용할 수 없습니다');
  if (p.length < 10) err.push('10자 이상');
  if (!/[A-Z]/.test(p)) err.push('대문자 포함');
  if (!/[0-9]/.test(p)) err.push('숫자 포함');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) err.push('특수문자 포함');
  return err;
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const reduxUser = useSelector((s: RootState) => s.auth.user);
  const { isLoggedIn, user: mockUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 목로그인 상태면 mockUser 사용, 아니면 Redux user 사용
  const user = reduxUser || (mockUser ? {
    id: String(mockUser.id),
    email: mockUser.email,
    nickname: mockUser.nickname,
    phone: undefined,
    profileImage: undefined,
    role: mockUser.role,
    credits: undefined,
  } : null);

  if (!isLoggedIn) {
    return (
      <div className={styles.wrap}>
        <p>로그인이 필요합니다.</p>
        <Link href="/auth/login">로그인</Link>
      </div>
    );
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
          {newPassword && validatePassword(newPassword).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {validatePassword(newPassword).map((err, idx) => (
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
