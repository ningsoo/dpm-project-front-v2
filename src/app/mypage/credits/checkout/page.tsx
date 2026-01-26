'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Link from 'next/link';
import styles from './checkout.module.css';

type PaymentMethod = 'simple' | 'card' | 'transfer';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reduxUser = useSelector((s: RootState) => s.auth.user);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [agreed, setAgreed] = useState(false);

  const amountParam = searchParams.get('amount');
  const amount = amountParam ? parseInt(amountParam, 10) : 0;
  const formattedAmount = amount.toLocaleString('ko-KR');

  if (!reduxUser) {
    return (
      <div className={styles.wrap}>
        <p>로그인이 필요합니다.</p>
        <Link href="/auth/login">로그인</Link>
      </div>
    );
  }

  if (!amountParam || amount <= 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.container}>
          <h1 className={styles.title}>POP 충전</h1>
          <div className={styles.errorMessage}>
            <p>결제 금액이 올바르지 않습니다.</p>
            <Link href="/mypage/credits" className={styles.backLink}>
              충전 페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handlePurchase = () => {
    if (!agreed) {
      alert('결제 약관에 동의해주세요.');
      return;
    }
    // TODO: Toss Payments 연동
    console.log('결제 진행:', { amount, paymentMethod });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.container}>
        <h1 className={styles.title}>POP 충전</h1>

        {/* 결제 금액 표시 */}
        <div className={styles.amountCard}>
          <div className={styles.amountLabel}>결제 금액</div>
          <div className={styles.amountValue}>{formattedAmount}원</div>
        </div>

        {/* 결제수단 선택 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>결제수단 선택</h2>
          <div className={styles.paymentMethods}>
            <button
              type="button"
              className={styles.paymentMethod + (paymentMethod === 'simple' ? ' ' + styles.active : '')}
              onClick={() => setPaymentMethod('simple')}
            >
              간편결제
            </button>
            <button
              type="button"
              className={styles.paymentMethod + (paymentMethod === 'card' ? ' ' + styles.active : '')}
              onClick={() => setPaymentMethod('card')}
            >
              신용카드
            </button>
            <button
              type="button"
              className={styles.paymentMethod + (paymentMethod === 'transfer' ? ' ' + styles.active : '')}
              onClick={() => setPaymentMethod('transfer')}
            >
              계좌이체
            </button>
          </div>
        </div>

        {/* 유의사항 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>유의사항</h2>
          <div className={styles.noticeBox}>
            <p>• 구매하신 POP은 환불이 불가능합니다.</p>
            <p>• 결제 완료 후 즉시 계정에 충전됩니다.</p>
            <p>• 결제 오류 발생 시 고객센터로 문의해주세요.</p>
          </div>
        </div>

        {/* 동의 체크박스 */}
        <div className={styles.section}>
          <label className={styles.agreeLabel}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className={styles.checkbox}
            />
            <span>위 유의사항 및 결제 약관에 동의합니다.</span>
          </label>
        </div>

        {/* 구매하기 버튼 */}
        <button
          type="button"
          className={styles.purchaseButton}
          onClick={handlePurchase}
          disabled={!agreed}
        >
          구매하기
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className={styles.wrap}>
        <div className={styles.container}>
          <h1 className={styles.title}>POP 충전</h1>
          <p>로딩 중...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
