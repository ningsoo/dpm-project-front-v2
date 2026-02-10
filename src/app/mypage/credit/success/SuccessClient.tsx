'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPayment } from '@/api/creditApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../../mypage.module.css';
import creditStyles from '../credit.module.css';

const REDIRECT_DELAY_MS = 400;

function parseAmount(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

function redirectAfterToast(router: ReturnType<typeof useRouter>) {
  setTimeout(() => {
    router.replace('/mypage');
  }, REDIRECT_DELAY_MS);
}

function isInvalidAccessError(status?: number, message?: string): boolean {
  if (status === 400 || status === 404) return true;
  const msg = message ?? '';
  const keywords = ['주문', '금액', '요청', '일치'];
  return keywords.some((k) => msg.includes(k));
}

/** ISO 문자열 → yyyy.mm.dd hh:mm:ss (로컬, 초 포함) */
function formatApprovedAt(iso: string | null | undefined): string {
  if (!iso || typeof iso !== 'string') return '-';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}.${m}.${day} ${h}:${min}:${s}`;
  } catch {
    return '-';
  }
}

/** 결제수단 한글화 */
function formatMethod(method: string | null | undefined): string {
  if (method == null || typeof method !== 'string') return '-';
  const m = method.toUpperCase();
  if (m === 'CARD') return '카드';
  if (m === 'TRANSFER') return '계좌이체';
  if (m === 'VIRTUAL_ACCOUNT') return '가상계좌';
  if (m === 'MOBILE_PHONE') return '휴대폰';
  return method;
}

/** confirm 응답 data에서 approvedAt, method 추출 */
function getConfirmDisplayValues(data: unknown): {
  approvedAt: string;
  method: string;
} {
  const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const approvedAt =
    (raw.approvedAt as string) ??
    (raw.approved_at as string) ??
    '';
  const method =
    (raw.method as string) ??
    (raw.paymentMethod as string) ??
    '';
  return {
    approvedAt: formatApprovedAt(approvedAt),
    method: formatMethod(method),
  };
}

type Status = 'idle' | 'loading' | 'success' | 'invalid' | 'error';

export default function SuccessClient() {
  const router = useRouter();
  const params = useSearchParams();
  const didRun = useRef(false);

  const paymentKey = params.get('paymentKey') ?? '';
  const orderId = params.get('orderId') ?? '';
  const amount = parseAmount(params.get('amount'));
  const changeAmount = parseAmount(params.get('changeAmount'));

  const [status, setStatus] = useState<Status>('idle');
  const [confirmData, setConfirmData] = useState<unknown>(null);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const hasInvalid =
      !paymentKey.trim() ||
      !orderId.trim() ||
      amount == null ||
      changeAmount == null;

    if (hasInvalid) {
      ToastUtils.error('잘못된 접근입니다.');
      redirectAfterToast(router);
      setStatus('invalid');
      return;
    }

    setStatus('loading');

    confirmPayment(orderId, paymentKey, amount)
      .then((res) => {
        const body = res.data;
        if (body?.success === true) {
          setConfirmData(body.data ?? null);
          setStatus('success');
        } else {
          ToastUtils.error('잘못된 접근입니다.');
          redirectAfterToast(router);
          setStatus('invalid');
        }
      })
      .catch((err: unknown) => {
        const ax = err as {
          response?: { status?: number; data?: { message?: string } };
        };
        const statusCode = ax?.response?.status;
        const message = ax?.response?.data?.message ?? '';

        if (isInvalidAccessError(statusCode, message)) {
          ToastUtils.error('잘못된 접근입니다.');
        } else {
          ToastUtils.error('결제 처리에 실패했습니다.');
        }
        redirectAfterToast(router);
        setStatus('error');
      });
  }, [paymentKey, orderId, amount, router]);

  if (status === 'invalid' || status === 'error') {
    return (
      <div className={styles.wrap}>
        <p>처리 중...</p>
      </div>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div className={styles.wrap}>
        <p>결제 확정 처리 중...</p>
      </div>
    );
  }

  const { approvedAt, method } = getConfirmDisplayValues(confirmData);
  const displayAmountText = changeAmount != null ? `${changeAmount.toLocaleString('ko-KR')} POP` : '0 POP';

  return (
    <div className={creditStyles.wrap}>
      <div className={creditStyles.inner}>
        <h1 className={creditStyles.title}>결제 완료</h1>
        <section className={`${creditStyles.summaryBox} ${creditStyles.summaryBoxCenter}`} style={{ padding: '20px', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            <span className={styles.successHighlight}>{approvedAt}</span>
            {' '}
            <span className={styles.successHighlight}>{method}</span>
            {' '}
            방식으로
            <br />
            <span className={styles.successHighlight}>{displayAmountText}</span>
            {' '}
            충전이 완료되었습니다!
          </p>
        </section>
        <button
          type="button"
          className={creditStyles.submitBtn}
          onClick={() => router.push('/mypage?tab=pop')}
        >
          내 재화로 이동
        </button>
      </div>
    </div>
  );
}
