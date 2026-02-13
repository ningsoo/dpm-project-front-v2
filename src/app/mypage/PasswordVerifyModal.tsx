'use client';

import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { mypageApi } from '@/api/mypageApi';
import { normalizePasswordInput, validatePasswordBySignupRule } from '@/utils/authValidation';
import styles from './mypage.module.css';
import authStyles from '@/app/auth/auth.module.css';

interface PasswordVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPath: string;
  onSuccess: (path: string) => void;
}

export function PasswordVerifyModal({ isOpen, onClose, targetPath, onSuccess }: PasswordVerifyModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const value = normalizePasswordInput(raw);
    setPassword(value);
    setError('');
  };

  const handleConfirm = async () => {
    const trimmed = password.trim();
    if (!trimmed) {
      setError('비밀번호를 입력하세요');
      return;
    }
    const pwdErrors = validatePasswordBySignupRule(trimmed);
    if (pwdErrors.length > 0) {
      setError(pwdErrors.join(' / '));
      return;
    }
    setError('');
    setVerifying(true);
    try {
      await mypageApi.verifyPassword(trimmed);
      onSuccess(targetPath);
      onClose();
    } catch {
      setError('비밀번호가 일치하지 않습니다');
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    setError('');
    setVerifying(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-verify-title"
      onClick={handleClose}
    >
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="닫기"
        >
          <X size={20} />
        </button>
        <h2 id="password-verify-title" className={styles.modalTitle}>
          비밀번호를 입력하세요
        </h2>
        <div className={authStyles.pwdWrap} style={{ marginBottom: 8 }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            placeholder="비밀번호 입력"
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 44px 12px 14px',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: 8,
              outline: 'none',
            }}
            disabled={verifying}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
          <button
            type="button"
            className={authStyles.eye}
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? '숨기기' : '보기'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className={styles.errorSlot}>
          {error ? <span className={styles.errorText}>{error}</span> : null}
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={verifying}
          className={styles.primaryButton}
        >
          확인
        </button>
      </div>
    </div>
  );
}
