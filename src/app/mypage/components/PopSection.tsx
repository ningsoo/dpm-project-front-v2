'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ToastUtils } from '@/utils/toastUtils';
import { mypageApi } from '@/api/mypageApi';
import styles from '../mypage.module.css';
import type { AxiosError } from 'axios';

interface PopSectionProps {
  user: { id: string; credits?: number };
  onChargeClick?: () => void;
}

const POP_SUB_TABS = [
  { id: 'usage' as const, label: '사용내역' },
  { id: 'purchase' as const, label: '구매내역' },
];

const USAGE_COLUMNS = ['사용일시', '사용수량', '사용대상', '사용내용', '사용상태', '사용취소'];
const PURCHASE_COLUMNS = ['충전일시', '충전수량', '팝타겟', '결제금액', '유효기간', '구매취소'];

export type PopUsageRow = {
  requestedDatetime?: string;
  createdDatetime?: string;
  approvedDatetime?: string | null;
  changeAmount?: number;
  popTarget?: string;
  popStatus?: string;
  related?: { name?: string | null };
};

export type PopPurchaseRow = {
  createdDatetime?: string;
  changeAmount?: number;
  target?: string;
  actualAmount?: number;
  expiredDatetime?: string;
  isCanceled?: boolean;
};

function parsePopResponse(res: unknown): unknown[] {
  if (!res || typeof res !== 'object') return [];
  const obj = res as Record<string, unknown>;
  const data = obj.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(res)) return res;
  return [];
}

function formatPopDate(dt?: string): string {
  if (!dt || typeof dt !== 'string') return '-';
  return dt.trim().slice(0, 19).replace('T', ' ');
}

/** YYYY.MM.DD / HH:MM:SS 2줄 표시용 */
function formatDateTwoLines(dt?: string): { date: string; time: string } {
  if (!dt || typeof dt !== 'string') return { date: '-', time: '' };
  const s = dt.trim();
  if (!s) return { date: '-', time: '' };
  const date = s.slice(0, 10).replace(/-/g, '.');
  const timePart = s.slice(11).replace(/^[T\s]+/, '').slice(0, 8);
  const time = /^\d{2}:\d{2}/.test(timePart) ? timePart : '';
  return { date, time };
}

function PopUsageDateCell({ dt }: { dt?: string }) {
  const { date, time } = formatDateTwoLines(dt);
  return (
    <div className={styles.donationDateCell}>
      <span>{date}</span>
      {time && <span>{time}</span>}
    </div>
  );
}

/** popTarget -> 한글 라벨 */
const POP_TARGET_MAP: Record<string, string> = {
  CHARGE: '충전',
  DONATION: '후원',
  FEATURED_BOARD: '게시글 홍보',
  RECEIVED: '수령',
  EVENT: '이벤트',
};

function mapPopTargetToLabel(popTarget?: string): string {
  if (!popTarget) return '-';
  return POP_TARGET_MAP[popTarget] ?? '-';
}

/** popStatus -> 한글 라벨 */
const POP_STATUS_MAP: Record<string, string> = {
  PENDING: '대기',
  COMPLETED: '완료',
  CANCELED: '취소',
  CANCEL_REQUEST: '취소요청',
  SETTLEMENT_REQUEST: '정산요청',
  SETTLEMENT_COMPLETED: '정산완료',
  EXPIRED: '만료',
};

function mapPopStatusToLabel(popStatus?: string): string {
  if (!popStatus) return '-';
  return POP_STATUS_MAP[popStatus] ?? '-';
}

/** popStatus -> 배지 CSS 클래스 */
function getPopStatusBadgeClass(popStatus?: string): string {
  if (!popStatus) return '';
  switch (popStatus) {
    case 'COMPLETED':
    case 'SETTLEMENT_COMPLETED':
      return styles.popStatusPositive;
    case 'CANCELED':
    case 'EXPIRED':
      return styles.popStatusNegative;
    case 'PENDING':
    case 'CANCEL_REQUEST':
    case 'SETTLEMENT_REQUEST':
      return styles.popStatusNeutral;
    default:
      return styles.popStatusNeutral;
  }
}

/** changeAmount를 "원" 단위로 표시 (절대값) */
function formatAmountWithWon(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return `${Math.abs(amount)}원`;
}

/** changeAmount를 POP 단위로 표시 (절대값) */
function formatAmountWithPop(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return `${Math.abs(amount)} POP`;
}

/** actualAmount를 원 단위로 표시 (천단위 콤마) */
function formatActualAmount(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return `${amount.toLocaleString()}원`;
}

/** target이 CHARGE인 경우 "충전" 표시 */
function mapPurchaseTargetToLabel(target?: string): string {
  if (!target) return '-';
  return String(target).toUpperCase() === 'CHARGE' ? '충전' : '-';
}

