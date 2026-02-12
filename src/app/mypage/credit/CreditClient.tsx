'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../mypage.module.css';
import creditStyles from './credit.module.css';

interface UserInfo {
  credits?: number;
}

/** 결제창에서 지원하는 결제수단 */
const PAYMENT_METHODS = [
  { id: 'CARD', label: '카드' },
  { id: 'TRANSFER', label: '계좌이체' },
  { id: 'VIRTUAL_ACCOUNT', label: '가상계좌' },
  { id: 'MOBILE_PHONE', label: '휴대폰' },
] as const;

type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id'];

function parsePositiveInt(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

export default function CreditClient() {
  const router = useRouter();
  const params = useSearchParams();

  const orderId = params.get('orderId') ?? '';
  const changeAmount = parsePositiveInt(params.get('changeAmount'));
  const amount = parsePositiveInt(params.get('amount'));

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [queryValid, setQueryValid] = useState<boolean | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('CARD');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentRef = useRef<any>(null);

  // 1. Query 검증
  useEffect(() => {
    if (!orderId.trim()) {
      ToastUtils.error('잘못된 접근입니다.');
      router.replace('/mypage');
      setQueryValid(false);
      return;
    }
    if (changeAmount == null || amount == null) {
      ToastUtils.error('잘못된 접근입니다.');
      router.replace('/mypage');
      setQueryValid(false);
      return;
    }
    setQueryValid(true);
  }, [orderId, changeAmount, amount, router]);

  // 2. 인증 및 마이페이지 사용자 로드
  useEffect(() => {
    if (!initialized) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    mypageApi
      .getMypage()
      .then(({ data }) => {
        const userData = data?.data as UserInfo | undefined;
        if (userData) setUser(userData);
        else {
          ToastUtils.error('사용자 정보를 불러올 수 없습니다.');
          router.push('/auth/login');
        }
      })
      .catch((error) => {
        if (error?.response?.status === 401) router.push('/auth/login');
        else ToastUtils.error('사용자 정보를 불러올 수 없습니다.');
      })
      .finally(() => setLoading(false));
  }, [initialized, isAuthenticated, router]);

  // 3. 토스 결제창 SDK 초기화
  useEffect(() => {
    if (queryValid !== true) return;

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      ToastUtils.error('결제 환경 설정이 없습니다.');
      router.replace('/mypage');
      return;
    }

    let cancelled = false;

    loadTossPayments(clientKey)
      .then((tossPayments) => {
        if (cancelled) return;
        const payment = tossPayments.payment({ customerKey: 'ANONYMOUS' });
        paymentRef.current = payment;
      })
      .catch(() => {
        if (!cancelled) ToastUtils.error('결제 모듈을 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
      paymentRef.current = null;
    };
  }, [queryValid, router]);

  const canSubmit = queryValid === true && changeAmount != null && amount != null && !paymentLoading;

  const handlePurchase = async () => {
    if (!canSubmit) return;

    const payment = paymentRef.current;
    if (!payment) {
      ToastUtils.error('결제 모듈을 불러오는 중입니다.');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const successUrl = `${origin}/mypage/credit/success?changeAmount=${changeAmount}`;
    const failUrl = `${origin}/mypage/credit/fail`;

    setPaymentLoading(true);

    try {
      await payment.requestPayment({
        method: selectedMethod,
        amount: {
          value: amount!,
          currency: 'KRW',
        },
        orderId,
        orderName: 'POP 충전',
        successUrl,
        failUrl,
      });
    } catch (err) {
      ToastUtils.error('결제 요청에 실패했습니다.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (queryValid === false) {
    return (
      <div className={styles.wrap}>
        <p>잘못된 접근입니다.</p>
      </div>
    );
  }

  if (!initialized || loading) {
    return (
      <div className={styles.wrap}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.wrap}>
        <p>로그인이 필요합니다.</p>
        <Link href="/auth/login">로그인</Link>
      </div>
    );
  }

  if (queryValid !== true || changeAmount == null || amount == null) {
    return (
      <div className={styles.wrap}>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className={creditStyles.wrap}>
      <div className={creditStyles.inner}>
        <h1 className={creditStyles.title}>POP 충전</h1>

        <section className={creditStyles.summaryBox}>
          <div className={creditStyles.summaryRow}>
            <span>충전할 POP</span>
            <span>{changeAmount.toLocaleString('ko-KR')}원</span>
          </div>
          <div className={creditStyles.summaryRow}>
            <span>최종 결제금액</span>
            <span>{amount.toLocaleString('ko-KR')}원</span>
          </div>
        </section>

        <section className={creditStyles.widgetSection}>
          <h2 className={creditStyles.sectionLabel}>결제수단</h2>
          <ul className={creditStyles.methodList}>
            {PAYMENT_METHODS.map((m) => (
              <li key={m.id} className={creditStyles.methodItem}>
                <button
                  type="button"
                  className={`${creditStyles.methodBtn} ${selectedMethod === m.id ? creditStyles.selected : ''}`}
                  onClick={() => setSelectedMethod(m.id)}
                >
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          className={creditStyles.submitBtn}
          disabled={!canSubmit}
          onClick={handlePurchase}
        >
          {paymentLoading ? '결제 진행 중...' : '구매하기'}
        </button>
      </div>
    </div>
  );
}
