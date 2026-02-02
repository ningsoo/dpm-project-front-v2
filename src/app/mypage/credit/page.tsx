'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../mypage.module.css';
import creditStyles from './credit.module.css';

interface UserInfo {
  credits?: number;
}

const PAYMENT_METHODS = [
  { id: 'easy', label: '간편결제' },
  { id: 'card', label: '신용카드' },
  { id: 'transfer', label: '계좌이체' },
] as const;

type PayMethodId = (typeof PAYMENT_METHODS)[number]['id'];

export default function CreditPage() {
  const router = useRouter();
  const params = useSearchParams();
  const amountParam = params.get('amount') ?? '0';
  const amountNum = parseInt(amountParam, 10) || 0;
  const finalAmount = amountNum + Math.floor(amountNum / 10);

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [payMethod, setPayMethod] = useState<PayMethodId | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!initialized) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    mypageApi.getMypage()
      .then(({ data }) => {
        const userData = data?.data as UserInfo | undefined;
        if (userData) {
          setUser(userData);
        } else {
          ToastUtils.error('사용자 정보를 불러올 수 없습니다.');
          router.push('/auth/login');
        }
      })
      .catch((error) => {
        if (error?.response?.status === 401) {
          router.push('/auth/login');
        } else {
          ToastUtils.error('사용자 정보를 불러올 수 없습니다.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [initialized, isAuthenticated, router]);

  const amountValid = amountNum > 0;
  const canSubmit = amountValid && payMethod !== null && agreed;

  const handlePurchase = () => {
    if (!canSubmit) return;
    console.log({ payMethod, amount: amountNum, finalAmount, agreed });
  };

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

  return (
    <div className={creditStyles.wrap}>
      <div className={creditStyles.inner}>
        <h1 className={creditStyles.title}>POP 충전</h1>

        <section>
          <h2 className={creditStyles.sectionLabel}>결제수단</h2>
          <ul className={creditStyles.methodList}>
            {PAYMENT_METHODS.map((m) => (
              <li key={m.id} className={creditStyles.methodItem}>
                <button
                  type="button"
                  className={`${creditStyles.methodBtn} ${payMethod === m.id ? creditStyles.selected : ''}`}
                  onClick={() => setPayMethod(m.id)}
                >
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={creditStyles.summaryBox}>
          <div className={creditStyles.summaryRow}>
            <span>충전할 POP</span>
            <span>{amountNum > 0 ? amountNum.toLocaleString('ko-KR') : '-'}원</span>
          </div>
          <div className={creditStyles.summaryRow}>
            <span>최종 결제금액</span>
            <span>{amountNum > 0 ? finalAmount.toLocaleString('ko-KR') : '-'}원</span>
          </div>
        </section>

        <label className={creditStyles.agreeWrap}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            aria-label="구매 유의사항 동의"
          />
          <span className={creditStyles.agreeLabel}>
            구매 유의사항을 확인하였으며, 결제에 동의합니다.
          </span>
        </label>

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
