'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import creditStyles from '../credit.module.css';

interface LastPaymentAttempt {
  orderId: string;
  amount: number;
  changeAmount: number;
  selectedMethod: string;
  timestamp: number;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: '카드',
  TRANSFER: '계좌이체',
  VIRTUAL_ACCOUNT: '가상계좌',
  MOBILE_PHONE: '휴대폰',
};

export default function FailClient() {
  const router = useRouter();
  const [lastAttempt, setLastAttempt] = useState<LastPaymentAttempt | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem('lastPaymentAttempt');
      if (stored) {
        const parsed = JSON.parse(stored) as LastPaymentAttempt;
        // 1시간 이내 시도만 표시
        if (Date.now() - parsed.timestamp < 3600000) {
          setLastAttempt(parsed);
        } else {
          sessionStorage.removeItem('lastPaymentAttempt');
        }
      }
    } catch {
      // 파싱 실패는 무시
    }
  }, []);

  const handleBack = () => {
    const currentPath = window.location.pathname;
    router.back();
    // 뒤로가기가 실패하면 (경로가 변하지 않음) 마이페이지로 이동
    setTimeout(() => {
      if (window.location.pathname === currentPath) {
        router.push('/mypage?tab=pop&popSubTab=purchase');
      }
    }, 100);
  };

  return (
    <div className={creditStyles.wrap}>
      <div className={creditStyles.inner}>
        <h1 className={creditStyles.title}>결제에 실패했습니다</h1>
        {lastAttempt ? (
          <p className={creditStyles.failMessage}>
            결제가 완료되지 않았습니다.
            <br />
            시도 금액: {lastAttempt.changeAmount.toLocaleString('ko-KR')}원
            {lastAttempt.selectedMethod && (
              <>
                <br />
                결제수단: {PAYMENT_METHOD_LABELS[lastAttempt.selectedMethod] || lastAttempt.selectedMethod}
              </>
            )}
            <br />
            다시 시도하거나 마이페이지에서 충전을 진행해 주세요.
          </p>
        ) : (
          <p className={creditStyles.failMessage}>
            결제가 완료되지 않았습니다. 다시 시도하거나 마이페이지에서 충전을 진행해 주세요.
          </p>
        )}
        <div className={creditStyles.failActions}>
          <button type="button" className={creditStyles.submitBtn} onClick={handleBack}>
            뒤로가기
          </button>
          <button
            type="button"
            className={creditStyles.submitBtn}
            onClick={() => router.push('/mypage?tab=pop&popSubTab=purchase')}
          >
            마이페이지로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
