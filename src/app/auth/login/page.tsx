'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { authApi } from '@/api/authApi';
import { setUser } from '@/store/slices/authSlice';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!email) next.email = '이메일을 입력하세요';
    if (!password) next.password = '비밀번호를 입력하세요';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const { data } = await authApi.login({ email, password });
      const user = (data?.data as { user?: { id: string; email: string; nickname: string } })?.user;
      if (user) {
        dispatch(setUser({ id: user.id, email: user.email, nickname: user.nickname }));
      }
      router.push('/');
    } catch (err: unknown) {
      const res = err as { response?: { data?: { message?: string; code?: string } } };
      const msg = res?.response?.data?.message;
      const code = res?.response?.data?.code;
      if (msg?.includes('password') || msg?.includes(' incorrect')) {
        ToastUtils.error('이메일 또는 비밀번호가 올바르지 않습니다');
      } else if (code === 'DELETED') {
        ToastUtils.error('Deleted account');
      } else if (code === 'BANNED') {
        ToastUtils.error('No login permission');
      } else if (code === 'BLOCKED' && msg) {
        ToastUtils.error(`Access restricted until ${msg}`);
      } else {
        ToastUtils.error(msg || '로그인에 실패했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.h1}>로그인</h1>

        <label className={styles.label}>
          이메일
          <input
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            disabled={loading}
          />
          {errors.email && <span className={styles.error}>{errors.email}</span>}
        </label>

        <label className={styles.label}>
          비밀번호
          <div className={styles.pwdWrap}>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {errors.password && <span className={styles.error}>{errors.password}</span>}
        </label>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? '로그인 중…' : '로그인'}
        </button>

        <div className={styles.links}>
          <Link href="/auth/signup">회원가입</Link>
          <span style={{ margin: '0 8px' }}>|</span>
          <Link href="/auth/findpassword">비밀번호 찾기</Link>
        </div>
      </form>

      {loading && (
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
        </div>
      )}
    </div>
  );
}
