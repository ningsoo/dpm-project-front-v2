'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { authApi } from '@/api/authApi';
import { checkAuth } from '@/store/slices/authSlice';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { sanitizeEmailInput, validateEmailForUX, normalizePasswordInput, validatePasswordBySignupRule } from '@/utils/authValidation';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailHangulError, setEmailHangulError] = useState('');
  const [emailFormatError, setEmailFormatError] = useState('');
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { value, hadKorean } = sanitizeEmailInput(raw);
    setEmail(value);
    setEmailHangulError(hadKorean ? '한글은 입력할 수 없습니다' : '');
    setEmailFormatError('');

    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }
    if (!value) {
      setErrors((prev) => ({ ...prev, email: '' }));
      return;
    }

    emailDebounceRef.current = setTimeout(() => {
      const { error, canProceed } = validateEmailForUX(value);
      setEmailFormatError(error);
      setErrors((prev) => ({ ...prev, email: '' }));
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) {
        clearTimeout(emailDebounceRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!email) next.email = '이메일을 입력하세요';
    if (!password) next.password = '비밀번호를 입력하세요';
    const pwdErr = validatePasswordBySignupRule(password);
    if (pwdErr.length > 0) next.password = pwdErr.join(' / ');
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const { data } = await authApi.login({ email, password });
      
      // API 응답 구조 확인: data.data 또는 data 직접 접근
      const responseData = (data?.data || data) as {
        user?: { id: string; email: string; nickname: string; phone?: string; profileImage?: string; credits?: number };
        accessToken?: string;
        token?: string;
      };

      // Access Token 추출 (다양한 필드명 지원)
      const accessToken = responseData?.accessToken || responseData?.token;
      
      if (!accessToken || typeof accessToken !== 'string') {
        console.error('로그인 응답 데이터:', data);
        ToastUtils.error('토큰을 받지 못했습니다. 응답 구조를 확인해주세요.');
        return;
      }

      // Access Token 저장 (Refresh Token은 HttpOnly 쿠키로 관리되어 프론트에서 저장/접근하지 않음)
      try {
        tokenUtils.setAccessToken(accessToken);
        
        // 토큰 저장 확인
        const savedToken = tokenUtils.getAccessToken();
        if (!savedToken || savedToken !== accessToken) {
          console.error('토큰 저장 실패:', { 
            accessToken: accessToken.substring(0, 20) + '...', 
            savedToken: savedToken?.substring(0, 20) + '...',
            localStorageAvailable: typeof window !== 'undefined' && typeof localStorage !== 'undefined'
          });
          ToastUtils.error('토큰 저장에 실패했습니다.');
          return;
        }
      } catch (error) {
        console.error('토큰 저장 중 오류:', error);
        ToastUtils.error('토큰 저장 중 오류가 발생했습니다.');
        return;
      }

      // Redux에 인증 상태 업데이트
      dispatch(checkAuth());

      // 이전 페이지(redirect)로 이동, 없으면 홈으로
      const redirect = searchParams.get('redirect');
      const isSafeRedirect =
        redirect &&
        typeof redirect === 'string' &&
        redirect.startsWith('/') &&
        !redirect.startsWith('//');
      router.push(isSafeRedirect ? redirect : '/');
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
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <h1 className={styles.h1}>로그인</h1>

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
          <span className={styles.error}>{emailHangulError || emailFormatError || errors.email || ''}</span>
        </label>

        <label className={styles.label}>
          비밀번호
          <div className={styles.pwdWrap}>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(normalizePasswordInput(e.target.value))}
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
          <span className={styles.error}>{errors.password || ''}</span>
        </label>

        <button type="submit" className={styles.submit} disabled={loading || !!emailHangulError || !!emailFormatError || !!errors.email}>
          {loading ? '로그인 중…' : '로그인'}
        </button>

        <div className={styles.links}>
          <Link href="/auth/signup">회원가입</Link>
          <span style={{ margin: '0 8px' }}>|</span>
          <Link href="/auth/findemail">이메일 찾기</Link>
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
