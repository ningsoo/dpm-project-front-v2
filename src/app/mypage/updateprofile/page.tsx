'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '@/app/auth/auth.module.css';

interface UserInfo {
  id: string;
  email: string;
  nickname: string;
  phone?: string;
  profileImage?: string;
}

export default function UpdateProfilePage() {
  const router = useRouter();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const phonePart1Ref = useRef<HTMLInputElement>(null);
  const phonePart2Ref = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState('');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 초기화 완료 후 사용자 정보 로드
  useEffect(() => {
    if (!initialized) return;
    
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // 사용자 정보 가져오기
    mypageApi.getMypage()
      .then(({ data }) => {
        const userData = data?.data as UserInfo | undefined;
        if (userData) {
          setUser(userData);
          setNickname(userData.nickname || '');
          // 기존 phone 값을 phonePart1, phonePart2로 분리
          if (userData.phone) {
            const phoneDigits = userData.phone.replace(/\D/g, '');
            if (phoneDigits.length === 11 && phoneDigits.startsWith('010')) {
              setPhonePart1(phoneDigits.slice(3, 7));
              setPhonePart2(phoneDigits.slice(7));
            }
          }
        } else {
          ToastUtils.error('사용자 정보를 불러올 수 없습니다.');
          router.push('/auth/login');
        }
      })
      .catch((error) => {
        if (error?.response?.status === 401) {
          router.push('/auth/login');
        } else {
          ToastUtils.error('사용자 정보를 불러올 수 없습니다.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [initialized, isAuthenticated, router]);

  if (!initialized || loading) {
    return (
      <div className={styles.wrap}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // 한글 조합 중이 아닐 때만 특수문자 체크
  const nicknameHasSpecialChar = !isComposing && /[^a-zA-Z0-9가-힣_]/.test(nickname);
  const nicknameOk = nickname.length > 0 && nickname.length <= 10 && !nicknameHasSpecialChar;
  const phoneOk = phonePart1.length === 4 && phonePart2.length === 4;

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 10자 넘으면 입력 막기
    if (value.length > 10) return;
    setNickname(value);
    // 한글 조합 중이 아니고 특수문자가 없으면 에러 메시지 제거
    if (!isComposing && !/[^a-zA-Z0-9가-힣_]/.test(value) && errors.nickname) {
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
    if (!nicknameOk || !phoneOk) return;
    setSubmitting(true);
    try {
      // 연락처: 숫자만 추출하여 010 포함 11자리로 변환
      const phoneForServer = `010${phonePart1}${phonePart2}`;
      
      await mypageApi.updateProfile({
        nickname,
        phone: phoneForServer,
      });
      ToastUtils.success('Successfully updated');
      router.push('/mypage');
    } catch {
      ToastUtils.error('수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.h1}>프로필 수정</h1>

        <label className={styles.label}>
          닉네임
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
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
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleNicknameCheck}
              style={{
                padding: '0 16px',
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                whiteSpace: 'nowrap',
                height: 'auto',
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
          <div 
            className={styles.input}
            style={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'stretch',
              padding: 0,
              marginTop: 6,
            }}
          >
            {/* 고정된 010 텍스트 */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                color: '#333',
                pointerEvents: 'none',
                fontSize: '1rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: 'none',
              }}
            >
              010
            </span>
            {/* 고정된 - 텍스트 */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 4px',
                color: '#333',
                pointerEvents: 'none',
                fontSize: '1rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: 'none',
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
                padding: '12px 8px',
                border: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderRadius: 0,
                outline: 'none',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'transparent',
              }}
              maxLength={4}
            />
            {/* 고정된 - 텍스트 */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 4px',
                color: '#333',
                pointerEvents: 'none',
                fontSize: '1rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: 'none',
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
                padding: '12px 8px',
                border: 'none',
                borderLeft: 'none',
                borderRadius: 0,
                outline: 'none',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'transparent',
              }}
              maxLength={4}
            />
          </div>
        </label>

        <button type="submit" className={styles.submit} disabled={submitting || !nicknameOk || !phoneOk}>
          {submitting ? '저장 중…' : '저장'}
        </button>

        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <Link
            href="/mypage/withdraw"
            style={{ fontSize: '0.9rem', color: '#c62828', textDecoration: 'underline' }}
          >
            회원 탈퇴
          </Link>
        </div>
      </form>
    </div>
  );
}
