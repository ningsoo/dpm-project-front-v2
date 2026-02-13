'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import { validateNicknameFormatBySignupRule, validatePhoneParts } from '@/utils/authValidation';
import styles from '@/app/auth/auth.module.css';

interface UserInfo {
  id: string;
  email: string;
  nickname: string;
  phoneNumber: string;
  profileImage?: string;
}

export default function UpdateProfilePage() {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const phonePart0Ref = useRef<HTMLInputElement>(null);
  const phonePart1Ref = useRef<HTMLInputElement>(null);
  const phonePart2Ref = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState('');
  const [phonePart0, setPhonePart0] = useState('');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [initialNickname, setInitialNickname] = useState('');
  const [initialPhone, setInitialPhone] = useState('');
  const [phonePlaceholder0, setPhonePlaceholder0] = useState('010');
  const [phonePlaceholder1, setPhonePlaceholder1] = useState('1234');
  const [phonePlaceholder2, setPhonePlaceholder2] = useState('5678');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [nicknameVerified, setNicknameVerified] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const PHONE_ERROR_MESSAGE = '연락처 앞자리는 010~019만 입력 가능합니다';

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
          const nick = userData.nickname || '';
          setNickname(nick);
          setInitialNickname(nick);
          if (userData.phoneNumber) {
            const phoneDigits = userData.phoneNumber.replace(/\D/g, '');
            if (phoneDigits.length === 11) {
              setInitialPhone(phoneDigits);
              setPhonePlaceholder0(phoneDigits.slice(0, 3));
              setPhonePlaceholder1(phoneDigits.slice(3, 7));
              setPhonePlaceholder2(phoneDigits.slice(7, 11));
              setPhonePart0('');
              setPhonePart1('');
              setPhonePart2('');
            } else {
              setInitialPhone('');
            }
          } else {
            setInitialPhone('');
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

  const nicknameFormatError = validateNicknameFormatBySignupRule(nickname);
  const nicknameFormatOk = nickname.length > 0 && nickname.length <= 10 && !nicknameFormatError;
  const phoneValidation = validatePhoneParts(phonePart0, phonePart1, phonePart2);

  const handleNicknameCheck = useCallback(async () => {
    if (!nickname) {
      setErrors((e) => ({ ...e, nickname: '닉네임을 입력해주세요' }));
      return;
    }
    if (nicknameFormatError) {
      setErrors((e) => ({ ...e, nickname: nicknameFormatError }));
      return;
    }
    try {
      // TODO: 닉네임 중복 확인 API 호출
      // const { data } = await authApi.checkNickname(nickname);
      // const available = (data?.data as { available?: boolean })?.available;
      // setErrors((e) => ({ ...e, nickname: available === false ? '이미 사용 중인 닉네임입니다' : '' }));
      ToastUtils.success('사용 가능한 닉네임입니다');
      setErrors((e) => ({ ...e, nickname: '' }));
      setNicknameVerified(true);
    } catch {
      setErrors((e) => ({ ...e, nickname: '확인할 수 없습니다' }));
    }
  }, [nickname, nicknameFormatError]);

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

  const currentPhone = `${phonePart0}${phonePart1}${phonePart2}`;
  const nicknameChanged = nickname !== initialNickname;
  const phoneChanged =
    currentPhone !== initialPhone && (initialPhone === '' || currentPhone !== '');
  const nicknamePartOk = !nicknameChanged || (nicknameFormatOk && nicknameVerified);
  const phonePartOk = !phoneChanged || phoneValidation.ok;
  const canSubmit =
    (nicknameChanged || phoneChanged) && nicknamePartOk && phonePartOk && !submitting;

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 10) return;
    setNickname(value);
    setNicknameVerified(false);
    if (!isComposing && !validateNicknameFormatBySignupRule(value) && errors.nickname) {
      setErrors((e) => ({ ...e, nickname: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!canSubmit) return;
    const payload: { nickname?: string; phoneNumber?: string } = {};
    if (nicknameChanged) payload.nickname = nickname;
    if (phoneChanged) payload.phoneNumber = currentPhone;
    if (Object.keys(payload).length === 0) return;
    setSubmitting(true);
    try {
      await mypageApi.updateProfile(payload);
      setShowSuccessModal(true);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: unknown } };
      console.error('[updateprofile]', {
        'error.response?.status': ax.response?.status,
        'error.response?.data': ax.response?.data,
        payload,
      });
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="특수문자 제외, 10자 이내"
              value={nickname}
              onChange={handleNicknameChange}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
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
                background: nicknameFormatOk ? (darkMode ? '#3A3934' : '#111') : '#ccc',
                cursor: nicknameFormatOk ? 'pointer' : 'not-allowed',
              }}
            >
              중복확인
            </button>
          </div>
          <span className={styles.error}>{errors.nickname || nicknameFormatError || ''}</span>
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
              placeholder={phonePlaceholder0}
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
              placeholder={phonePlaceholder1}
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
              placeholder={phonePlaceholder2}
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
            {phoneChanged &&
            !phoneValidation.ok &&
            (submitAttempted ||
              (phoneTouched &&
                phonePart0.length === 3 &&
                phonePart1.length === 4 &&
                phonePart2.length === 4)) ? (
              <span className={styles.error}>{PHONE_ERROR_MESSAGE}</span>
            ) : null}
          </div>
        </label>

        <button type="submit" className={styles.submit} disabled={!canSubmit}>
          {submitting ? '저장 중…' : '수정하기'}
        </button>

        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <Link href="/mypage/withdraw" className={styles.withdrawLinkNoUnderline}>
            회원 탈퇴
          </Link>
        </div>
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
          <div
            style={{
              padding: 24,
              background: '#fff',
              borderRadius: 12,
              maxWidth: 360,
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 16px' }}>정상적으로 수정되었습니다.</p>
            <button
              type="button"
              className={styles.submit}
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/mypage');
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
