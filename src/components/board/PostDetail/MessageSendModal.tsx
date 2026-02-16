'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { messageApi } from '@/api/messageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './MessageSendModal.module.css';

interface MessageSendModalProps {
  open: boolean;
  onClose: () => void;
  targetUserId: number;
  targetNickname: string;
  onSuccess?: () => void;
  onLoginRequired?: () => void;
}

const MESSAGE_MAX_LENGTH = 500;

export default function MessageSendModal({
  open,
  onClose,
  targetUserId,
  targetNickname,
  onSuccess,
  onLoginRequired,
}: MessageSendModalProps) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) {
      setContent('');
      setSubmitError('');
    }
  }, [open]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MESSAGE_MAX_LENGTH) setContent(val);
    setSubmitError('');
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (loading) return;

    setLoading(true);
    setSubmitError('');

    try {
      await messageApi.sendMessage(targetUserId, trimmed);
      ToastUtils.success('쪽지가 전송되었습니다.');
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      const status = e?.response?.status;

      if (status === 403) {
        onClose();
        if (onLoginRequired) {
          onLoginRequired();
        } else {
          router.push('/auth/login');
        }
        ToastUtils.error('로그인이 필요합니다.');
        return;
      }

      if (status === 404) {
        setSubmitError('받는 사용자를 찾을 수 없습니다.');
        ToastUtils.error('받는 사용자를 찾을 수 없습니다.');
        return;
      }

      setSubmitError('쪽지 전송에 실패했습니다.');
      ToastUtils.error('쪽지 전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  const trimmedContent = content.trim();
  const canSubmit = trimmedContent.length > 0 && !loading;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-send-modal-title"
      onClick={handleBackdropClick}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        <h2 id="message-send-modal-title" className={styles.title}>
          {targetNickname} 님에게 전송
        </h2>

        <label className={styles.label} htmlFor="message-content">
          쪽지 내용
        </label>
        <textarea
          id="message-content"
          className={styles.textarea}
          value={content}
          onChange={handleContentChange}
          placeholder="쪽지 내용을 입력하세요"
          maxLength={MESSAGE_MAX_LENGTH}
          rows={5}
          disabled={loading}
        />
        <div className={styles.messageCount}>
          {content.length}/{MESSAGE_MAX_LENGTH}
        </div>

        {submitError && <p className={styles.submitError}>{submitError}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            취소
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? '전송 중…' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}
