'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { adminApi } from '@/api/adminApi';
import { checkAuth } from '@/store/slices/authSlice';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { AppDispatch } from '@/store';
import styles from '../../auth.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('이메일을 입력하세요.');
      return;
    }
    if (!password) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await adminApi.login({ email: email.trim(), password });
      const data = res.data?.data as { accessToken?: string } | undefined;
      const token = data?.accessToken ?? (res.data as unknown as { accessToken?: string })?.accessToken;
      if (!token || typeof token !== 'string') {
        throw new Error('토큰을 받지 못했습니다.');
      }
      tokenUtils.setAccessToken(token);
      dispatch(checkAuth());
      ToastUtils.success('로그인되었습니다.');
      router.push('/adm1n');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : '로그인에 실패했습니다.');
      setError(typeof msg === 'string' ? msg : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.h1}>관리자 로그인</h1>

        <label className={styles.label}>
          이메일
          <input
            type="email"
            className={styles.input}
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
        </label>

        <label className={styles.label}>
          비밀번호
          <input
            type="password"
            className={styles.input}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </label>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? '로그인 중…' : '로그인'}
        </button>

        <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
          <Link href="/auth/login">일반 로그인으로 돌아가기</Link>
        </p>
      </form>
    </div>
  );
}
