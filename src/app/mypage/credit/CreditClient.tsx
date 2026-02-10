'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import {
  loadPaymentWidget,
  ANONYMOUS,
  type PaymentWidgetInstance,
} from '@tosspayments/payment-widget-sdk';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../mypage.module.css';
import creditStyles from './credit.module.css';

interface UserInfo {
  credits?: number;
}

function parsePositiveInt(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

export default function CreditClient() {
  const router = useRouter();
  const params = useSearchParams();
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const widgetReadyRef = useRef(false);

  const orderId = params.get('orderId') ?? '';
  const changeAmount = parsePositiveInt(params.get('changeAmount'));
  const amount = parsePositiveInt(params.get('amount'));

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [queryValid, setQueryValid] = useState<boolean | null>(null);

  // 1. Query 검증: orderId 없거나 changeAmount/amount 파싱 실패 시 리다이렉트
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

  // 3. 토스 결제 위젯 초기화: 위젯 로드 → DOM 준비 대기 → 렌더 (중복 실행 방지)
  useEffect(() => {
    if (queryValid !== true || amount == null || amount <= 0) return;

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      ToastUtils.error('결제 환경 설정이 없습니다.');
      router.replace('/mypage');
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;

    const amountNum = amount;

    function tryRender(widget: PaymentWidgetInstance) {
      if (cancelled) return;
      if (widgetReadyRef.current) return;

      const paymentEl = document.getElementById('payment-method');
      const agreementEl = document.getElementById('agreement');
      if (paymentEl && agreementEl) {
        widget.renderPaymentMethods('#payment-method', amountNum);
        widget.renderAgreement('#agreement');
        widgetReadyRef.current = true;
        return;
      }
      rafId = requestAnimationFrame(() => tryRender(widget));
    }

    loadPaymentWidget(clientKey, ANONYMOUS)
      .then((widget) => {
        if (cancelled) return;
        paymentWidgetRef.current = widget;
        rafId = requestAnimationFrame(() => tryRender(widget));
      })
      .catch(() => {
        if (!cancelled) ToastUtils.error('결제 위젯을 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      widgetReadyRef.current = false;
      paymentWidgetRef.current = null;
    };
  }, [queryValid, amount, router]);

  const canSubmit = queryValid === true && changeAmount != null && amount != null;
  const handlePurchase = async () => {
    if (!canSubmit) return;

    const widget = paymentWidgetRef.current;
    if (!widget) {
      ToastUtils.error('결제 위젯을 불러오는 중입니다.');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const successUrl = `${origin}/mypage/credit/success?changeAmount=${changeAmount}`;
    const failUrl = `${origin}/mypage/credit/fail`;

    try {
      await widget.requestPayment({
        orderId,
        orderName: 'POP 충전',
        successUrl,
        failUrl,
      });
    } catch (err) {
      ToastUtils.error('결제 요청에 실패했습니다.');
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
          <div id="payment-method" className={creditStyles.widgetBox} />
        </section>

        <section className={creditStyles.widgetSection}>
          <div id="agreement" className={creditStyles.widgetBox} />
        </section>

        <button
          type="button"
          className={creditStyles.submitBtn}
          disabled={!canSubmit}
          onClick={handlePurchase}
        >
          구매하기
        </button>
      </div>
    </div>
  );
}
