'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { mypageApi } from '@/api/mypageApi';
import { boardApi } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './DonationModal.module.css';

const MIN_POP = 1000;

interface SpotlightExtendModalProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  /** 게시글 현재 잔여 Pop */
  remainingPop: number;
  onSuccess?: () => void;
  onOpenCharge?: () => void;
}

export default function SpotlightExtendModal({
  open,
  onClose,
  boardId,
  remainingPop,
  onSuccess,
  onOpenCharge,
}: SpotlightExtendModalProps) {
  const [popBalance, setPopBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [meLoading, setMeLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setSubmitError('');
    setMeLoading(true);
    mypageApi
      .getMypage()
      .then(({ data }) => {
        const payload = data?.data as { popBalance?: number } | undefined;
        setPopBalance(Number(payload?.popBalance) || 0);
      })
      .catch(() => {
        ToastUtils.error('내 정보를 불러올 수 없습니다.');
        onClose();
      })
      .finally(() => setMeLoading(false));
  }, [open, onClose]);

  const amountNum = amount === '' ? 0 : parseInt(amount, 10);
  const amountDisplay = amount === '' ? '' : (amountNum || 0).toLocaleString('ko-KR');
  const isValid = amountNum >= MIN_POP && amountNum <= popBalance;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmount(raw);
    setSubmitError('');
  };

  const handleSubmit = async () => {
    if (amountNum < MIN_POP) {
      setSubmitError(`최소 ${MIN_POP.toLocaleString('ko-KR')} POP 이상 입력해주세요.`);
      return;
    }
    if (amountNum > popBalance) {
      setSubmitError('보유한 POP이 부족합니다.');
      return;
    }
    setLoading(true);
    setSubmitError('');
    try {
      await boardApi.extendSpotlight(boardId, amountNum);
      ToastUtils.success('Spotlight 게시글 연장이 완료되었습니다.');
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } };
      const msg = e?.response?.data?.message;
      if (msg) ToastUtils.error(msg);
      else ToastUtils.error('연장에 실패했습니다.');
      setSubmitError(msg || '연장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotlight-extend-title"
      onClick={handleBackdropClick}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
        <h2 id="spotlight-extend-title" className={styles.title}>
          Spotlight 게시 연장
        </h2>

        {meLoading ? (
          <div className={styles.loadingBlock}>내 정보를 불러오는 중…</div>
        ) : (
          <>
            <div className={styles.balanceRow} style={{ marginBottom: 16 }}>
              <p className={styles.balanceText}>
                현재 잔여 Pop: {Number(remainingPop).toLocaleString('ko-KR')}
              </p>
            </div>

            <label className={styles.label}>소모 Pop</label>
            <div className={styles.inputRow}>
              <input
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={handleAmountChange}
                placeholder="ex) 3,000"
                className={styles.amountInput}
              />
              <span className={styles.unit}>POP</span>
            </div>
            <p className={styles.chargeNotice} style={{ marginTop: 4, marginBottom: 16 }}>
              (최소 1,000 pop)
            </p>

            <div className={styles.balanceRow}>
              {popBalance === 0 ? (
                <p className={styles.balanceError}>보유한 POP이 없습니다</p>
              ) : (
                <p className={styles.balanceText}>
                  내 보유 Pop: {popBalance.toLocaleString('ko-KR')}
                </p>
              )}
              <button type="button" className={styles.chargeBtn} onClick={onOpenCharge}>
                충전
              </button>
            </div>
            <p className={styles.chargeNotice}>충전 클릭 시 마이페이지로 이동합니다.</p>

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
                disabled={loading || !isValid || popBalance === 0}
              >
                {loading ? '처리 중…' : '충전'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
