'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/api/authApi';
import { ToastUtils } from '@/utils/toastUtils';
import { validateNameFormatByRule, validatePhonePartsStrict } from '@/utils/authValidation';
import styles from '../auth.module.css';

export default function FindEmailPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [nameError, setNameError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phonePart0Ref = useRef<HTMLInputElement>(null);
  const phonePart1Ref = useRef<HTMLInputElement>(null);
  const phonePart2Ref = useRef<HTMLInputElement>(null);
  const [phonePart0, setPhonePart0] = useState('');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneErrorUx, setPhoneErrorUx] = useState('');
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [foundEmail, setFoundEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const phoneComplete =
    phonePart0.length === 3 &&
    phonePart1.length === 4 &&
    /^\d+$/.test(phonePart1) &&
    phonePart2.length === 4 &&
    /^\d+$/.test(phonePart2);
  const phoneValidation = validatePhonePartsStrict(phonePart0, phonePart1, phonePart2);
  const phoneOk = phoneComplete && phoneValidation.ok;

  const nameOk = name.length >= 2 && !nameError;
  const canSubmit = nameOk && phoneOk && !loading;

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
      if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    };
  }, [phonePart0, phonePart1, phonePart2, phoneComplete]);

  useEffect(() => {
    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    };
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.length > 20) return;
    setName(v);
    setNameTouched(true);
    setNameError('');
    if (nameDebounceRef.current) {
      clearTimeout(nameDebounceRef.current);
      nameDebounceRef.current = null;
    }
    nameDebounceRef.current = setTimeout(() => {
      nameDebounceRef.current = null;
      setNameError(validateNameFormatByRule(v));
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const trimmedName = name.trim();
    if (!nameOk || !phoneOk || loading) return;
    const phoneNumber = `${phonePart0}${phonePart1}${phonePart2}`;
    setLoading(true);
    try {
      const { data } = await authApi.findEmail(trimmedName, phoneNumber);
      if (data?.success && data?.data?.email) {
        setSuccessMessage(data.message ?? '');
        setFoundEmail(data.data.email);
        setShowModal(true);
      } else {
        ToastUtils.error(data?.message ?? '일치하는 회원 정보를 찾을 수 없습니다.');
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const message = typeof res?.message === 'string' ? res.message : '일치하는 회원 정보를 찾을 수 없습니다.';
      ToastUtils.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setShowModal(false);
    setFoundEmail('');
    setSuccessMessage('');
    router.push('/auth/login');
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.h1}>이메일 찾기</h1>

        <label className={styles.label} htmlFor="name">
          이름
          <input
            type="text"
            id="name"
            name="name"
            placeholder="이름을 입력하세요"
            autoComplete="name"
            className={styles.input}
            value={name}
            onChange={handleNameChange}
          />
          <span className={styles.error}>
            {(nameTouched || submitAttempted) && name.length >= 2 ? nameError : ''}
          </span>
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
              style={{
                width: '50px',
                minWidth: '50px',
                textAlign: 'center',
                padding: '0 4px',
                border: 'none',
                outline: 'none',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'transparent',
              }}
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
              style={{
                width: '60px',
                minWidth: '60px',
                textAlign: 'center',
                padding: '0 4px',
                border: 'none',
                outline: 'none',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'transparent',
              }}
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
              style={{
                width: '60px',
                minWidth: '60px',
                textAlign: 'center',
                padding: '0 4px',
                border: 'none',
                outline: 'none',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'transparent',
              }}
              maxLength={4}
            />
          </div>
          <div style={{ minHeight: '22px', marginTop: 4 }}>
            {(submitAttempted || (phoneTouched && phoneComplete)) && phoneErrorUx ? (
              <span className={styles.error}>{phoneErrorUx}</span>
            ) : null}
          </div>
        </label>

        <button type="submit" className={styles.submit} disabled={!canSubmit}>
          {loading ? '확인 중…' : '이메일 찾기'}
        </button>

        <div className={styles.links}>
          <Link href="/auth/login">로그인으로 돌아가기</Link>
        </div>
      </form>

      {showModal && foundEmail && (
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
          aria-labelledby="find-email-modal-title"
        >
          <div
            style={{
              padding: 24,
              background: '#fff',
              borderRadius: 12,
              maxWidth: 400,
              textAlign: 'center',
            }}
          >
            <h2 id="find-email-modal-title" className={styles.h1} style={{ marginBottom: 16, fontSize: '1.25rem' }}>
              이메일 찾기 결과
            </h2>
            <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>
              {successMessage}
            </p>
            <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>
              <strong style={{ color: '#111', fontWeight: 700 }}>{foundEmail}</strong>
            </p>
            <p style={{ margin: '0 0 16px', lineHeight: 1.6 }}>
              확인 클릭시 로그인 페이지로 이동합니다.
            </p>
            <button type="button" className={styles.submit} onClick={handleModalConfirm}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
