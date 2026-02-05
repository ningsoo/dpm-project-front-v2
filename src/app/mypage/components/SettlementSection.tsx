'use client';

import { useState, useCallback, useEffect } from 'react';
import styles from '../mypage.module.css';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';

export interface SettlementUser {
  id: string;
  nickname: string;
  phoneNumber: string;
}

/** PopHistoryResponse 기반 파서. 백엔드 변경 시 이 함수만 교체하면 됨. */
export type SettlementHistoryItem = {
  requestedDatetime?: string;
  approvedDatetime?: string;
  changeAmount?: number;
  statusLabel?: '정산신청' | '정산완료';
};

/** popStatus → UI 표시용 2개 값만. 값 확정 시 switch 케이스 추가/수정. */
function mapPopStatusToLabel(popStatus: unknown): '정산신청' | '정산완료' {
  const s = popStatus != null ? String(popStatus).toUpperCase() : '';
  switch (s) {
    case 'APPROVED':
    case 'COMPLETED':
    case 'DONE':
      return '정산완료';
    default:
      return '정산신청';
  }
}

export function parseSettlementHistory(data: unknown): SettlementHistoryItem[] {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const changeAmount = row.changeAmount;
      const numAmount =
        typeof changeAmount === 'number' && !Number.isNaN(changeAmount) ? changeAmount : undefined;
      return {
        requestedDatetime:
          row.requestedDatetime != null ? String(row.requestedDatetime) : undefined,
        approvedDatetime:
          row.approvedDatetime != null ? String(row.approvedDatetime) : undefined,
        changeAmount: numAmount,
        statusLabel: mapPopStatusToLabel(row.popStatus),
      };
    });
  }
  if (typeof data === 'string') {
    try {
      return parseSettlementHistory(JSON.parse(data));
    } catch {
      return [];
    }
  }
  return [];
}

function formatSettlementDate(dt?: string): string {
  if (!dt || typeof dt !== 'string') return '-';
  return dt.trim();
}

function formatSettlementAmount(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '0원';
  return `${amount.toLocaleString()}원`;
}

const SETTLEMENT_SUB_TABS = [
  { id: 'history' as const, label: '정산 내역' },
  { id: 'register' as const, label: '정산 정보 등록' },
  { id: 'request' as const, label: '정산 신청' },
];

interface SettlementSectionProps {
  user: SettlementUser;
}

type HistoryItem = SettlementHistoryItem;

