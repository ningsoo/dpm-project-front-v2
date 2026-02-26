'use client';

import { useId, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { useNonce } from '@/contexts/NonceContext';
import { authApi } from '@/api/authApi';
import { checkAuth } from '@/store/slices/authSlice';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { sanitizeEmailInput, validateEmailForUX, normalizePasswordInput } from '@/utils/authValidation';
import styles from '../auth.module.css';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const nonce = useNonce();
  const baseId = useId().replace(/:/g, '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailHangulError, setEmailHangulError] = useState('');
  const [emailFormatError, setEmailFormatError] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'passwordless'>('password');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [registerDoneModalOpen, setRegisterDoneModalOpen] = useState(false);
  const [pwlsRegisterLoading, setPwlsRegisterLoading] = useState(false);
  const [pwlsModalError, setPwlsModalError] = useState('');
  const [pwlsQrUrl, setPwlsQrUrl] = useState<string | null>(null);
  const [pwlsServerUrl, setPwlsServerUrl] = useState('');
  const [pwlsRegisterKey, setPwlsRegisterKey] = useState('');
  const PWLS_REG_TOTAL_SEC = 60;
  const [pwlsRemainSec, setPwlsRemainSec] = useState(0);
  const [pwlsCode6, setPwlsCode6] = useState<string | null>(null);
  const [pwlsUserId, setPwlsUserId] = useState('');
  const [pwlsSessionId, setPwlsSessionId] = useState('');
  const PWLSPOLLING_INTERVAL_MS = 2000;
  const PWLS_LOGIN_TOTAL_SEC = 60;
  const [pwlsLoginRemainSec, setPwlsLoginRemainSec] = useState(0);
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pwlsPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pwlsLoginTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pwlsRegTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pwlsUserIdRef = useRef('');
  const pwlsSessionIdRef = useRef('');
  const pwlsPollingConsecutiveErrorsRef = useRef(0);
  const pwlsResultPollingInFlightRef = useRef(false);
  const pwlsResultPollingCompletedRef = useRef(false);

  /** 승인 폴링(timeout id) + 로그인 60초 타이머 정리. 호출: 모드 전환, 언마운트, QR 모달 닫기. */
  const resetPasswordlessState = () => {
    pwlsResultPollingCompletedRef.current = true;
    setQrModalOpen(false);
    if (pwlsPollingRef.current) {
      clearTimeout(pwlsPollingRef.current);
      pwlsPollingRef.current = null;
    }
    if (pwlsLoginTimerRef.current) {
      clearInterval(pwlsLoginTimerRef.current);
      pwlsLoginTimerRef.current = null;
    }
    if (pwlsRegTimerRef.current) {
      clearInterval(pwlsRegTimerRef.current);
      pwlsRegTimerRef.current = null;
    }
    setPwlsCode6(null);
    setPwlsUserId('');
    setPwlsSessionId('');
    setPwlsLoginRemainSec(0);
    setPwlsQrUrl(null);
    setPwlsModalError('');
    setPwlsServerUrl('');
    setPwlsRegisterKey('');
    setPwlsRemainSec(0);
    pwlsUserIdRef.current = '';
    pwlsSessionIdRef.current = '';
    pwlsPollingConsecutiveErrorsRef.current = 0;
  };

  /** 60초 만료 시: 폴링/타이머 종료, 코드·userId·sessionId 초기화, 토스트 */
  const clearPwlsLoginAndToastExpired = () => {
    pwlsResultPollingCompletedRef.current = true;
    if (pwlsLoginTimerRef.current) {
      clearInterval(pwlsLoginTimerRef.current);
      pwlsLoginTimerRef.current = null;
    }
    if (pwlsPollingRef.current) {
      clearTimeout(pwlsPollingRef.current);
      pwlsPollingRef.current = null;
    }
    setPwlsCode6(null);
    setPwlsUserId('');
    setPwlsSessionId('');
    setPwlsLoginRemainSec(0);
    pwlsUserIdRef.current = '';
    pwlsSessionIdRef.current = '';
    ToastUtils.error('인증 시간이 만료되었습니다');
  };

  /**
   * 취소: 클릭 즉시 60초 타이머·result 폴링 중단, 승인대기 UI 상태 초기화 후 POST /passwordless/cancel.
   * 200 → info "인증을 취소했습니다" 고정(서버 메시지 노출 금지). 400/500 → error(서버 message).
   */
  const cancelPasswordlessLogin = async () => {
    pwlsResultPollingCompletedRef.current = true;
    const sessionId = pwlsSessionIdRef.current || pwlsSessionId;
    if (pwlsLoginTimerRef.current) {
      clearInterval(pwlsLoginTimerRef.current);
      pwlsLoginTimerRef.current = null;
    }
    if (pwlsPollingRef.current) {
      clearTimeout(pwlsPollingRef.current);
      pwlsPollingRef.current = null;
    }
    setPwlsCode6(null);
    setPwlsUserId('');
    setPwlsSessionId('');
    setPwlsLoginRemainSec(0);
    pwlsUserIdRef.current = '';
    pwlsSessionIdRef.current = '';
    try {
      await authApi.postPasswordlessCancel({ email: email.trim(), sessionId });
      ToastUtils.info('인증을 취소했습니다');
    } catch (err) {
      const status = (err as Error & { status?: number })?.status;
      const message = err instanceof Error ? err.message : '취소 요청에 실패했습니다';
      if (status === 400) ToastUtils.error(message);
      else if (status === 500) ToastUtils.error(message);
      else ToastUtils.error(message);
    }
  };

  /** 로그인 6자리 코드 표시 시 60초 카운트다운. 0이 되면 clearPwlsLoginAndToastExpired */
  const startPwlsLoginTimer = () => {
    if (pwlsLoginTimerRef.current) {
      clearInterval(pwlsLoginTimerRef.current);
      pwlsLoginTimerRef.current = null;
    }
    const id = setInterval(() => {
      setPwlsLoginRemainSec((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          pwlsLoginTimerRef.current = null;
          queueMicrotask(() => clearPwlsLoginAndToastExpired());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    pwlsLoginTimerRef.current = id;
  };

  /** QR 등록 60초 카운트다운 */
  const startPwlsRegTimer = () => {
    if (pwlsRegTimerRef.current) {
      clearInterval(pwlsRegTimerRef.current);
      pwlsRegTimerRef.current = null;
    }
    const id = setInterval(() => {
      setPwlsRemainSec((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          pwlsRegTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    pwlsRegTimerRef.current = id;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => ToastUtils.info('복사되었습니다'),
      () => ToastUtils.error('복사에 실패했습니다')
    );
  };

  /** Passwordless 설정 모달: QR 발급/재발급 */
  const requestPwlsQR = async () => {
    if (!email.trim()) {
      setPwlsModalError('이메일을 입력하세요');
      return;
    }
    setPwlsRegisterLoading(true);
    setPwlsModalError('');
    try {
      const res = await authApi.postPasswordlessRegister(email.trim());
      setPwlsQrUrl(res.qrUrl);
      setPwlsServerUrl(res.serverUrl ?? '');
      setPwlsRegisterKey(res.registerKey ?? '');
      setPwlsRemainSec(PWLS_REG_TOTAL_SEC);
      startPwlsRegTimer();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'QR 발급에 실패했습니다';
      setPwlsModalError(message);
    } finally {
      setPwlsRegisterLoading(false);
    }
  };

  /**
   * POST /passwordless/result 직렬 폴링. 트리거는 pwlsCode6만. userId/sessionId는 ref만 사용.
   * auth=Y 수신 즉시 completedRef=true + clear → 추가 요청 없음. auth=Y인데 토큰 없으면 실패 종료.
   */
  useEffect(() => {
    if (!pwlsCode6 || !pwlsUserIdRef.current || !pwlsSessionIdRef.current) return;

    pwlsResultPollingCompletedRef.current = true;
    if (pwlsPollingRef.current) {
      clearTimeout(pwlsPollingRef.current);
      pwlsPollingRef.current = null;
    }
    pwlsResultPollingInFlightRef.current = false;
    pwlsResultPollingCompletedRef.current = false;

    const clearPollingAndTimer = () => {
      if (pwlsPollingRef.current) {
        clearTimeout(pwlsPollingRef.current);
        pwlsPollingRef.current = null;
      }
      if (pwlsLoginTimerRef.current) {
        clearInterval(pwlsLoginTimerRef.current);
        pwlsLoginTimerRef.current = null;
      }
    };

    const clearPwlsLoginState = () => {
      setPwlsCode6(null);
      setPwlsUserId('');
      setPwlsSessionId('');
      setPwlsLoginRemainSec(0);
      pwlsUserIdRef.current = '';
      pwlsSessionIdRef.current = '';
      pwlsPollingConsecutiveErrorsRef.current = 0;
    };

    const scheduleNext = () => {
      if (pwlsResultPollingCompletedRef.current) return;
      if (pwlsPollingRef.current) {
        clearTimeout(pwlsPollingRef.current);
        pwlsPollingRef.current = null;
      }
      pwlsPollingRef.current = setTimeout(poll, PWLSPOLLING_INTERVAL_MS);
    };

    const poll = async () => {
      if (pwlsResultPollingCompletedRef.current) return;
      if (pwlsResultPollingInFlightRef.current) return;
      pwlsResultPollingInFlightRef.current = true;
      try {
        const res = await authApi.postPasswordlessResult({
          userId: pwlsUserIdRef.current,
          sessionId: pwlsSessionIdRef.current,
        });
        if (pwlsResultPollingCompletedRef.current) return;
        pwlsPollingConsecutiveErrorsRef.current = 0;
        const auth = res.auth != null ? String(res.auth) : '';
        if (auth === 'C') {
          pwlsResultPollingCompletedRef.current = true;
          clearPollingAndTimer();
          clearPwlsLoginState();
          ToastUtils.info('패스워드리스 인증이 취소되었습니다.');
          return;
        }
        if (auth === 'Y') {
          const hasToken =
            typeof res.accessToken === 'string' && res.accessToken.trim() !== '';
          pwlsResultPollingCompletedRef.current = true;
          clearPollingAndTimer();
          if (hasToken) {
            try {
              tokenUtils.setAccessToken(res.accessToken!);
            } catch {
              ToastUtils.error('토큰 저장에 실패했습니다');
              clearPwlsLoginState();
              pwlsResultPollingInFlightRef.current = false;
              return;
            }
            clearPwlsLoginState();
            dispatch(checkAuth());
            const redirect = searchParams.get('redirect');
            const isSafeRedirect =
              redirect &&
              typeof redirect === 'string' &&
              redirect.startsWith('/') &&
              !redirect.startsWith('//');
            router.push(isSafeRedirect ? redirect : '/');
          } else {
            clearPwlsLoginState();
            ToastUtils.error('토큰을 받지 못했습니다');
          }
          return;
        }
        scheduleNext();
      } catch (err) {
        if (pwlsResultPollingCompletedRef.current) return;
        const message = err instanceof Error ? err.message : '';
        const status = (err as Error & { status?: number })?.status;
        if (status === 400) {
          const isCancel = message.includes('패스워드리스 인증이 취소');
          pwlsResultPollingCompletedRef.current = true;
          clearPollingAndTimer();
          clearPwlsLoginState();
          if (isCancel) {
            ToastUtils.info(message || '패스워드리스 인증이 취소되었습니다.');
          } else {
            ToastUtils.error(message || '인증 확인에 실패했습니다.');
          }
          return;
        }
        if (status === 403) {
          pwlsResultPollingCompletedRef.current = true;
          clearPollingAndTimer();
          clearPwlsLoginState();
          ToastUtils.error(message || '인증 확인에 실패했습니다.');
          return;
        }
        if (status === 500) {
          pwlsPollingConsecutiveErrorsRef.current += 1;
          if (pwlsPollingConsecutiveErrorsRef.current >= 3) {
            pwlsResultPollingCompletedRef.current = true;
            clearPollingAndTimer();
            clearPwlsLoginState();
            ToastUtils.error('서빙 API 통신 실패');
            return;
          }
        } else {
          pwlsResultPollingCompletedRef.current = true;
          clearPollingAndTimer();
          clearPwlsLoginState();
          ToastUtils.error(message || '인증 확인에 실패했습니다.');
          return;
        }
        scheduleNext();
      } finally {
        pwlsResultPollingInFlightRef.current = false;
      }
    };

    poll();
    return () => {
      pwlsResultPollingCompletedRef.current = true;
      if (pwlsPollingRef.current) {
        clearTimeout(pwlsPollingRef.current);
        pwlsPollingRef.current = null;
      }
      if (pwlsLoginTimerRef.current) {
        clearInterval(pwlsLoginTimerRef.current);
        pwlsLoginTimerRef.current = null;
      }
    };
  }, [pwlsCode6, dispatch, searchParams, router]);

  /** 언마운트 시 승인 폴링(timeout) + 로그인/등록 60초 타이머 정리 */
  useEffect(() => {
    return () => {
      if (pwlsPollingRef.current) {
        clearTimeout(pwlsPollingRef.current);
        pwlsPollingRef.current = null;
      }
      if (pwlsLoginTimerRef.current) {
        clearInterval(pwlsLoginTimerRef.current);
        pwlsLoginTimerRef.current = null;
      }
      if (pwlsRegTimerRef.current) {
        clearInterval(pwlsRegTimerRef.current);
        pwlsRegTimerRef.current = null;
      }
    };
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { value, hadKorean } = sanitizeEmailInput(raw);
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: '' }));
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

    // Passwordless 로그인: POST login-trigger → userId/sessionId 저장 → 승인 대기(pending) → 2초마다 result 폴링. 60초 타이머.
    if (loginMode === 'passwordless') {
      if (!email.trim()) {
        ToastUtils.error('이메일을 입력하세요');
        return;
      }
      if (pwlsCode6 || loading) return;
      setLoading(true);
      setErrors({});
      try {
        const res = await authApi.postPasswordlessLoginTrigger(email.trim());
        pwlsUserIdRef.current = res.userId;
        pwlsSessionIdRef.current = res.sessionId;
        setPwlsUserId(res.userId);
        setPwlsSessionId(res.sessionId);
        setPwlsCode6(res.code6);
        setPwlsLoginRemainSec(PWLS_LOGIN_TOTAL_SEC);
        startPwlsLoginTimer();
      } catch (err) {
        const status = (err as Error & { status?: number })?.status;
        const message = err instanceof Error ? err.message : '로그인 요청에 실패했습니다';
        if (status === 400) ToastUtils.error('패스워드리스가 등록 되어있지 않습니다.');
        else if (status === 403) ToastUtils.error('사용할 수 없는 아이디 입니다. 관리자에게 문의해주세요.');
        else if (status === 404) ToastUtils.error('존재하지 않는 유저입니다.');
        else if (status === 500) ToastUtils.error('서빙 API 통신 실패');
        else ToastUtils.error(message);
      } finally {
        setLoading(false);
      }
      return;
    }

    const next: Record<string, string> = {};
    if (!email.trim()) next.email = '이메일을 입력하세요.';
    if (!password.trim()) next.password = '비밀번호를 입력하세요.';
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
      const res = err as { response?: { status?: number; data?: { message?: string } } };
      const status = res?.response?.status;
      const msg = typeof res?.response?.data?.message === 'string' ? res.response.data.message : undefined;
      if (status === 401) {
        if (msg?.includes('패스워드리스 서비스를 사용 중입니다')) {
          ToastUtils.error(msg);
        } else if (
          msg === '가입되지 않은 계정입니다.' ||
          msg === '비밀번호가 일치하지 않습니다.'
        ) {
          ToastUtils.error('이메일 또는 비밀번호가 일치하지 않습니다.');
        } else if (msg?.includes('사용할 수 없는 아이디')) {
          ToastUtils.error('사용할 수 없는 이메일입니다');
        } else {
          ToastUtils.error('이메일 또는 비밀번호가 일치하지 않습니다.');
        }
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
          {loginMode === 'passwordless' && pwlsCode6 ? (
            <>
              <div className={styles.codeBox}>
                <p className={styles.codeHint}>휴대폰에서 승인해주세요</p>
                <p className={styles.codeHint}>승인 대기 중…</p>
                <p className={styles.codeHint}>인증 코드: {pwlsCode6}</p>
                <div className={styles.codeGaugeTrack} aria-hidden="true">
                  <div
                    className={`${styles.codeGaugeBar} ${nonce ? `pwls-login-gauge-${baseId}` : ''}`}
                    style={
                      !nonce
                        ? {
                            width: `${PWLS_LOGIN_TOTAL_SEC > 0 ? (pwlsLoginRemainSec / PWLS_LOGIN_TOTAL_SEC) * 100 : 0}%`,
                          }
                        : undefined
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                className={styles.codeCancelBtn}
                onClick={cancelPasswordlessLogin}
              >
                취소
              </button>
            </>
          ) : (
            <>
              <div className={styles.pwdWrap}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder={loginMode === 'passwordless' ? '' : '비밀번호 입력'}
                  value={password}
                  onChange={(e) => {
                    setPassword(normalizePasswordInput(e.target.value));
                    setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  className={loginMode === 'passwordless' ? `${styles.input} ${styles.inputPwlsDisabled}` : styles.input}
                  disabled={loading || loginMode === 'passwordless'}
                  readOnly={loginMode === 'passwordless'}
                />
                {loginMode === 'password' && (
                  <button
                    type="button"
                    className={styles.eye}
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? '비밀번호 숨기기' : '비밀번호 보기'}
                    tabIndex={0}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
              <span className={styles.error}>{errors.password || ''}</span>
            </>
          )}
        </label>

        <div className={styles.radioRow} role="radiogroup" aria-label="로그인 방식">
          <label className={styles.radioItem}>
            <input
              type="radio"
              name="loginMode"
              value="password"
              checked={loginMode === 'password'}
              onChange={() => {
                setLoginMode('password');
                resetPasswordlessState();
              }}
            />
            <span>Password</span>
          </label>
          <label className={styles.radioItem}>
            <input
              type="radio"
              name="loginMode"
              value="passwordless"
              checked={loginMode === 'passwordless'}
              onChange={() => {
                setLoginMode('passwordless');
                resetPasswordlessState();
              }}
            />
            <span>Passwordless</span>
          </label>
        </div>

        <button
          type="submit"
          className={styles.submit}
          disabled={
            loading ||
            !!emailHangulError ||
            !!emailFormatError ||
            !!errors.email ||
            (loginMode === 'passwordless' && !!pwlsCode6)
          }
        >
          {loading ? '로그인 중…' : loginMode === 'passwordless' && pwlsCode6 ? '승인 대기 중…' : '로그인'}
        </button>

        <div className={styles.links}>
          <Link href="/auth/signup">회원가입</Link>
          <span className={styles.linkSep}>|</span>
          <Link href="/auth/findemail">이메일 찾기</Link>
          <span className={styles.linkSep}>|</span>
          <Link href="/auth/findpassword">비밀번호 찾기</Link>
        </div>
      </form>

      {loading && (
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
        </div>
      )}

      {qrModalOpen && (
        <div
          className={styles.pwlsModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwls-modal-title"
          onClick={resetPasswordlessState}
        >
          <div className={styles.pwlsModalCard} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.pwlsModalCloseBtn}
              onClick={resetPasswordlessState}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            <h2 id="pwls-modal-title" className={`${styles.h1} ${styles.h1Mb8}`}>
              Passwordless 설정
            </h2>
            <p className={styles.pwlsModalSubtext}>
              휴대폰 앱으로 QR을 스캔해 등록하세요
            </p>

            <div className={styles.pwlsQrBox}>
              {pwlsRegisterLoading && <div className={styles.spinner} />}
              {!pwlsRegisterLoading && pwlsModalError && (
                <span className={styles.error}>{pwlsModalError}</span>
              )}
              {!pwlsRegisterLoading && pwlsQrUrl && !pwlsModalError && (
                <img src={pwlsQrUrl} alt="QR 코드" />
              )}
            </div>

            {pwlsServerUrl != null && pwlsServerUrl !== '' && (
              <div className={styles.pwlsCopyRow}>
                <span className={styles.pwlsCopyLabel}>serverUrl</span>
                <span className={styles.pwlsCopyValue}>{pwlsServerUrl}</span>
                <button
                  type="button"
                  className={styles.pwlsCopyBtn}
                  onClick={() => copyToClipboard(pwlsServerUrl!)}
                >
                  복사
                </button>
              </div>
            )}
            {pwlsRegisterKey != null && pwlsRegisterKey !== '' && (
              <div className={styles.pwlsCopyRow}>
                <span className={styles.pwlsCopyLabel}>registerKey</span>
                <span className={styles.pwlsCopyValue}>{pwlsRegisterKey}</span>
                <button
                  type="button"
                  className={styles.pwlsCopyBtn}
                  onClick={() => copyToClipboard(pwlsRegisterKey!)}
                >
                  복사
                </button>
              </div>
            )}

            {pwlsQrUrl && pwlsRemainSec > 0 && (
              <>
                <div className={styles.pwlsTimerRow}>
                  {Math.floor(pwlsRemainSec / 60)}:{String(pwlsRemainSec % 60).padStart(2, '0')}
                </div>
                <div className={styles.pwlsProgressTrack}>
                  <div
                    className={`${styles.pwlsProgressBar} ${nonce ? `pwls-reg-gauge-${baseId}` : ''}`}
                    style={
                      !nonce
                        ? {
                            width: `${PWLS_REG_TOTAL_SEC > 0 ? (pwlsRemainSec / PWLS_REG_TOTAL_SEC) * 100 : 0}%`,
                          }
                        : undefined
                    }
                  />
                </div>
              </>
            )}

            {pwlsRemainSec === 0 && pwlsQrUrl && (
              <div className={styles.pwlsExpiredRow}>
                <p className={styles.pwlsExpiredMsg}>만료됨</p>
                <button
                  type="button"
                  className={styles.submit}
                  disabled={pwlsRegisterLoading}
                  onClick={() => requestPwlsQR()}
                >
                  {pwlsRegisterLoading ? '발급 중…' : 'QR 재발급'}
                </button>
              </div>
            )}
            {pwlsModalError && !pwlsQrUrl && (
              <div className={styles.pwlsExpiredRow}>
                <p className={styles.pwlsExpiredMsg}>{pwlsModalError}</p>
                <button
                  type="button"
                  className={styles.submit}
                  disabled={pwlsRegisterLoading}
                  onClick={() => requestPwlsQR()}
                >
                  {pwlsRegisterLoading ? '처리 중…' : '재시도'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {registerDoneModalOpen && (
        <div
          className={styles.pwlsModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwls-register-done-title"
          onClick={() => setRegisterDoneModalOpen(false)}
        >
          <div className={styles.pwlsModalCard} onClick={(e) => e.stopPropagation()}>
            <h2 id="pwls-register-done-title" className={`${styles.h1} ${styles.h1Mb16}`}>
              등록 완료
            </h2>
            <p className={styles.pwlsRegisterDoneText}>
              Passwordless 서비스가 등록되었습니다.
            </p>
            <div className={styles.pwlsRegisterDoneActions}>
              <button
                type="button"
                className={styles.submit}
                onClick={() => setRegisterDoneModalOpen(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {nonce && (
        <style
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: [
              `.pwls-login-gauge-${baseId}{width:${PWLS_LOGIN_TOTAL_SEC > 0 ? (pwlsLoginRemainSec / PWLS_LOGIN_TOTAL_SEC) * 100 : 0}%;}`,
              `.pwls-reg-gauge-${baseId}{width:${PWLS_REG_TOTAL_SEC > 0 ? (pwlsRemainSec / PWLS_REG_TOTAL_SEC) * 100 : 0}%;}`,
            ].join(''),
          }}
        />
      )}
    </div>
  );
}
