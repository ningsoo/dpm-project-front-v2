'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import { validatePhonePartsStrict, validateNameFormatByRule } from '@/utils/authValidation';
import styles from '../auth.module.css';

const PWD_REQUIRE = '대문자, 숫자, 특수문자 포함 10자 이상, 공백금지';

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPhone(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 8);
  if (n.length === 0) return '';
  if (n.length <= 4) return n;
  return `${n.slice(0, 4)}-${n.slice(4)}`;
}

function validatePassword(p: string): string[] {
  const err: string[] = [];
  if (p.length < 10) err.push('10자 이상');
  if (!/[A-Z]/.test(p)) err.push('대문자 포함');
  if (!/[0-9]/.test(p)) err.push('숫자 포함');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) err.push('특수문자 포함');
  // 한글 검증 추가
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(p)) err.push('한글 금지');
  return err;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nickname, setNickname] = useState('');
  const phonePart0Ref = useRef<HTMLInputElement>(null);
  const phonePart1Ref = useRef<HTMLInputElement>(null);
  const phonePart2Ref = useRef<HTMLInputElement>(null);
  const [phonePart0, setPhonePart0] = useState('');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneErrorUx, setPhoneErrorUx] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailHangulError, setEmailHangulError] = useState('');
  const [emailFormatError, setEmailFormatError] = useState('');
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false); // 이메일 인증 완료 여부 (verifyStatus ACTIVE)
  const [nicknameVerified, setNicknameVerified] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);
  const [emailVerificationTimeoutMessage, setEmailVerificationTimeoutMessage] = useState('');
  const [emailVerificationInfoMessage, setEmailVerificationInfoMessage] = useState('');
  const [remainingSec, setRemainingSec] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const emailCheckShortRef = useRef<NodeJS.Timeout | null>(null);
  const nicknameDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const emailCheckSequenceRef = useRef(0);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const successModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verificationEmailRef = useRef<string | null>(null);
  const emailHangulErrorRef = useRef('');

  const pwdErrors = password ? validatePassword(password) : [];
  const pwdOk = pwdErrors.length === 0;
  const confirmOk = password && confirmPassword && password === confirmPassword;
  const confirmError = confirmPassword && password && password !== confirmPassword;
  const nameOk = name.length > 0 && !nameError;
  
  // 닉네임 형식 검사 함수 (우선순위: 공백 > 특수문자 > 한글 자음/모음 단독)
  const validateNicknameFormat = (value: string): string => {
    if (!value) return '';
    
    // 1순위: 공백 체크
    if (/\s/.test(value)) {
      return '공백은 입력할 수 없습니다';
    }
    
    // 2순위: 특수문자 체크 (언더스코어 제외)
    if (/[^a-zA-Z0-9가-힣_]/.test(value)) {
      return '특수문자는 입력할 수 없습니다';
    }
    
    // 3순위: 한글 자음/모음 단독 체크 (완성형 한글이 아닌 경우)
    // 호환 자모 범위: U+3130-U+318F (전체 한글 호환 자모 영역)
    if (/[\u3130-\u318F]/.test(value)) {
      return '한글은 완성형으로 입력해 주세요';
    }
    
    return '';
  };
  
  // 닉네임 형식 검사 통과 여부
  const nicknameFormatOk = nickname.length > 0 && nickname.length <= 10 && !validateNicknameFormat(nickname);
  const nicknameOk = nicknameFormatOk;
  const phoneValidation = validatePhonePartsStrict(phonePart0, phonePart1, phonePart2);
  const phoneComplete = phonePart0.length === 3 && phonePart1.length === 4 && phonePart2.length === 4;
  const phoneOk = phoneComplete && phoneValidation.ok;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const value = raw.replace(/[\uAC00-\uD7A3\u1100-\u11FF\u1160-\u11FF\u3130-\u318F]/g, '');
    setEmail(value);

    // 한글 감지: raw(원본) 기준. raw에 한글이 포함되면 즉시 에러, 없으면 즉시 제거
    const hasHangul = /[\uAC00-\uD7A3\u1100-\u11FF\u1160-\u11FF\u3130-\u318F]/.test(raw);
    const hangulError = hasHangul ? '한글은 입력할 수 없습니다' : '';
    setEmailHangulError(hangulError);
    emailHangulErrorRef.current = hangulError;

    // 타이핑 시 형식 에러 즉시 제거
    setEmailFormatError('');

    // 서버/중복 에러는 값 변경 시 제거(재입력 허용)
    setErrors((prev) => ({ ...prev, email: '' }));

    // 이메일 변경 시 폴링·카운트다운 중단 및 인증 관련 상태 초기화
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setEmailVerified(false);
    setEmailVerificationPending(false);
    setEmailVerificationTimeoutMessage('');
    setEmailVerificationInfoMessage('');
    setRemainingSec(0);
    setEmailAvailable(false);

    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }
    if (emailCheckShortRef.current) {
      clearTimeout(emailCheckShortRef.current);
      emailCheckShortRef.current = null;
    }
    if (!value) {
      setEmailFormatError('');
      return;
    }

    const formatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!formatValid) {
      setEmailAvailable(false);
    } else {
      emailCheckShortRef.current = setTimeout(async () => {
        emailCheckShortRef.current = null;
        if (emailHangulErrorRef.current || checkingEmail) {
          setEmailAvailable(false);
          return;
        }
        setCheckingEmail(true);
        const currentSequence = ++emailCheckSequenceRef.current;
        const valueToCheck = value;
        try {
          const { data } = await authApi.checkEmail(valueToCheck);
          const available = data?.data?.available;
          const message = data?.data?.message;
          if (currentSequence === emailCheckSequenceRef.current) {
            if (available === false) {
              setErrors((prev) => ({
                ...prev,
                email: message != null && message !== '' ? message : '이미 사용 중인 이메일입니다',
              }));
              setEmailAvailable(false);
            } else {
              setErrors((prev) => ({ ...prev, email: '' }));
              setEmailAvailable(true);
            }
          }
        } catch {
          if (currentSequence === emailCheckSequenceRef.current) {
            setEmailAvailable(false);
          }
        } finally {
          if (currentSequence === emailCheckSequenceRef.current) {
            setCheckingEmail(false);
          }
        }
      }, 150);
    }

    emailDebounceRef.current = setTimeout(() => {
      const formatValidLong = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!value.includes('@') || !formatValidLong) {
        if (!formatValidLong && value.includes('@')) {
          setEmailFormatError('올바른 이메일 형식이 아닙니다');
        } else {
          setEmailFormatError('');
        }
        setEmailAvailable(false);
        return;
      }
      setEmailFormatError('');
    }, 1200);
  };

  const stopVerificationTimers = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const applyVerifiedSuccess = useCallback(() => {
    stopVerificationTimers();
    setEmailVerified(true);
    setEmailVerificationPending(false);
    setEmailVerificationTimeoutMessage('');
    setEmailVerificationInfoMessage('');
    setRemainingSec(0);
  }, [stopVerificationTimers]);

  const applyExpired = useCallback(() => {
    stopVerificationTimers();
    setEmailVerified(false);
    setEmailVerificationPending(false);
    setEmailVerificationTimeoutMessage('인증 시간이 만료되었습니다. 다시 인증해 주세요.');
    setRemainingSec(0);
  }, [stopVerificationTimers]);

  const startVerifyStatusPolling = useCallback((emailToPoll: string) => {
    if (!emailToPoll) return;

    const check = async () => {
      try {
        const { data } = await authApi.verifyStatus(emailToPoll);
        const body = data?.data as { verified?: boolean; expired?: boolean; email?: string } | undefined;
        const verified = !!body?.verified;
        const expired = !!body?.expired;

        if (verified) {
          applyVerifiedSuccess();
          return;
        }
        if (expired) {
          applyExpired();
          return;
        }
      } catch {
        // 폴링 중 에러는 무시
      }
    };

    check();
    pollingIntervalRef.current = setInterval(check, 4000);
  }, [applyVerifiedSuccess, applyExpired]);

  const handleVerifyEmail = async () => {
    if (!email) {
      setErrors((prev) => ({ ...prev, email: '이메일을 입력하세요' }));
      return;
    }
    const formatOk = email.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!formatOk || errors.email || emailHangulError || emailFormatError) {
      return;
    }
    setEmailVerificationPending(true);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    try {
      await authApi.sendVerification(email);
      setEmailVerificationInfoMessage('인증 이메일이 발송되었습니다. 메일함을 확인 해 주세요.');
      setEmailVerified(false);
      setEmailVerificationTimeoutMessage('');
      setRemainingSec(300);
      verificationEmailRef.current = email;

      startVerifyStatusPolling(email);

      countdownIntervalRef.current = setInterval(() => {
        setRemainingSec((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            const emailToCheck = verificationEmailRef.current;
            if (emailToCheck) {
              authApi.verifyStatus(emailToCheck).then(({ data }) => {
                const body = data?.data as { verified?: boolean; expired?: boolean; email?: string } | undefined;
                const verified = !!body?.verified;
                if (verified) applyVerifiedSuccess();
                else applyExpired();
              }).catch(() => applyExpired());
            } else {
              applyExpired();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setEmailVerificationPending(false);
      setErrors((prev) => ({ ...prev, email: '인증 메일 발송에 실패했습니다' }));
    }
  };

  useEffect(() => {
    if (phoneDebounceRef.current) {
      clearTimeout(phoneDebounceRef.current);
      phoneDebounceRef.current = null;
    }
    if (phoneComplete) {
      phoneDebounceRef.current = setTimeout(() => {
        phoneDebounceRef.current = null;
        const result = validatePhonePartsStrict(phonePart0, phonePart1, phonePart2);
        setPhoneErrorUx(result.ok ? '' : result.error);
      }, 600);
    } else {
      setPhoneErrorUx('');
    }
    return () => {
      if (phoneDebounceRef.current) {
        clearTimeout(phoneDebounceRef.current);
      }
    };
  }, [phonePart0, phonePart1, phonePart2, phoneComplete]);

  useEffect(() => {
    return () => {
      if (emailDebounceRef.current) {
        clearTimeout(emailDebounceRef.current);
      }
      if (emailCheckShortRef.current) {
        clearTimeout(emailCheckShortRef.current);
      }
      if (nicknameDebounceRef.current) {
        clearTimeout(nicknameDebounceRef.current);
      }
      if (phoneDebounceRef.current) {
        clearTimeout(phoneDebounceRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (successModalTimerRef.current) {
        clearTimeout(successModalTimerRef.current);
        successModalTimerRef.current = null;
      }
    };
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setName(v);
    setNameTouched(true);
    setNameError(validateNameFormatByRule(v));
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 10자 넘으면 입력 막기
    if (value.length > 10) return;
    setNickname(value);
    
    // 닉네임 값이 바뀌면 중복확인 통과 상태 초기화
    setNicknameVerified(false);
    
    // 기존 타이머가 있으면 취소
    if (nicknameDebounceRef.current) {
      clearTimeout(nicknameDebounceRef.current);
    }
    
    // input을 지우면 에러 메시지 제거
    if (!value) {
      setErrors((prev) => ({ ...prev, nickname: '' }));
      return;
    }
    
    // 한글 조합 중이면 검사하지 않음 (조합이 끝나면 onCompositionEnd에서 검사)
    if (isComposing) {
      return;
    }
    
    // 입력이 멈춘 후 500ms 지연 후 형식 검사
    nicknameDebounceRef.current = setTimeout(() => {
      const errorMsg = validateNicknameFormat(value);
      setErrors((prev) => ({ ...prev, nickname: errorMsg }));
    }, 500);
  };

  const handleNicknameCheck = useCallback(async () => {
    if (!nicknameFormatOk || checkingNickname) {
      return;
    }
    
    setCheckingNickname(true);
    try {
      const { data } = await authApi.checkNickname(nickname);
      const available = data?.data?.available;
      if (available === false) {
        ToastUtils.error('중복된 닉네임입니다');
        setNicknameVerified(false);
      } else {
        ToastUtils.success('사용 가능합니다');
        setNicknameVerified(true);
      }
    } catch {
      ToastUtils.error('중복된 닉네임입니다');
      setNicknameVerified(false);
    } finally {
      setCheckingNickname(false);
    }
  }, [nickname, nicknameFormatOk, checkingNickname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // loading 중 submit 재진입 방지
    if (loading) return;

    // 제출 시점에 3칸 완성인데 prefix 규칙 위반이면 즉시 에러 표시
    if (phoneComplete && !phoneValidation.ok && phoneValidation.error) {
      setPhoneErrorUx(phoneValidation.error);
    }

    // name 재검증
    const nameErr = validateNameFormatByRule(name);
    setNameError(nameErr);
    const nameOkNow = name.length > 0 && !nameErr;

    // submit 조건 검사
    if (!pwdOk || !confirmOk || !nameOkNow || !nicknameOk || !phoneOk || errors.email || errors.nickname || !emailVerified || !nicknameVerified) {
      return;
    }
    
    setLoading(true);
    setErrors({});
    try {
      const phoneForServer = `${phonePart0}${phonePart1}${phonePart2}`;
      await authApi.signup({
        email,
        password,
        name,
        nickname,
        phoneNumber: phoneForServer,
      });
      setShowSuccessModal(true);
      if (successModalTimerRef.current) {
        clearTimeout(successModalTimerRef.current);
      }
      successModalTimerRef.current = setTimeout(() => {
        successModalTimerRef.current = null;
        router.push('/auth/login');
      }, 4000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const isTimeout = err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout');
        if (isTimeout) {
          ToastUtils.error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
          return;
        }
      }
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      ToastUtils.error(msg || '회원가입에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalConfirm = () => {
    if (successModalTimerRef.current) {
      clearTimeout(successModalTimerRef.current);
      successModalTimerRef.current = null;
    }
    setShowSuccessModal(false);
    router.push('/auth/login');
  };

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <h1 className={styles.h1}>회원가입</h1>

        <label className={styles.label}>
          이메일
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <input
              type="text"
              inputMode="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={handleEmailChange}
              className={styles.input}
              style={{ flex: 1, height: '48px', boxSizing: 'border-box', marginTop: 0 }}
            />
            <button
              type="button"
              onClick={handleVerifyEmail}
              disabled={!emailAvailable || emailVerified || emailVerificationPending || !!errors.email || !!emailHangulError || !!emailFormatError || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              className={styles.emailVerifyBtn}
              style={{
                backgroundColor: emailVerified ? '#4caf50' : emailVerificationPending ? '#999' : (emailAvailable && !errors.email && !emailHangulError && !emailFormatError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '#1976d2' : '#ccc'),
                cursor: emailVerified || emailVerificationPending ? 'not-allowed' : (emailAvailable && !errors.email && !emailHangulError && !emailFormatError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'pointer' : 'not-allowed'),
              }}
            >
              {emailVerified ? '인증완료' : emailVerificationPending ? formatCountdown(remainingSec) : '인증하기'}
            </button>
          </div>
          <div style={{ minHeight: 20, marginTop: 4, fontSize: '0.9rem', lineHeight: 1.4 }}>
            {errors.email ? <span className={styles.error}>{errors.email}</span> : null}
            {!errors.email && emailHangulError ? <span className={styles.error}>{emailHangulError}</span> : null}
            {!errors.email && !emailHangulError && emailFormatError ? <span className={styles.error}>{emailFormatError}</span> : null}
            {!errors.email && !emailHangulError && !emailFormatError && emailVerificationTimeoutMessage ? <span style={{ color: '#c62828' }}>{emailVerificationTimeoutMessage}</span> : null}
            {!errors.email && !emailHangulError && !emailFormatError && !emailVerificationTimeoutMessage && emailVerificationInfoMessage && !emailVerified ? <span className={styles.emailVerificationInfo}>{emailVerificationInfoMessage}</span> : null}
          </div>
        </label>

        <label className={styles.label}>
          비밀번호
          <div className={styles.pwdWrap}>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder={PWD_REQUIRE}
              value={password}
              onChange={(e) => {
                // 공백 자동 제거
                const normalizedValue = e.target.value.replace(/\s/g, '');
                setPassword(normalizedValue);
              }}
              className={styles.input}
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
          <div style={{ marginTop: 4, fontSize: '0.8rem', lineHeight: 1.5, minHeight: '18px' }}>
            {password && (
              <>
                {pwdErrors.length > 0 ? (
                  <span style={{ color: '#c62828' }}>{pwdErrors.join(' / ')}</span>
                ) : (
                  <span style={{ color: '#4caf50' }}>✓ 모든 조건을 만족합니다</span>
                )}
              </>
            )}
          </div>
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
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <span className={styles.error}>
            {confirmError ? '비밀번호가 일치하지 않습니다' : ''}
          </span>
        </label>

        <label className={styles.label}>
          이름
          <input
            type="text"
            placeholder="김산독"
            autoComplete="name"
            value={name}
            onChange={handleNameChange}
            className={styles.input}
          />
          <span className={styles.error}>
            {(nameTouched || submitAttempted) ? nameError : ''}
          </span>
        </label>

        <label className={styles.label}>
          닉네임
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
              placeholder="특수문자 제외, 10자 이내"
            value={nickname}
              onChange={handleNicknameChange}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                // 조합 종료 후 최종 값으로 다시 체크
                handleNicknameChange(e as any);
              }}
            className={styles.input}
              style={{ flex: 1, height: '48px', boxSizing: 'border-box', marginTop: 0 }}
            />
            <button
              type="button"
              onClick={handleNicknameCheck}
              disabled={!nicknameFormatOk}
              className={styles.actionBtn}
              style={{
                background: nicknameFormatOk ? '#1976d2' : '#ccc',
                cursor: nicknameFormatOk ? 'pointer' : 'not-allowed',
              }}
            >
              중복확인
            </button>
          </div>
          <span className={styles.error}>{errors.nickname || ''}</span>
        </label>

        <label className={styles.label}>
          연락처
          <div
            className={styles.input}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginTop: 6,
              gap: '4px',
              padding: '12px 14px',
            }}
          >
            <input
              ref={phonePart0Ref}
              type="tel"
              placeholder="010"
              value={phonePart0}
              onChange={(e) => {
                setPhoneTouched(true);
                const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                setPhonePart0(value);
                if (value.length === 3) phonePart1Ref.current?.focus();
              }}
              onPaste={(e) => {
                setPhoneTouched(true);
                e.preventDefault();
                const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 11);
                if (digits.length >= 11) {
                  setPhonePart0(digits.slice(0, 3));
                  setPhonePart1(digits.slice(3, 7));
                  setPhonePart2(digits.slice(7, 11));
                  phonePart2Ref.current?.focus();
                } else if (digits.length > 7) {
                  setPhonePart0(digits.slice(0, 3));
                  setPhonePart1(digits.slice(3, 7));
                  setPhonePart2(digits.slice(7));
                  phonePart2Ref.current?.focus();
                } else if (digits.length > 3) {
                  setPhonePart0(digits.slice(0, 3));
                  setPhonePart1(digits.slice(3));
                  phonePart1Ref.current?.focus();
                } else if (digits.length > 0) {
                  setPhonePart0(digits.slice(0, 3));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && phonePart0.length === 0) e.preventDefault();
              }}
              style={{ width: '50px', minWidth: '50px', textAlign: 'center', padding: '0 4px', border: 'none', outline: 'none', fontSize: '1rem', fontFamily: 'inherit', background: 'transparent' }}
              maxLength={3}
            />
            <span style={{ width: '8px', flexShrink: 0, textAlign: 'center', color: '#333', fontSize: '1rem' }}>-</span>
            <input
              ref={phonePart1Ref}
              type="tel"
              placeholder="1234"
              value={phonePart1}
              onChange={(e) => {
                setPhoneTouched(true);
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPhonePart1(value);
                if (value.length === 4) phonePart2Ref.current?.focus();
              }}
              onPaste={(e) => {
                setPhoneTouched(true);
                e.preventDefault();
                const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 11);
                if (digits.length >= 11) {
                  setPhonePart0(digits.slice(0, 3));
                  setPhonePart1(digits.slice(3, 7));
                  setPhonePart2(digits.slice(7, 11));
                  phonePart2Ref.current?.focus();
                } else if (digits.length >= 7) {
                  setPhonePart0(digits.slice(0, 3));
                  setPhonePart1(digits.slice(3, 7));
                  setPhonePart2(digits.slice(7));
                  phonePart2Ref.current?.focus();
                } else if (digits.length > 3) {
                  setPhonePart1(digits.slice(0, 4));
                  setPhonePart2(digits.slice(4, 8));
                  if (digits.length >= 8) phonePart2Ref.current?.focus();
                } else {
                  setPhonePart1(digits.slice(0, 4));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && phonePart1.length === 0) {
                  e.preventDefault();
                  phonePart0Ref.current?.focus();
                }
              }}
              style={{ width: '60px', minWidth: '60px', textAlign: 'center', padding: '0 4px', border: 'none', outline: 'none', fontSize: '1rem', fontFamily: 'inherit', background: 'transparent' }}
              maxLength={4}
            />
            <span style={{ width: '8px', flexShrink: 0, textAlign: 'center', color: '#333', fontSize: '1rem' }}>-</span>
            <input
              ref={phonePart2Ref}
              type="tel"
              placeholder="5678"
              value={phonePart2}
              onChange={(e) => {
                setPhoneTouched(true);
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPhonePart2(value);
              }}
              onPaste={(e) => {
                setPhoneTouched(true);
                e.preventDefault();
                const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 11);
                if (digits.length >= 11) {
                  setPhonePart0(digits.slice(0, 3));
                  setPhonePart1(digits.slice(3, 7));
                  setPhonePart2(digits.slice(7, 11));
                } else if (digits.length >= 7) {
                  setPhonePart0(digits.slice(0, 3));
                  setPhonePart1(digits.slice(3, 7));
                  setPhonePart2(digits.slice(7));
                } else if (digits.length > 3) {
                  setPhonePart1(digits.slice(0, 4));
                  setPhonePart2(digits.slice(4, 8));
                } else {
                  setPhonePart2(digits.slice(0, 4));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && phonePart2.length === 0) {
                  e.preventDefault();
                  phonePart1Ref.current?.focus();
                }
              }}
              style={{ width: '60px', minWidth: '60px', textAlign: 'center', padding: '0 4px', border: 'none', outline: 'none', fontSize: '1rem', fontFamily: 'inherit', background: 'transparent' }}
              maxLength={4}
            />
          </div>
          <div style={{ minHeight: '22px', marginTop: 4 }}>
            {(submitAttempted || (phoneTouched && phoneComplete)) && phoneErrorUx ? (
              <span className={styles.error}>{phoneErrorUx}</span>
            ) : null}
          </div>
        </label>

        <button
          type="submit"
          className={styles.submit}
          disabled={!pwdOk || !confirmOk || !nameOk || !nicknameOk || !phoneOk || !!errors.email || !!errors.nickname || !emailVerified || !nicknameVerified || loading}
        >
          {loading ? '처리 중…' : '가입하기'}
        </button>
      </form>

      {showSuccessModal && (
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
          <div style={{ padding: 24, background: '#fff', borderRadius: 12, maxWidth: 360, textAlign: 'center' }}>
            <p style={{ margin: '0 0 16px' }}>가입이 완료되었습니다.</p>
            <button type="button" className={styles.submit} onClick={handleSuccessModalConfirm}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
