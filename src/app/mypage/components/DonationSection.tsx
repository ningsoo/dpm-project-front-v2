'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { fetchClient } from '@/api/fetchClient';
import { mypageApi } from '@/api/mypageApi';
import { tokenUtils } from '@/utils/tokenUtils';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../mypage.module.css';

export type PopHistoryResponseRow = {
  userId?: number;
  popHistoryId?: number;
  createdDatetime?: string;
  requestedDatetime?: string;
  approvedDatetime?: string;
  cancelDatetime?: string;
  changeAmount?: number;
  popTarget?: string;
  popStatus?: string;
  related?: { id?: number | null; name?: string | null };
};

/**
 * ApiResponse({ success, message, data }) 형태의 res.data에서 rows 추출.
 * - res.data.data 배열 우선, 없으면 res.data가 직접 배열인 경우 허용.
 */
function parseRestResponse(apiBody: unknown): PopHistoryResponseRow[] {
  if (!apiBody || typeof apiBody !== 'object') return [];
  const obj = apiBody as Record<string, unknown>;
  const data = obj.data;
  if (Array.isArray(data)) return data as PopHistoryResponseRow[];
  if (Array.isArray(apiBody)) return apiBody as PopHistoryResponseRow[];
  return [];
}

const DONATION_SUB_TABS = [
  { id: 'sent' as const, label: '보낸내역' },
  { id: 'received' as const, label: '받은내역' },
];

const BATCH_SIZE = 20;

/** "yyyy-MM-dd HH:mm:ss" -> { date: "yyyy.mm.dd", time: "hh:mm:ss" } (2줄 표시용) */
function formatDateTwoLines(dt?: string): { date: string; time: string } {
  if (!dt || typeof dt !== 'string') return { date: '-', time: '' };
  const s = dt.trim();
  if (!s) return { date: '-', time: '' };
  const head = s.slice(0, 10).replace(/-/g, '.');
  const tail = s.slice(10).trim();
  return { date: head, time: tail };
}

function DonationDateCell({ dt }: { dt?: string }) {
  const { date, time } = formatDateTwoLines(dt);
  return (
    <div className={styles.donationDateCell}>
      <span>{date}</span>
      {time && <span>{time}</span>}
    </div>
  );
}

/** changeAmount를 그대로 표시(음수 허용). 없으면 0. 원 단위 표기 없음 */
function formatAmount(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '0';
  return String(amount);
}

/** 보낸내역 전용: changeAmount를 절대값으로 표시. 없으면 0 */
function formatAmountAbs(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '0';
  return String(Math.abs(amount));
}

/** popStatus -> 한글 라벨 */
const DONATION_STATUS_MAP: Record<string, string> = {
  PENDING: '대기',
  COMPLETED: '완료',
  CANCELED: '취소',
  CANCEL_REQUEST: '취소요청',
  SETTLEMENT_REQUEST: '정산요청',
  SETTLEMENT_COMPLETED: '정산완료',
  EXPIRED: '만료',
};

function getPopStatusLabel(status?: string): string {
  if (!status) return '대기';
  return DONATION_STATUS_MAP[status] ?? '대기';
}

