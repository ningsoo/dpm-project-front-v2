'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 10자 이상, 공백금지';

function formatPhone(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 8);
  if (n.length === 0) return '';
  if (n.length <= 4) return n;
  return `${n.slice(0, 4)}-${n.slice(4)}`;
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

  const pwdErrors = password ? validatePassword(password) : [];
  const pwdOk = pwdErrors.length === 0;
  const confirmOk = password && confirmPassword && password === confirmPassword;
  const confirmError = confirmPassword && password && password !== confirmPassword;
  const nicknameHasSpecialChar = /[^a-zA-Z0-9가-힣_]/.test(nickname);
  const nicknameOk = nickname.length > 0 && nickname.length <= 10 && !nicknameHasSpecialChar;
  const phoneOk = /^\d{4}-\d{4}$/.test(phone) || /^\d{8}$/.test(phone);

  const handleEmailBlur = useCallback(async () => {
    if (!email) {
      setErrors((e) => ({ ...e, email: '' }));
      return;
    }
    try {
      const { data } = await authApi.checkEmail(email);
      const available = (data?.data as { available?: boolean })?.available;
      setErrors((e) => ({ ...e, email: available === false ? '이미 사용 중인 이메일입니다' : '' }));
    } catch {
      setErrors((e) => ({ ...e, email: '확인할 수 없습니다' }));
    }
  }, [email]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    // input을 지우면 에러 메시지 제거
    if (!value && errors.email) {
      setErrors((e) => ({ ...e, email: '' }));
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 10자 넘으면 입력 막기
    if (value.length > 10) return;
    setNickname(value);
    // 특수문자 에러 메시지 제거
    if (!/[^a-zA-Z0-9가-힣_]/.test(value) && errors.nickname) {
      setErrors((e) => ({ ...e, nickname: '' }));
    }
  };

  const handleNicknameCheck = useCallback(async () => {
    if (!nickname) {
      setErrors((e) => ({ ...e, nickname: '닉네임을 입력해주세요' }));
      return;
    }
    if (nicknameHasSpecialChar) {
      setErrors((e) => ({ ...e, nickname: '특수문자는 입력할 수 없습니다' }));
      return;
    }
    try {
      // TODO: 닉네임 중복 확인 API 호출
      // const { data } = await authApi.checkNickname(nickname);
      // const available = (data?.data as { available?: boolean })?.available;
      // setErrors((e) => ({ ...e, nickname: available === false ? '이미 사용 중인 닉네임입니다' : '' }));
      ToastUtils.success('사용 가능한 닉네임입니다');
      setErrors((e) => ({ ...e, nickname: '' }));
    } catch {
      setErrors((e) => ({ ...e, nickname: '확인할 수 없습니다' }));
    }
  }, [nickname, nicknameHasSpecialChar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdOk || !confirmOk || !nicknameOk || !phoneOk || errors.email) return;
    setLoading(true);
    setErrors({});
    try {
      // 연락처: 숫자만 추출하여 010 포함 11자리로 변환
      const phoneDigits = phone.replace(/\D/g, '');
      const phoneForServer = `010${phoneDigits}`;
      
      await authApi.signup({
        email,
        password,
        nickname,
        phone: phoneForServer,
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
            onChange={handleEmailChange}
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
          {password && pwdErrors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {pwdErrors.map((err, idx) => (
                <span key={idx} className={styles.error}>{err}</span>
              ))}
            </div>
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
          {confirmError && (
            <span className={styles.error}>위에 입력한 비밀번호와 일치하지 않습니다</span>
          )}
        </label>

        <label className={styles.label}>
          닉네임
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="특수문자 제외, 10자 이내"
              value={nickname}
              onChange={handleNicknameChange}
              className={styles.input}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleNicknameCheck}
              style={{
                padding: '8px 16px',
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                whiteSpace: 'nowrap',
              }}
            >
              중복확인
            </button>
          </div>
          {nicknameHasSpecialChar && (
            <span className={styles.error}>특수문자는 입력할 수 없습니다</span>
          )}
          {errors.nickname && (
            <span className={styles.error}>{errors.nickname}</span>
          )}
        </label>

        <label className={styles.label}>
          연락처
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999',
                pointerEvents: 'none',
                fontSize: '1rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                zIndex: 1,
                height: '1.5em',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              010-
            </span>
            <input
              type="tel"
              placeholder="1234-5678"
              value={phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                setPhone(formatPhone(value));
              }}
              className={styles.input}
              style={{
                paddingLeft: '48px',
                fontFamily: 'inherit',
                fontSize: '1rem',
                letterSpacing: '0',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 'calc(48px + 4ch)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999',
                pointerEvents: 'none',
                fontSize: '1rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                zIndex: 1,
                height: '1.5em',
                display: 'flex',
                alignItems: 'center',
                visibility: phone.length > 4 ? 'visible' : 'hidden',
              }}
            >
              -
            </span>
          </div>
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
