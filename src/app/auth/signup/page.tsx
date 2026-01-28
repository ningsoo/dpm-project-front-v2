'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  const phonePart1Ref = useRef<HTMLInputElement>(null);
  const phonePart2Ref = useRef<HTMLInputElement>(null);
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const nicknameDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const pwdErrors = password ? validatePassword(password) : [];
  const pwdOk = pwdErrors.length === 0;
  const confirmOk = password && confirmPassword && password === confirmPassword;
  const confirmError = confirmPassword && password && password !== confirmPassword;
  
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
  const phoneOk = phonePart1.length === 4 && phonePart2.length === 4;

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
      if (nicknameDebounceRef.current) {
        clearTimeout(nicknameDebounceRef.current);
      }
    };
  }, []);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 10자 넘으면 입력 막기
    if (value.length > 10) return;
    setNickname(value);
    
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
    if (!nicknameFormatOk) {
      return;
    }
    
    try {
      // TODO: 닉네임 중복 확인 API 호출
      // const { data } = await authApi.checkNickname(nickname);
      // const available = (data?.data as { available?: boolean })?.available;
      // if (available === false) {
      //   ToastUtils.error('중복된 닉네임입니다');
      // } else {
      //   ToastUtils.success('사용 가능합니다');
      // }
      ToastUtils.success('사용 가능합니다');
    } catch {
      ToastUtils.error('중복된 닉네임입니다');
    }
  }, [nickname, nicknameFormatOk]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdOk || !confirmOk || !nicknameOk || !phoneOk || errors.email) return;
    setLoading(true);
    setErrors({});
    try {
      // 연락처: 숫자만 추출하여 010 포함 11자리로 변환
      const phoneForServer = `010${phonePart1}${phonePart2}`;
      
      await authApi.signup({
        email,
        password,
        nickname,
        phoneNumber: phoneForServer,
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
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <h1 className={styles.h1}>회원가입</h1>

        <label className={styles.label}>
          이메일
          <input
            type="text"
            inputMode="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={handleEmailChange}
            className={styles.input}
          />
          <span className={styles.error}>{errors.email || ''}</span>
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
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <span className={styles.error}>
            {confirmError ? '비밀번호가 일치하지 않습니다' : ''}
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
              style={{
                padding: '0 16px',
                background: nicknameFormatOk ? '#1976d2' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: nicknameFormatOk ? 'pointer' : 'not-allowed',
                fontSize: 14,
                whiteSpace: 'nowrap',
                height: '48px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
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
              position: 'relative', 
              display: 'flex',
              alignItems: 'center',
              padding: '12px 14px',
              marginTop: 6,
              gap: '8px',
            }}
          >
            {/* 고정된 010 텍스트 */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0',
                color: '#333',
                pointerEvents: 'none',
                fontSize: '1rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: 'none',
                width: '32px',
                flexShrink: 0,
              }}
            >
              010
            </span>
            {/* 고정된 - 텍스트 */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#333',
                pointerEvents: 'none',
                fontSize: '1rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: 'none',
                width: '8px',
                flexShrink: 0,
              }}
            >
              -
            </span>
            {/* 첫 번째 4자리 입력 */}
            <input
              ref={phonePart1Ref}
              type="tel"
              placeholder="1234"
              value={phonePart1}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPhonePart1(value);
                // 4자리 입력되면 다음 input으로 포커스 이동
                if (value.length === 4) {
                  phonePart2Ref.current?.focus();
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text');
                const digits = pasted.replace(/\D/g, '');
                // 010으로 시작하는 11자리 숫자 처리
                if (digits.length >= 11 && digits.startsWith('010')) {
                  setPhonePart1(digits.slice(3, 7));
                  setPhonePart2(digits.slice(7, 11));
                  phonePart2Ref.current?.focus();
                } else if (digits.length >= 8) {
                  // 8자리 이상이면 앞 4자리, 뒤 4자리로 분배
                  setPhonePart1(digits.slice(0, 4));
                  setPhonePart2(digits.slice(4, 8));
                  phonePart2Ref.current?.focus();
                } else if (digits.length > 0) {
                  // 8자리 미만이면 첫 번째 칸에만 입력
                  setPhonePart1(digits.slice(0, 4));
                  if (digits.length > 4) {
                    setPhonePart2(digits.slice(4, 8));
                    phonePart2Ref.current?.focus();
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && phonePart1.length === 0) {
                  e.preventDefault();
                }
              }}
              style={{
                width: '80px',
                textAlign: 'left',
                padding: '0',
                border: 'none',
                borderRadius: 0,
                outline: 'none',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'transparent',
                flexShrink: 0,
              }}
              maxLength={4}
            />
            {/* 고정된 - 텍스트 */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#333',
                pointerEvents: 'none',
                fontSize: '1rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: 'none',
                width: '8px',
                flexShrink: 0,
              }}
            >
              -
            </span>
            {/* 두 번째 4자리 입력 */}
            <input
              ref={phonePart2Ref}
              type="tel"
              placeholder="5678"
              value={phonePart2}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPhonePart2(value);
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text');
                const digits = pasted.replace(/\D/g, '');
                // 010으로 시작하는 11자리 숫자 처리
                if (digits.length >= 11 && digits.startsWith('010')) {
                  setPhonePart1(digits.slice(3, 7));
                  setPhonePart2(digits.slice(7, 11));
                } else if (digits.length >= 8) {
                  // 8자리 이상이면 앞 4자리, 뒤 4자리로 분배
                  setPhonePart1(digits.slice(0, 4));
                  setPhonePart2(digits.slice(4, 8));
                } else if (digits.length > 4) {
                  // 4자리 초과면 앞 4자리는 첫 번째 칸, 나머지는 두 번째 칸
                  setPhonePart1(digits.slice(0, 4));
                  setPhonePart2(digits.slice(4, 8));
                } else {
                  // 4자리 이하면 두 번째 칸에만 입력
                  setPhonePart2(digits);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && phonePart2.length === 0) {
                  e.preventDefault();
                  phonePart1Ref.current?.focus();
                }
              }}
              style={{
                width: '80px',
                textAlign: 'left',
                padding: '0',
                border: 'none',
                borderRadius: 0,
                outline: 'none',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'transparent',
                flexShrink: 0,
              }}
              maxLength={4}
            />
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