export function PopSection({ user, onChargeClick }: PopSectionProps) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<'usage' | 'purchase'>('usage');
  const [inputRange, setInputRange] = useState({ start: '', end: '' });
  const [usageList, setUsageList] = useState<PopUsageRow[]>([]);
  const [purchaseList, setPurchaseList] = useState<PopPurchaseRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const handleError = useCallback(
    (err: unknown) => {
      const status = (err as AxiosError)?.response?.status;
      if (status === 401) {
        router.push('/auth/login');
      } else {
        ToastUtils.error('내역을 불러올 수 없습니다.');
      }
    },
    [router]
  );

  const fetchUsage = useCallback(() => {
    setUsageLoading(true);
    mypageApi
      .getPopUsageHistory()
      .then((res) => {
        const body = res.data as { data?: unknown };
        const rows = parsePopResponse(body?.data ?? body) as PopUsageRow[];
        setUsageList(Array.isArray(rows) ? rows : []);
      })
      .finally(() => setUsageLoading(false));
  }, []);

  const fetchPurchase = useCallback(() => {
    setPurchaseLoading(true);
    mypageApi
      .getPopPurchaseHistory()
      .then((res) => {
        const body = res.data as { data?: unknown };
        const rows = parsePopResponse(body?.data ?? body) as PopPurchaseRow[];
        setPurchaseList(Array.isArray(rows) ? rows : []);
      })
      .catch(handleError)
      .finally(() => setPurchaseLoading(false));
  }, [handleError]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    if (subTab === 'purchase') {
      fetchPurchase();
    }
  }, [subTab, fetchPurchase]);

  const handleCancelUsageClick = () => {
    ToastUtils.info('준비중입니다.');
  };

  const handleCancelPurchaseClick = () => {
    ToastUtils.info('준비중입니다.');
  };

  const handleSearch = () => {
    if (subTab === 'usage') {
      fetchUsage();
    } else {
      fetchPurchase();
    }
  };

  return (
    <div className={styles.popSection}>
      <div className={styles.settlementRequestSummaryBox}>
        <div className={styles.settlementSummaryRow}>
          <span>보유 POP</span>
          <span className={styles.settlementTotalAmount}>{user.credits ?? 0}</span>
        </div>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={() => onChargeClick?.()}
        >
          충전하기
        </button>
      </div>

      <div className={styles.settlementSubTabs} role="tablist" aria-label="POP 하위 메뉴">
        {POP_SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={subTab === t.id}
            className={subTab === t.id ? styles.settlementSubTabActive : styles.settlementSubTab}
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
            {subTab === t.id && <span className={styles.settlementSubTabIndicator} aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className={styles.settlementDateRow}>
        <input
          type="date"
          value={inputRange.start}
          onChange={(e) => setInputRange((r) => ({ ...r, start: e.target.value }))}
          className={styles.settlementDateInput}
          aria-label="시작일"
        />
        <span>~</span>
        <input
          type="date"
          value={inputRange.end}
          onChange={(e) => setInputRange((r) => ({ ...r, end: e.target.value }))}
          className={styles.settlementDateInput}
          aria-label="종료일"
        />
        <button
          type="button"
          className={styles.settlementSearchBtn}
          disabled={subTab === 'usage' ? usageLoading : purchaseLoading}
          onClick={handleSearch}
        >
          {(subTab === 'usage' ? usageLoading : purchaseLoading) ? '조회 중…' : '조회'}
        </button>
      </div>

      <div className={styles.popTableWrap}>
        {subTab === 'usage' && (
          <div style={{ overflowX: 'auto' }}>
            <div className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableHeader}`}>
              {USAGE_COLUMNS.map((col) => (
                <div key={col}>{col}</div>
              ))}
            </div>
            {usageLoading ? (
              <div className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.settlementGrid3EmptyRow}`}>
                <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                  로딩 중...
                </div>
              </div>
            ) : usageList.length === 0 ? (
              <div className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.settlementGrid3EmptyRow}`}>
                <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                  내역이 없습니다.
                </div>
              </div>
            ) : (
              usageList.map((row, idx) => {
                const usageDatetime = row.requestedDatetime ?? row.createdDatetime;
                return (
                  <div
                    key={idx}
                    className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableRow}`}
                  >
                    <div className={styles.tableCell}>
                      <PopUsageDateCell dt={usageDatetime} />
                    </div>
                    <div className={styles.tableCell}>
                      {formatAmountWithWon(row.changeAmount)}
                    </div>
                    <div className={styles.tableCell}>
                      {row.related?.name ?? '-'}
                    </div>
                    <div className={styles.tableCell}>
                      {mapPopTargetToLabel(row.popTarget)}
                    </div>
                    <div className={styles.tableCell}>
                      <span className={getPopStatusBadgeClass(row.popStatus)}>
                        {mapPopStatusToLabel(row.popStatus)}
                      </span>
                    </div>
                    <div className={styles.tableCell}>
                      {!row.approvedDatetime && row.popStatus !== 'COMPLETED' && row.popStatus !== 'CANCELED' && (
                        <button
                          type="button"
                          className={styles.donationCancelBtn}
                          onClick={handleCancelUsageClick}
                        >
                          사용취소
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        {subTab === 'purchase' && (
          <div style={{ overflowX: 'auto' }}>
            <div className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.tableHeader}`}>
              {PURCHASE_COLUMNS.map((col) => (
                <div key={col}>{col}</div>
              ))}
            </div>
            {purchaseLoading ? (
              <div className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.settlementGrid3EmptyRow}`}>
                <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                  로딩 중...
                </div>
              </div>
            ) : purchaseList.length === 0 ? (
              <div className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.settlementGrid3EmptyRow}`}>
                <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                  내역이 없습니다.
                </div>
              </div>
            ) : (
              purchaseList.map((row, idx) => (
                <div
                  key={idx}
                  className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.tableRow}`}
                >
                  <div className={styles.tableCell}>
                    <PopUsageDateCell dt={row.createdDatetime} />
                  </div>
                  <div className={styles.tableCell}>
                    {formatAmountWithPop(row.changeAmount)}
                  </div>
                  <div className={styles.tableCell}>
                    {mapPurchaseTargetToLabel(row.target)}
                  </div>
                  <div className={styles.tableCell}>
                    {formatActualAmount(row.actualAmount)}
                  </div>
                  <div className={styles.tableCell}>
                    <PopUsageDateCell dt={row.expiredDatetime} />
                  </div>
                  <div className={styles.tableCell}>
                    {row.isCanceled ? (
                      <span style={{ color: '#999' }}>취소완료</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.donationCancelBtn}
                        onClick={handleCancelPurchaseClick}
                      >
                        구매취소
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