export function SettlementSection({ user }: SettlementSectionProps) {
  const [subTab, setSubTab] = useState<'history' | 'register' | 'request'>('history');
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRange, setHistoryRange] = useState({ start: '', end: '' });
  const [accountForm, setAccountForm] = useState({
    userId: user.id ?? '',
    username: user.nickname ?? '',
    phoneNumber: user.phoneNumber?.replace(/\D/g, '') ?? '',
    accountNumber: '',
  });
  const [registerErrors, setRegisterErrors] = useState<{
    userId?: string;
    username?: string;
    phoneNumber?: string;
    accountNumber?: string;
  }>({});
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [showRequestConfirm, setShowRequestConfirm] = useState(false);

  /** 나중에 정산 가능 금액 전용 API가 생기면 이 함수 내부만 교체 */
  const getAvailableAmount = useCallback(() => {
    return historyList.reduce(
      (sum, item) =>
        sum + (typeof item.changeAmount === 'number' && !Number.isNaN(item.changeAmount) ? item.changeAmount : 0),
      0
    );
  }, [historyList]);

  const fetchHistory = useCallback(() => {
    setHistoryLoading(true);
    const params = historyRange.start || historyRange.end
      ? { start: historyRange.start || undefined, end: historyRange.end || undefined }
      : undefined;
    mypageApi
      .getSettlementsHistory(params)
      .then((res) => {
        const body = res.data as { success?: boolean; message?: string; data?: unknown };
        if (body && body.success === false) {
          setHistoryList([]);
          return;
        }
        const data = body?.data ?? body;
        setHistoryList(parseSettlementHistory(data));
      })
      .catch(() => {
        setHistoryList([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [historyRange.start, historyRange.end]);

  const handleHistorySearch = () => {
    fetchHistory();
  };

  useEffect(() => {
    if (subTab === 'history') fetchHistory();
  }, [subTab, fetchHistory]);

  useEffect(() => {
    setAccountForm((prev) => ({
      ...prev,
      userId: user.id ?? prev.userId,
      username: user.nickname ?? prev.username,
      phoneNumber: user.phoneNumber?.replace(/\D/g, '') ?? prev.phoneNumber,
    }));
  }, [user.id, user.nickname, user.phoneNumber]);

  const historyTotalAmount = historyList.reduce(
    (sum, item) =>
      sum + (typeof item.changeAmount === 'number' && !Number.isNaN(item.changeAmount) ? item.changeAmount : 0),
    0
  );

  const handleRegisterAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof registerErrors = {};
    const rawUserId = (accountForm.userId ?? '').trim() || user.id;
    const userIdNum = rawUserId ? parseInt(String(rawUserId), 10) : NaN;
    if (!rawUserId || Number.isNaN(userIdNum)) {
      errors.userId = '사용자 ID를 입력하세요.';
    }
    if (!accountForm.username?.trim()) {
      errors.username = '예금주명을 입력하세요.';
    }
    const phoneDigits = (accountForm.phoneNumber ?? '').replace(/\D/g, '');
    if (!phoneDigits) {
      errors.phoneNumber = '연락처를 입력하세요.';
    } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      errors.phoneNumber = '연락처는 10~11자리로 입력하세요.';
    }
    if (!accountForm.accountNumber?.trim()) {
      errors.accountNumber = '계좌번호를 입력하세요.';
    }
    setRegisterErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAccountSubmitting(true);
    mypageApi
      .registerSettlementAccount({
        userId: userIdNum,
        username: accountForm.username!.trim(),
        phoneNumber: phoneDigits,
        accountNumber: accountForm.accountNumber!.trim(),
      })
      .then((res) => {
        const body = res.data as { success?: boolean; message?: string };
        if (body && body.success === false) {
          ToastUtils.error(body.message || '정산 계좌 등록에 실패했습니다.');
          return;
        }
        ToastUtils.success(body?.message || '정산 계좌가 등록되었습니다.');
      })
      .catch(() => {
        ToastUtils.error('정산 계좌 등록에 실패했습니다.');
      })
      .finally(() => setAccountSubmitting(false));
  };

  const handleRequestSettlementClick = () => {
    setShowRequestConfirm(true);
  };

  const handleRequestConfirmCancel = () => {
    setShowRequestConfirm(false);
    ToastUtils.info('정산 요청을 취소했습니다.');
  };

  const handleRequestConfirmOk = () => {
    setRequestSubmitting(true);
    mypageApi
      .requestSettlement()
      .then((res) => {
        const body = res.data as { success?: boolean; message?: string };
        setShowRequestConfirm(false);
        if (body && body.success === false) {
          ToastUtils.error(body.message || '정산 신청에 실패했습니다.');
          return;
        }
        ToastUtils.success(body?.message || '정산 신청이 완료되었습니다.');
        setSubTab('history');
        fetchHistory();
      })
      .catch(() => {
        ToastUtils.error('정산 신청에 실패했습니다.');
      })
      .finally(() => setRequestSubmitting(false));
  };

  return (
    <div className={styles.settlementSection}>
      <div className={styles.settlementSubTabs} role="tablist" aria-label="정산 하위 메뉴">
        {SETTLEMENT_SUB_TABS.map((t) => (
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

      <div className={styles.settlementInnerContent}>
        {subTab === 'history' && (
          <div>
            <div className={styles.settlementSummaryBlock}>
              <div className={styles.settlementSummaryRow}>
                <span>총 정산액</span>
                <span className={styles.settlementTotalAmount}>{historyTotalAmount.toLocaleString()}원</span>
              </div>
            </div>
            <div className={styles.settlementDateRow}>
              <input
                type="date"
                value={historyRange.start}
                onChange={(e) => setHistoryRange((r) => ({ ...r, start: e.target.value }))}
                className={styles.settlementDateInput}
                aria-label="시작일"
              />
              <span>~</span>
              <input
                type="date"
                value={historyRange.end}
                onChange={(e) => setHistoryRange((r) => ({ ...r, end: e.target.value }))}
                className={styles.settlementDateInput}
                aria-label="종료일"
              />
              <button
                type="button"
                className={styles.settlementSearchBtn}
                disabled={historyLoading}
                onClick={handleHistorySearch}
              >
                {historyLoading ? '조회 중…' : '조회'}
              </button>
            </div>
            {historyLoading ? (
              <p className={styles.settlementLoading}>로딩 중...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableHeader}`}>
                  <div style={{ textAlign: 'left' }}>정산요청일</div>
                  <div style={{ textAlign: 'center' }}>정산승인일</div>
                  <div style={{ textAlign: 'center' }}>변동 수량</div>
                  <div style={{ textAlign: 'center' }}>정산금액</div>
                  <div style={{ textAlign: 'right', paddingRight: '20px' }}>정산처리상태</div>
                </div>
                {historyList.length === 0 ? (
                  <div className={styles.settlementEmpty}>정산 내역이 없습니다.</div>
                ) : (
                  historyList.map((item, idx) => (
                    <div
                      key={idx}
                      className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableRow}`}
                    >
                      <div className={styles.tableCell}>{formatSettlementDate(item.requestedDatetime)}</div>
                      <div className={styles.tableCell}>{formatSettlementDate(item.approvedDatetime)}</div>
                      <div className={styles.tableCell}>{formatSettlementAmount(item.changeAmount)}</div>
                      <div className={styles.tableCell}>{formatSettlementAmount(item.changeAmount)}</div>
                      <div className={styles.tableCell} style={{ textAlign: 'right', paddingRight: '20px' }}>
                        {item.statusLabel ?? '정산신청'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {subTab === 'register' && (
          <div>
            <h3 className={styles.settlementHistoryTitle}>정산 정보 등록</h3>
            <form onSubmit={handleRegisterAccount} className={styles.settlementForm}>
              <div className={styles.settlementField}>
                <label htmlFor="settlement-userId">userId</label>
                <input
                  id="settlement-userId"
                  type="text"
                  inputMode="numeric"
                  value={accountForm.userId}
                  onChange={(e) => {
                    setAccountForm({ ...accountForm, userId: e.target.value });
                    if (registerErrors.userId) setRegisterErrors((err) => ({ ...err, userId: undefined }));
                  }}
                  readOnly={!!user.id}
                  className={styles.settlementInput}
                  placeholder="사용자 ID"
                  aria-invalid={!!registerErrors.userId}
                />
                {registerErrors.userId && (
                  <span className={styles.error}>{registerErrors.userId}</span>
                )}
              </div>
              <div className={styles.settlementField}>
                <label htmlFor="settlement-username">username</label>
                <input
                  id="settlement-username"
                  type="text"
                  value={accountForm.username}
                  onChange={(e) => {
                    setAccountForm({ ...accountForm, username: e.target.value });
                    if (registerErrors.username) setRegisterErrors((err) => ({ ...err, username: undefined }));
                  }}
                  className={styles.settlementInput}
                  placeholder="예금주명"
                  aria-invalid={!!registerErrors.username}
                />
                {registerErrors.username && (
                  <span className={styles.error}>{registerErrors.username}</span>
                )}
              </div>
              <div className={styles.settlementField}>
                <label htmlFor="settlement-phone">phoneNumber</label>
                <input
                  id="settlement-phone"
                  type="tel"
                  inputMode="numeric"
                  value={accountForm.phoneNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setAccountForm({ ...accountForm, phoneNumber: v });
                    if (registerErrors.phoneNumber) setRegisterErrors((err) => ({ ...err, phoneNumber: undefined }));
                  }}
                  className={styles.settlementInput}
                  placeholder="숫자 10~11자리"
                  aria-invalid={!!registerErrors.phoneNumber}
                />
                {registerErrors.phoneNumber && (
                  <span className={styles.error}>{registerErrors.phoneNumber}</span>
                )}
              </div>
              <div className={styles.settlementField}>
                <label htmlFor="settlement-account">accountNumber</label>
                <input
                  id="settlement-account"
                  type="text"
                  value={accountForm.accountNumber}
                  onChange={(e) => {
                    setAccountForm({ ...accountForm, accountNumber: e.target.value });
                    if (registerErrors.accountNumber) setRegisterErrors((err) => ({ ...err, accountNumber: undefined }));
                  }}
                  className={styles.settlementInput}
                  placeholder="계좌번호"
                  aria-invalid={!!registerErrors.accountNumber}
                />
                {registerErrors.accountNumber && (
                  <span className={styles.error}>{registerErrors.accountNumber}</span>
                )}
              </div>
              <button type="submit" className={styles.submitBtn} disabled={accountSubmitting}>
                {accountSubmitting ? '등록 중…' : '등록'}
              </button>
            </form>
          </div>
        )}

        {subTab === 'request' && (
          <div>
            <h3 className={styles.settlementHistoryTitle}>정산 신청</h3>
            <div className={styles.settlementSummaryBlock}>
              <div className={styles.settlementSummaryRow}>
                <span>정산 가능 금액</span>
                <span className={styles.settlementTotalAmount}>
                  {getAvailableAmount().toLocaleString()}원
                </span>
              </div>
            </div>
            <div className={styles.settlementRequestInfoBox}>
              <p>정산은 매월 10일에 이행됩니다.</p>
              <p>정산 신청 후 관리자 승인이 필요합니다.</p>
              <p>부분 정산이 아닌 누적 금액 전체 정산으로 진행됩니다.</p>
            </div>
            <button
              type="button"
              className={styles.submitBtn}
              disabled={requestSubmitting || getAvailableAmount() === 0}
              onClick={handleRequestSettlementClick}
            >
              {requestSubmitting ? '신청 중…' : '정산 요청'}
            </button>
          </div>
        )}
      </div>

      {showRequestConfirm && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settlement-request-confirm-title"
          onClick={handleRequestConfirmCancel}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="settlement-request-confirm-title" className={styles.modalTitle}>
              정산을 요청하시겠습니까?
            </h3>
            <div className={styles.settlementConfirmActions}>
              <button
                type="button"
                className={styles.settlementConfirmBtn}
                onClick={handleRequestConfirmOk}
                disabled={requestSubmitting}
              >
                확인
              </button>
              <button
                type="button"
                className={styles.settlementConfirmCancelBtn}
                onClick={handleRequestConfirmCancel}
                disabled={requestSubmitting}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
