'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
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
  const [sdkReady, setSdkReady] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentRef = useRef<any>(null);

  // 1. Query 검증
  useEffect(() => {
    if (!orderId.trim()) {
      ToastUtils.error('잘못된 접근입니다.');
      router.replace('/mypage?tab=pop&popSubTab=purchase');
      setQueryValid(false);
      return;
    }
    if (changeAmount == null || amount == null) {
      ToastUtils.error('잘못된 접근입니다.');
      router.replace('/mypage?tab=pop&popSubTab=purchase');
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

    // 결제창(Standard) SDK용 → "API 개별 연동" 클라이언트 키 필요 (test_ck_... / live_ck_...). 결제위젯 키(gck) 사용 시 오류 발생.
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      ToastUtils.error('결제 설정이 누락되었습니다. 관리자에게 문의해주세요.');
      router.replace('/mypage?tab=pop&popSubTab=purchase');
      return;
    }

    let cancelled = false;

    loadTossPayments(clientKey)
      .then((tossPayments) => {
        if (cancelled) return;
        if (!tossPayments?.payment) {
          console.error('[POP충전] 토스페이먼츠 인스턴스에 payment가 없음:', tossPayments);
          ToastUtils.error('결제 모듈 로딩에 실패했습니다. 잠시 후 다시 시도해주세요.');
          return;
        }
        const payment = tossPayments.payment({ customerKey: ANONYMOUS });
        paymentRef.current = payment;
        setSdkReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          const name = err instanceof Error ? err.name : '';
          console.error('[POP충전] 토스페이먼츠 SDK 로드 실패:', name, msg, err);
          const isWidgetKeyError =
            /결제위젯 연동 키|API 개별 연동 키/.test(msg) || /지원하지 않습니다/.test(msg);
          const toastMsg = isWidgetKeyError
            ? '결제창에는 "API 개별 연동" 클라이언트 키가 필요합니다. 개발자센터에서 test_ck_... 형식 키를 발급해 .env.local의 NEXT_PUBLIC_TOSS_CLIENT_KEY에 넣고 서버를 재시작하세요.'
            : process.env.NODE_ENV === 'development'
              ? `결제 모듈 로딩 실패: ${msg}. (.env.local의 NEXT_PUBLIC_TOSS_CLIENT_KEY 확인 후 개발 서버 재시작)`
              : '결제 모듈 로딩에 실패했습니다. 잠시 후 다시 시도해주세요.';
          ToastUtils.error(toastMsg);
        }
      });

    return () => {
      cancelled = true;
      paymentRef.current = null;
      setSdkReady(false);
    };
  }, [queryValid, router]);

  const canSubmit =
    queryValid === true &&
    changeAmount != null &&
    amount != null &&
    sdkReady &&
    !paymentLoading;

  const handlePurchase = async () => {
    // 중복 요청 방지 가드
    if (paymentLoading) return;
    if (!canSubmit) return;

    const payment = paymentRef.current;
    if (!payment) {
      ToastUtils.error('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const successUrl = `${origin}/mypage/credit/success?changeAmount=${changeAmount}`;
    const failUrl = `${origin}/mypage/credit/fail`;

    // 결제 시도 정보를 sessionStorage에 저장 (failUrl에서 사용)
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          'lastPaymentAttempt',
          JSON.stringify({
            orderId,
            amount: amount!,
            changeAmount: changeAmount!,
            selectedMethod,
            timestamp: Date.now(),
          })
        );
      } catch {
        // sessionStorage 실패는 무시 (선택적 기능)
      }
    }

    setPaymentLoading(true);

    // 결제 실패 시 공통 리다이렉트 헬퍼
    const redirectToPurchase = () => {
      setTimeout(() => {
        router.replace('/mypage?tab=pop&popSubTab=purchase');
      }, 300);
    };

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
    } catch (err: unknown) {
      // 에러 코드/메시지 추출
      const errAny = err as any;
      const code = errAny?.code;
      const message = errAny?.message;
      const errStr = String(err);

      // 사용자가 결제창을 닫았거나 취소한 경우
      if (
        code === 'USER_CANCEL' ||
        code === 'CANCELED' ||
        message?.toLowerCase().includes('cancel') ||
        errStr.toLowerCase().includes('cancel')
      ) {
        ToastUtils.error('결제가 취소되었습니다.');
        redirectToPurchase();
        return;
      }

      // 네트워크/일시 장애 추정
      if (
        code === 'NETWORK_ERROR' ||
        code === 'TIMEOUT' ||
        message?.toLowerCase().includes('network') ||
        message?.toLowerCase().includes('timeout') ||
        message?.toLowerCase().includes('failed') ||
        errStr.toLowerCase().includes('network') ||
        errStr.toLowerCase().includes('timeout')
      ) {
        ToastUtils.error('네트워크 문제로 결제 요청에 실패했습니다. 다시 시도해주세요.');
        redirectToPurchase();
        return;
      }

      // 그 외
      ToastUtils.error('결제 요청에 실패했습니다. 잠시 후 다시 시도해주세요.');
      redirectToPurchase();
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
      <div className={creditStyles.spinnerWrap}>
        <div className={creditStyles.spinner} />
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
      <div className={creditStyles.spinnerWrap}>
        <div className={creditStyles.spinner} />
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
          {!sdkReady
            ? '결제 모듈 로딩 중...'
            : paymentLoading
              ? '결제 진행 중...'
              : '구매하기'}
        </button>
      </div>
    </div>
  );
}