/** popStatus -> 배지 CSS 클래스 */
function getDonationStatusBadgeClass(status?: string): string {
  if (!status) return styles.popStatusNeutral;
  switch (status) {
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

/** 취소하기 버튼 노출 가능 여부 */
function isCancelable(row: PopHistoryResponseRow): boolean {
  if (row.approvedDatetime) return false;
  if (row.popStatus === 'COMPLETED') return false;
  if (row.popStatus === 'CANCELED') return false;
  return true;
}

/** 금액을 콤마 포함하여 절대값으로 표시 */
const numberFormatter = new Intl.NumberFormat('ko-KR');

/** 금액을 절대값 + 콤마로 표시 */
function formatAmountAbsWithComma(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '0';
  return numberFormatter.format(Math.abs(amount));
}

const FIXED_CANCEL_REASON = '구매자 변심으로 인한 취소';

/** createdDatetime 기준 최신순. createdDatetime 없으면 맨 아래로 */
function sortByCreatedDatetimeDesc(rows: PopHistoryResponseRow[]): PopHistoryResponseRow[] {
  return [...rows].sort((a, b) => {
    const aStr = (a.createdDatetime ?? '').toString().trim().slice(0, 10);
    const bStr = (b.createdDatetime ?? '').toString().trim().slice(0, 10);
    if (!aStr && !bStr) return 0;
    if (!aStr) return 1;
    if (!bStr) return -1;
    return bStr.localeCompare(aStr);
  });
}

/** createdDatetime 기준 기간 필터. 파싱 실패 시 포함(누락 방지) */
function filterByDateRange(rows: PopHistoryResponseRow[], range: { start: string; end: string }) {
  if (!range.start && !range.end) return rows;
  return rows.filter((row) => {
    const dt = row.createdDatetime;
    let dateStr = '';
    if (dt != null && typeof dt === 'string') dateStr = dt.trim().slice(0, 10);
    if (!dateStr || dateStr.length < 10) return true;
    if (range.start && dateStr < range.start) return false;
    if (range.end && dateStr > range.end) return false;
    return true;
  });
}

const showedUserIdNullToastRef = { current: false };

export function DonationSection() {
  const userId = tokenUtils.getUserIdFromAccessToken();
  if (userId !== null) showedUserIdNullToastRef.current = false;
  const [subTab, setSubTab] = useState<'sent' | 'received'>('sent');
  const [inputRange, setInputRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sentRaw, setSentRaw] = useState<PopHistoryResponseRow[]>([]);
  const [receivedRaw, setReceivedRaw] = useState<PopHistoryResponseRow[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [visibleCountSent, setVisibleCountSent] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentFilteredLengthRef = useRef(0);
  const [cancelTarget, setCancelTarget] = useState<PopHistoryResponseRow | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const fetchSent = useCallback(async () => {
    const uid = tokenUtils.getUserIdFromAccessToken();
    if (uid === null) {
      setSentRaw([]);
      setSentLoading(false);
      if (!showedUserIdNullToastRef.current) {
        showedUserIdNullToastRef.current = true;
        ToastUtils.error('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      }
      return;
    }
    setSentLoading(true);
    try {
      const res = await mypageApi.getDonationSent(String(uid));
      const rows = parseRestResponse(res.data);
      setSentRaw(Array.isArray(rows) ? rows : []);
      const dataObj = res.data as unknown as Record<string, unknown> | null;
      const dataSummary =
        dataObj && typeof dataObj === 'object'
          ? {
              success: dataObj.success,
              message: dataObj.message,
              dataLength: Array.isArray(dataObj.data) ? dataObj.data.length : '-',
            }
          : res.data;
    } catch (err) {
      setSentRaw([]);
    } finally {
      setSentLoading(false);
      setVisibleCountSent(BATCH_SIZE);
    }
  }, []);

  const fetchReceived = useCallback(async () => {
    const uid = tokenUtils.getUserIdFromAccessToken();
    if (uid === null) {
      setReceivedRaw([]);
      setReceivedLoading(false);
      if (!showedUserIdNullToastRef.current) {
        showedUserIdNullToastRef.current = true;
        ToastUtils.error('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      }
      return;
    }
    setReceivedLoading(true);
    try {
      const res = await mypageApi.getDonationReceived(String(uid));
      const rows = parseRestResponse(res.data);
      setReceivedRaw(Array.isArray(rows) ? rows : []);
      const dataObj = res.data as unknown as Record<string, unknown> | null;
      const dataSummary =
        dataObj && typeof dataObj === 'object'
          ? {
              success: dataObj.success,
              message: dataObj.message,
              dataLength: Array.isArray(dataObj.data) ? dataObj.data.length : '-',
            }
          : res.data;
    } catch (err) {
      setReceivedRaw([]);
    } finally {
      setReceivedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'sent') {
      setVisibleCountSent(BATCH_SIZE);
      fetchSent();
    } else {
      fetchReceived();
    }
  }, [subTab, fetchSent, fetchReceived]);

  const sentFiltered = useMemo(
    () => filterByDateRange(sortByCreatedDatetimeDesc(sentRaw), appliedRange),
    [sentRaw, appliedRange]
  );
  const receivedFiltered = useMemo(
    () =>
      filterByDateRange(sortByCreatedDatetimeDesc(receivedRaw), appliedRange),
    [receivedRaw, appliedRange]
  );
  const sentVisible = useMemo(
    () => sentFiltered.slice(0, visibleCountSent),
    [sentFiltered, visibleCountSent]
  );
  const hasMoreSent = sentFiltered.length > visibleCountSent;
  sentFilteredLengthRef.current = sentFiltered.length;

  useEffect(() => {
  }, [subTab, sentFiltered.length, receivedFiltered.length]);

  const handleSearch = useCallback(() => {
    setAppliedRange({ start: inputRange.start, end: inputRange.end });
    setVisibleCountSent(BATCH_SIZE);
  }, [inputRange.start, inputRange.end]);

  useEffect(() => {
    if (subTab !== 'sent') return;
    const sentinel = sentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !hasMoreSent) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCountSent((prev) =>
          Math.min(prev + BATCH_SIZE, sentFilteredLengthRef.current)
        );
      },
      { root: root ?? undefined, rootMargin: '0px', threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [subTab, hasMoreSent]);

  const handleConfirmCancel = useCallback(async () => {
    const target = cancelTarget;
    if (!target) return;
    const popHistoryId = target.popHistoryId;
    if (popHistoryId == null || typeof popHistoryId !== 'number' || Number.isNaN(popHistoryId)) {
      ToastUtils.error('취소할 내역을 확인할 수 없습니다.');
      return;
    }
    const uid = tokenUtils.getUserIdFromAccessToken();
    if (uid === null) {
      ToastUtils.error('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    const body = {
      popHistoryId,
      changeAmount: Math.abs(target.changeAmount ?? 0),
      message: FIXED_CANCEL_REASON,
    };
    setShowConfirmModal(false);
    setCancelTarget(null);
    setCancelSubmitting(true);
    try {
      await fetchClient.post<unknown>(`/api/users/${uid}/donations/cancel`, body);
      ToastUtils.success('후원이 취소되었습니다.');
      await fetchSent();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const msg = typeof data?.message === 'string' ? data.message : undefined;
      ToastUtils.error(msg || '후원 취소 요청에 실패했습니다.');
    } finally {
      setCancelSubmitting(false);
    }
  }, [cancelTarget, fetchSent]);

  return (
    <div className={styles.donationSection}>
      <div className={styles.settlementSubTabs} role="tablist" aria-label="후원 하위 메뉴">
        {DONATION_SUB_TABS.map((t) => (
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
            disabled={subTab === 'sent' ? sentLoading : receivedLoading}
            onClick={handleSearch}
          >
            {(subTab === 'sent' ? sentLoading : receivedLoading) ? '조회 중…' : '조회'}
          </button>
        </div>

        {subTab === 'sent' && (
          <div ref={scrollContainerRef} className={styles.donationScrollArea}>
            {sentLoading ? (
              <p className={styles.settlementLoading}>로딩 중...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div className={`${styles.tableGrid} ${styles.donationSentGrid9} ${styles.tableHeader}`}>
                  <div>No.</div>
                  <div>후원일</div>
                  <div>요청일</div>
                  <div>승인일</div>
                  <div>취소일</div>
                  <div>금액</div>
                  <div>상태</div>
                  <div>취소</div>
                  <div>수혜자</div>
                </div>
                {sentVisible.length === 0 ? (
                  <div className={styles.settlementEmpty}>후원 보낸 내역이 없습니다.</div>
                ) : (
                  <>
                    {sentVisible.map((row, idx) => (
                      <div
                        key={row.popHistoryId ?? idx}
                        className={`${styles.tableGrid} ${styles.donationSentGrid9} ${styles.tableRow}`}
                      >
                        <div className={styles.tableCell}>{row.popHistoryId ?? '-'}</div>
                        <div className={styles.tableCell}>
                          <DonationDateCell dt={row.createdDatetime} />
                        </div>
                        <div className={styles.tableCell}>
                          <DonationDateCell dt={row.requestedDatetime} />
                        </div>
                        <div className={styles.tableCell}>
                          <DonationDateCell dt={row.approvedDatetime} />
                        </div>
                        <div className={styles.tableCell}>
                          <DonationDateCell dt={row.cancelDatetime} />
                        </div>
                        <div className={styles.tableCell}>{formatAmountAbsWithComma(row.changeAmount)}</div>
                        <div className={styles.tableCell}>
                          <span className={getDonationStatusBadgeClass(row.popStatus)}>
                            {getPopStatusLabel(row.popStatus)}
                          </span>
                        </div>
                        <div className={styles.tableCell}>
                          {isCancelable(row) && (
                            <button
                              type="button"
                              className={styles.donationCancelBtn}
                              disabled={cancelSubmitting}
                              onClick={() => {
                                setCancelTarget(row);
                                setShowConfirmModal(true);
                              }}
                            >
                              취소하기
                            </button>
                          )}
                        </div>
                        <div className={styles.tableCell}>{row.related?.name ?? '-'}</div>
                      </div>
                    ))}
                    {hasMoreSent && (
                      <div ref={sentinelRef} style={{ minHeight: 1, padding: 8 }} aria-hidden="true" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {subTab === 'received' && (
          <div>
            {receivedLoading ? (
              <p className={styles.settlementLoading}>로딩 중...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div className={`${styles.tableGrid} ${styles.donationReceivedGrid8} ${styles.tableHeader}`}>
                  <div>No.</div>
                  <div>후원일</div>
                  <div>요청일</div>
                  <div>확정일</div>
                  <div>취소일</div>
                  <div>금액</div>
                  <div>상태</div>
                  <div>후원자</div>
                </div>
                {receivedFiltered.length === 0 ? (
                  <div className={styles.settlementEmpty}>후원 받은 내역이 없습니다.</div>
                ) : (
                  receivedFiltered.map((row, idx) => (
                    <div
                      key={row.popHistoryId ?? idx}
                      className={`${styles.tableGrid} ${styles.donationReceivedGrid8} ${styles.tableRow}`}
                    >
                      <div className={styles.tableCell}>{row.popHistoryId ?? '-'}</div>
                      <div className={styles.tableCell}>
                        <DonationDateCell dt={row.createdDatetime} />
                      </div>
                      <div className={styles.tableCell}>
                        <DonationDateCell dt={row.requestedDatetime} />
                      </div>
                      <div className={styles.tableCell}>
                        <DonationDateCell dt={row.approvedDatetime} />
                      </div>
                      <div className={styles.tableCell}>
                        <DonationDateCell dt={row.cancelDatetime} />
                      </div>
                      <div className={styles.tableCell}>{formatAmountAbsWithComma(row.changeAmount)}</div>
                      <div className={styles.tableCell}>
                        <span className={getDonationStatusBadgeClass(row.popStatus)}>
                          {getPopStatusLabel(row.popStatus)}
                        </span>
                      </div>
                      <div className={styles.tableCell}>{row.related?.name ?? '-'}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="donation-cancel-modal-title"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3
              id="donation-cancel-modal-title"
              className={styles.modalTitle}
              style={{ fontSize: '1.1rem', marginBottom: 12 }}
            >
              후원 취소 확인
            </h3>
            <p className={styles.donationConfirmMessage}>
              정말 이 음악인에 대한 후원을 취소하시겠습니까?
            </p>
            <div className={styles.settlementConfirmActions}>
              <button
                type="button"
                className={styles.settlementConfirmBtn}
                disabled={cancelSubmitting}
                onClick={handleConfirmCancel}
              >
                {cancelSubmitting ? '처리 중…' : '확인'}
              </button>
              <button
                type="button"
                className={styles.settlementConfirmCancelBtn}
                disabled={cancelSubmitting}
                onClick={() => {
                  setShowConfirmModal(false);
                  setCancelTarget(null);
                }}
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
