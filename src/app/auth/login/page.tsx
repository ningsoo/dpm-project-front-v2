'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { authApi } from '@/api/authApi';
import { initializeAuth, setUser, type UserInfo } from '@/store/slices/authSlice';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

      // Access Token 저장 (Refresh Token은 서버 DB에만 저장되므로 클라이언트에서 저장하지 않음)
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

      // 응답에 사용자 정보가 있으면 먼저 저장 (UI 즉시 업데이트)
      if (responseData?.user) {
        const userInfo: UserInfo = {
          id: responseData.user.id,
          email: responseData.user.email,
          nickname: responseData.user.nickname,
          phone: responseData.user.phone,
          profileImage: responseData.user.profileImage,
          credits: responseData.user.credits,
        };
        dispatch(setUser(userInfo));
      }

      // 사용자 정보를 완전히 로드하기 위해 initializeAuth 호출
      // 이렇게 하면 mypage API를 통해 전체 사용자 정보를 가져옴
      // 실패해도 토큰은 유지되므로 안전하게 진행
      try {
        await dispatch(initializeAuth());
      } catch (error) {
        // initializeAuth 실패해도 토큰은 저장되어 있으므로 계속 진행
        console.warn('initializeAuth 실패 (토큰은 유지):', error);
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
          <span className={styles.error}>{errors.email || ''}</span>
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
          <span className={styles.error}>{errors.password || ''}</span>
        </label>

        <button type="submit" className={styles.submit} disabled={loading || !!errors.email}>
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
