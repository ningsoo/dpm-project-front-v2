'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '@/app/auth/auth.module.css';

export default function UpdateProfilePage() {
  const router = useRouter();
  const reduxUser = useSelector((s: RootState) => s.auth.user);
  const phonePart1Ref = useRef<HTMLInputElement>(null);
  const phonePart2Ref = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState(reduxUser?.nickname || '');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nicknameDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 기존 phone 값을 phonePart1, phonePart2로 분리
  useEffect(() => {
    if (reduxUser?.phone) {
      const phoneDigits = reduxUser.phone.replace(/\D/g, '');
      if (phoneDigits.length === 11 && phoneDigits.startsWith('010')) {
        setPhonePart1(phoneDigits.slice(3, 7));
        setPhonePart2(phoneDigits.slice(7));
      }
    }
  }, [reduxUser?.phone]);

  // 닉네임 debounce 타이머 정리
  useEffect(() => {
    return () => {
      if (nicknameDebounceRef.current) {
        clearTimeout(nicknameDebounceRef.current);
      }
    };
  }, []);

  const user = reduxUser;

  if (!user) {
    router.push('/auth/login');
    return null;
  }

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
    if (!nicknameOk || !phoneOk) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.h1}>프로필 수정</h1>

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

        <button type="submit" className={styles.submit} disabled={loading || !nicknameOk || !phoneOk}>
          {loading ? '저장 중…' : '저장'}
        </button>

        <div style={{ textAlign: 'right', marginTop: 8 }}>
        <Link
          href="/mypage/withdraw"
            className={styles.withdrawLink}
        >
          회원 탈퇴
        </Link>
      </div>
      </form>
    </div>
  );
}
