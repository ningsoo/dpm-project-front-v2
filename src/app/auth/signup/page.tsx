'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 / 10자 이상';

function formatPhone(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 7) return `${n.slice(0, 3)}-${n.slice(3)}`;
  return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
}

function validatePassword(p: string): string[] {
  const err: string[] = [];
  if (p.length < 10) err.push('10자 이상');
  if (!/[A-Z]/.test(p)) err.push('대문자 포함');
  if (!/[0-9]/.test(p)) err.push('숫자 포함');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) err.push('특수문자 포함');
  return err;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pwdErrors = validatePassword(password);
  const pwdOk = pwdErrors.length === 0;
  const confirmOk = password && confirmPassword && password === confirmPassword;
  const nicknameOk = nickname.length > 0 && nickname.length <= 10 && !/[^a-zA-Z0-9가-힣_]/.test(nickname);
  const phoneOk = /^010-\d{4}-\d{4}$/.test(phone);

  const handleEmailBlur = useCallback(async () => {
    if (!email) return;
    try {
      const { data } = await authApi.checkEmail(email);
      const available = (data?.data as { available?: boolean })?.available;
      setErrors((e) => ({ ...e, email: available === false ? '이미 사용 중인 이메일입니다' : '' }));
    } catch {
      setErrors((e) => ({ ...e, email: '확인할 수 없습니다' }));
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdOk || !confirmOk || !nicknameOk || !phoneOk || errors.email) return;
    setLoading(true);
    setErrors({});
    try {
      await authApi.signup({
        email,
        password,
        nickname,
        phone: phone.replace(/-/g, ''),
      });
      await authApi.sendVerification(email);
      router.push(`/auth/verification?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      ToastUtils.error(msg || '회원가입에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.h1}>회원가입</h1>

        <label className={styles.label}>
          이메일
          <input
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            className={styles.input}
          />
          {errors.email && <span className={styles.error}>{errors.email}</span>}
        </label>

        <label className={styles.label}>
          비밀번호
          <div className={styles.pwdWrap}>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder={PWD_REQUIRE}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {pwdErrors.length > 0 && (
            <span className={styles.helper}>필요: {pwdErrors.join(', ')}</span>
          )}
        </label>

        <label className={styles.label}>
          비밀번호 확인
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
          {confirmPassword && password !== confirmPassword && (
            <span className={styles.error}>비밀번호가 일치하지 않습니다</span>
          )}
        </label>

        <label className={styles.label}>
          닉네임
          <input
            type="text"
            placeholder="특수문자 제외, 최대 10자"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={styles.input}
          />
          {nickname && !nicknameOk && (
            <span className={styles.error}>특수문자 제외, 최대 10자</span>
          )}
        </label>

        <label className={styles.label}>
          휴대폰 번호
          <input
            type="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className={styles.input}
          />
          {phone && !phoneOk && <span className={styles.error}>010-1234-5678 형식</span>}
        </label>

        <button
          type="submit"
          className={styles.submit}
          disabled={!pwdOk || !confirmOk || !nicknameOk || !phoneOk || !!errors.email || loading}
        >
          {loading ? '처리 중…' : '가입하기'}
        </button>
      </form>
    </div>
  );
}
