'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { mypageApi } from '@/api/mypageApi';
import { creditApi } from '@/api/creditApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './DonationModal.module.css';

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  /** 'spotlight'면 재화 사용량 입력용(메시지 없음, onSpotlightConfirm 사용) */
  mode?: 'donation' | 'spotlight';
  targetUserId?: number;
  targetNickname?: string;
  /** 게시글 ID (후원 시 쿼리 파라미터로 전달) */
  boardId?: number;
  onSuccess?: () => void;
  onOpenCharge?: () => void;
  /** spotlight 모드일 때: 사용량 확정 시 호출 (balance >= amount 검증 후) */
  onSpotlightConfirm?: (amount: number) => void;
}

const MESSAGE_MAX_LENGTH = 100;
const SPOTLIGHT_MIN_POP = 1000;

export default function DonationModal({
  open,
  onClose,
  mode = 'donation',
  targetUserId = 0,
  targetNickname = '',
  boardId,
  onSuccess,
  onOpenCharge,
  onSpotlightConfirm,
}: DonationModalProps) {
  const [popBalance, setPopBalance] = useState(0);
  const [donationAmount, setDonationAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [meLoading, setMeLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 모달 오픈 시 내 정보 조회
  useEffect(() => {
    if (!open) return;

    setDonationAmount('');
    setMessage('');
    setSubmitError('');
    setShowConfirmModal(false);
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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setDonationAmount(raw);
    setSubmitError('');
  };


  const donationAmountDisplay =
    donationAmount === ''
      ? ''
      : (parseInt(donationAmount, 10) || 0).toLocaleString('ko-KR');

  const handleMessageChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.value;
    if (val.length <= MESSAGE_MAX_LENGTH) setMessage(val);
    setSubmitError('');
  };

  const amountNum =
    donationAmount === '' ? 0 : parseInt(donationAmount, 10);

  const isDonation = mode === 'donation';
  const isValidAmount =
    isDonation
      ? amountNum > 0 && amountNum <= popBalance
      : amountNum >= SPOTLIGHT_MIN_POP && amountNum <= popBalance;

  /** 후원하기 / 사용하기 버튼 클릭: 검증 후 확인 모달 오픈 */
  const handleSubmit = () => {
    if (!donationAmount.trim()) {
      setSubmitError(isDonation ? '후원할 POP을 입력해주세요.' : '사용할 POP을 입력해주세요.');
      return;
    }

    const num = parseInt(donationAmount, 10);

    if (Number.isNaN(num) || num <= 0) {
      setSubmitError('0보다 큰 숫자를 입력해주세요.');
      return;
    }

    if (!isDonation && num < SPOTLIGHT_MIN_POP) {
      setSubmitError(`최소 ${SPOTLIGHT_MIN_POP.toLocaleString('ko-KR')} POP 이상 입력해주세요.`);
      return;
    }

    if (num > popBalance) {
      setSubmitError('보유한 POP이 부족합니다.');
      return;
    }

    if (isDonation && message.length > MESSAGE_MAX_LENGTH) {
      setSubmitError(
        `메시지는 ${MESSAGE_MAX_LENGTH}자 이하여야 합니다.`
      );
      return;
    }

    setSubmitError('');
    setShowConfirmModal(true);
  };

  /** 확인 모달에서 '네' 클릭: 후원 API 또는 spotlight 확정 콜백 */
  const handleConfirmSubmit = async () => {
    const num = parseInt(donationAmount, 10);
    if (Number.isNaN(num) || num <= 0) return;

    setShowConfirmModal(false);

    if (mode === 'spotlight') {
      onSpotlightConfirm?.(num);
      onClose();
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      await creditApi.sendDonation(
        targetUserId,
        { changeAmount: num, message: message.trim() },
        boardId != null ? { boardId } : undefined
      );

      ToastUtils.success('후원 완료');
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };

      if (e?.response?.status === 400) {
        ToastUtils.error('보유한 POP이 부족합니다');
        setSubmitError('보유한 POP이 부족합니다.');
      } else {
        ToastUtils.error('후원에 실패했습니다.');
        setSubmitError('후원에 실패했습니다.');
      }
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
      onClick={handleBackdropClick}
    >
      <div
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* 타이틀 */}
        <h2 className={styles.title}>
          {mode === 'spotlight' ? 'Spotlight 게시글 작성' : `${targetNickname} 님에게 후원`}
        </h2>

        {meLoading ? (
          <div className={styles.loadingBlock}>
            내 정보를 불러오는 중…
          </div>
        ) : (
          <>
            {/* 금액 */}
            <label className={styles.label}>
              {mode === 'spotlight' ? '소모 POP' : '후원 POP'}
            </label>

            <div className={styles.inputRow}>
              <input
                type="text"
                inputMode="numeric"
                value={donationAmountDisplay}
                onChange={handleAmountChange}
                placeholder="ex) 1,000"
                className={styles.amountInput}
              />
              <span className={styles.unit}>
                POP
              </span>
            </div>

            {mode === 'spotlight' && (
              <p className={styles.chargeNotice} style={{ marginTop: 4, marginBottom: 20 }}>
                최소 {SPOTLIGHT_MIN_POP.toLocaleString('ko-KR')} POP 이상 입력해주세요.
              </p>
            )}

            {/* 메시지 (후원 모드만) */}
            {mode === 'donation' && (
              <>
                <label className={styles.label}>
                  메시지 (최대 {MESSAGE_MAX_LENGTH}자)
                </label>

                <input
                  type="text"
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="메시지를 입력하세요"
                  className={styles.messageInput}
                  maxLength={MESSAGE_MAX_LENGTH}
                />

                <div className={styles.messageCount}>
                  {message.length}/{MESSAGE_MAX_LENGTH}
                </div>
              </>
            )}

            {/* ===== 보유 POP + 충전 버튼 (수정된 구조) ===== */}
            <div className={styles.balanceRow}>
              {popBalance === 0 ? (
                <p className={styles.balanceError}>
                  보유한 POP이 없습니다
                </p>
              ) : (
                <p className={styles.balanceText}>
                  보유한 POP :{' '}
                  {popBalance.toLocaleString('ko-KR')} POP
                </p>
              )}

              <button
                type="button"
                className={styles.chargeBtn}
                onClick={onOpenCharge}
              >
                충전
              </button>
            </div>

            <p className={styles.chargeNotice}>
              충전 클릭 시 마이페이지로 이동합니다.
            </p>
            {/* =========================================== */}

            {submitError && (
              <p className={styles.submitError}>
                {submitError}
              </p>
            )}

            {/* 버튼 */}
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
                disabled={
                  loading ||
                  meLoading ||
                  popBalance === 0 ||
                  !isValidAmount
                }
              >
                {loading ? '처리 중…' : mode === 'spotlight' ? '사용하기' : '후원하기'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 후원 / 사용 확인 모달 */}
      {showConfirmModal && (
        <div
          className={styles.confirmOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="donation-confirm-title"
          onClick={(e) => e.target === e.currentTarget && setShowConfirmModal(false)}
        >
          <div className={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <p id="donation-confirm-title" className={styles.confirmMessage}>
              {mode === 'spotlight' ? (
                <>
                  {donationAmountDisplay} POP을 사용하여
                  <br />
                  게시글 작성 페이지로 이동하시겠습니까?
                </>
              ) : (
                `${targetNickname}님에게 ${donationAmountDisplay}POP으로 후원하시겠습니까?`
              )}
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancelBtn}
                onClick={() => setShowConfirmModal(false)}
              >
                아니요
              </button>
              <button
                type="button"
                className={styles.confirmSubmitBtn}
                onClick={handleConfirmSubmit}
                disabled={loading}
              >
                네
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
