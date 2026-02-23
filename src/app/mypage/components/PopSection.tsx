'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchClient } from '@/api/fetchClient';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { mypageApi } from '@/api/mypageApi';
import { cancelPayment } from '@/api/creditApi';
import { toUserFriendlyTossMessage } from '@/utils/tossErrorMessage';
import styles from '../mypage.module.css';
import type { AxiosError } from 'axios';

interface PopSectionProps {
  user: { id: string; popBalance?: number };
  subTab: 'usage' | 'purchase';
  onChangeSubTab: (next: 'usage' | 'purchase') => void;
  onPopBalanceRefresh?: () => Promise<void> | void;
  onChargeClick?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

const POP_SUB_TABS = [
  { id: 'purchase' as const, label: '구매내역' },
  { id: 'usage' as const, label: '사용내역' },
];

const USAGE_COLUMNS = ['사용일시', '사용수량', '사용대상', '사용내용', '사용상태', '사용취소'];
const PURCHASE_COLUMNS = ['충전일시', '충전수량', '상세내역', '결제금액', '유효기간', '구매취소'];

export type PopUsageRow = {
  popHistoryId?: number;
  requestedDatetime?: string;
  createdDatetime?: string;
  approvedDatetime?: string | null;
  changeAmount?: number;
  popTarget?: string;
  popStatus?: string;
  related?: { id?: number | null; name?: string | null };
  transactionId?: string | null;
};

export type PopPurchaseRow = {
  popHistoryId?: number;
  orderId?: string;
  paymentKey?: string;
  createdDatetime?: string;
  changeAmount?: number;
  target?: string;
  popStatus?: string;
  actualAmount?: number | null;
  expiredDatetime?: string;
  canceled?: boolean;
  isCanceled?: boolean;
};

function parsePopResponse(res: unknown): unknown[] {
  if (Array.isArray(res)) return normalizeUsageRows(res);
  if (!res || typeof res !== 'object') return [];
  const obj = res as Record<string, unknown>;
  // 응답이 { data: [...] } 형태
  if (obj.data && Array.isArray(obj.data)) return normalizeUsageRows(obj.data);
  if (obj.data && typeof obj.data === 'object' && obj.data !== null) {
    const inner = obj.data as Record<string, unknown>;
    const innerData = inner.data;
    if (Array.isArray(innerData)) return normalizeUsageRows(innerData);
    if (Array.isArray(inner.content)) return normalizeUsageRows(inner.content);
    if (Array.isArray(inner.usage)) return normalizeUsageRows(inner.usage);
    if (Array.isArray(inner.usageList)) return normalizeUsageRows(inner.usageList);
    const merged = collectAllArraysFromObject(inner);
    if (merged.length > 0) return sortUsageByDateDesc(normalizeUsageRows(merged));
  }
  // 최상위 content / usage (Spring Page 등)
  if (Array.isArray(obj.content)) return normalizeUsageRows(obj.content);
  if (Array.isArray(obj.usage)) return normalizeUsageRows(obj.usage);
  return [];
}

/**
 * 백엔드 PopHistoryResponse: related는 createRelatedInfo로 채워짐.
 * - FEATURED_BOARD: related에 boardId/제목, DONATION: related에 수령자 정보.
 * related.id가 없고 related.boardId만 있으면 id로 통일(사용취소 시 boardId 필드 사용).
 */
function normalizeUsageRows(rows: unknown[]): unknown[] {
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const r = row as Record<string, unknown>;
    let related = r.related;
    if (related && typeof related === 'object') {
      const rel = related as Record<string, unknown>;
      const id = rel.id ?? rel.boardId ?? rel.board_id;
      if (id !== undefined) related = { ...rel, id };
    } else if (r.board && typeof r.board === 'object') {
      const b = r.board as Record<string, unknown>;
      related = { id: b.boardId ?? b.board_id, name: b.title ?? b.name };
    }
    if (related && typeof related === 'object') return { ...r, related };
    return r;
  });
}

function collectAllArraysFromObject(o: Record<string, unknown>): unknown[] {
  const out: unknown[] = [];
  for (const v of Object.values(o)) {
    if (Array.isArray(v)) out.push(...v);
  }
  return out;
}

function sortUsageByDateDesc(rows: unknown[]): unknown[] {
  return [...rows].sort((a, b) => {
    const dateA = (a as Record<string, unknown>)?.requestedDatetime ?? (a as Record<string, unknown>)?.createdDatetime ?? '';
    const dateB = (b as Record<string, unknown>)?.requestedDatetime ?? (b as Record<string, unknown>)?.createdDatetime ?? '';
    return String(dateB).localeCompare(String(dateA));
  });
}

/**
 * 백엔드는 취소 시 기존 PENDING 건을 수정하지 않고 CANCELED 새 건만 추가함.
 * 같은 "한 번의 사용"(같은 boardId + 같은 requestedDatetime)에 대해 PENDING과 CANCELED가 둘 다 오면
 * popHistoryId 큰 것(취소 건)만 표시 → 사용상태 취소, 사용취소 버튼 숨김.
 * 작성/연장은 requestedDatetime이 달라서 각각 별도 행으로 유지됨.
 */
function deduplicateUsageByLatestState(rows: PopUsageRow[]): PopUsageRow[] {
  const isFeatured = (r: PopUsageRow) =>
    r.popTarget === 'FEATURED_BOARD' || r.popTarget === 'FEATURE_BOARD';

  const keyOf = (r: PopUsageRow): string => {
    if (isFeatured(r)) {
      const id = r.related?.id ?? (r as Record<string, unknown>).boardId ?? (r as Record<string, unknown>).board_id;
      const req = r.requestedDatetime ?? r.createdDatetime ?? '';
      return id != null ? `BOARD_${id}_${req}` : `ID_${r.popHistoryId ?? 0}`;
    }
    const tx = r.transactionId ?? (r as Record<string, unknown>).transactionId;
    return tx != null && tx !== '' ? `TX_${tx}` : `ID_${r.popHistoryId ?? 0}`;
  };

  const byKey = new Map<string, PopUsageRow>();
  for (const row of rows) {
    const key = keyOf(row);
    const existing = byKey.get(key);
    const existingId = existing?.popHistoryId ?? 0;
    const rowId = row.popHistoryId ?? 0;
    if (!existing || rowId > existingId) byKey.set(key, row);
  }

  const list = Array.from(byKey.values());
  return list.sort((a, b) => {
    const dateA = a.requestedDatetime ?? a.createdDatetime ?? '';
    const dateB = b.requestedDatetime ?? b.createdDatetime ?? '';
    const cmp = String(dateB).localeCompare(String(dateA));
    if (cmp !== 0) return cmp;
    return (b.popHistoryId ?? 0) - (a.popHistoryId ?? 0);
  });
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

/** popTarget -> 한글 라벨 (백엔드 FEATURE_BOARD / FEATURED_BOARD 모두 표시) */
const POP_TARGET_MAP: Record<string, string> = {
  CHARGE: '충전',
  DONATION: '후원',
  FEATURE_BOARD: '게시글 홍보',
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

/** changeAmount를 "원" 단위로 표시 (절대값, 천단위 콤마) */
function formatAmountWithWon(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return Math.abs(amount).toLocaleString('ko-KR');
}

/** changeAmount를 POP 단위로 표시 (절대값, 천단위 콤마) */
function formatAmountWithPop(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return `${Math.abs(amount).toLocaleString('ko-KR')} `;
}

/** actualAmount를 원 단위로 표시 (천단위 콤마, null 처리) */
function formatActualAmount(amount?: number | null): string {
  if (amount == null || typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** target이 CHARGE인 경우 "충전" 표시 */
function mapPurchaseTargetToLabel(target?: string): string {
  if (!target) return '-';
  return String(target).toUpperCase() === 'CHARGE' ? '충전' : '-';
}

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 30일 전 날짜를 YYYY-MM-DD 형식으로 반환 */
function getDate30DaysAgo(): string {
  const today = new Date();
  const past = new Date(today);
  past.setDate(today.getDate() - 30);
  const year = past.getFullYear();
  const month = String(past.getMonth() + 1).padStart(2, '0');
  const day = String(past.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** API 에러 응답에서 사용자에게 보여줄 메시지 추출 (Spring message, errorMessage, detail 등) */
function getErrorMessageFromResponse(err: unknown): string | undefined {
  const res = (err as { response?: { data?: Record<string, unknown>; status?: number } })?.response;
  if (!res?.data || typeof res.data !== 'object') return undefined;
  const d = res.data as Record<string, unknown>;
  const msg = d.message ?? d.errorMessage ?? d.error ?? d.detail ?? d.msg;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  if (Array.isArray(msg)) {
    const first = msg[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
  }
  return undefined;
}

const SUB_TAB_FADE_MS = 150;

function PopSection({ user, subTab, onChangeSubTab, onPopBalanceRefresh, onChargeClick, onLoadingChange }: PopSectionProps) {
  const router = useRouter();
  const [inputRange, setInputRange] = useState({ start: getDate30DaysAgo(), end: getTodayDateString() });
  const [usageList, setUsageList] = useState<PopUsageRow[]>([]);
  const [purchaseList, setPurchaseList] = useState<PopPurchaseRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<PopUsageRow | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [purchaseCancelTarget, setPurchaseCancelTarget] = useState<PopPurchaseRow | null>(null);
  const [showPurchaseCancelModal, setShowPurchaseCancelModal] = useState(false);
  const [purchaseCancelSubmitting, setPurchaseCancelSubmitting] = useState(false);

  /* ── 서브탭 전환 페이드 ── */
  const [displayedSubTab, setDisplayedSubTab] = useState(subTab);
  const [subTabVisible, setSubTabVisible] = useState(true);
  const subTabTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (subTab === displayedSubTab) return;
    setSubTabVisible(false);
    if (subTabTimeoutRef.current) clearTimeout(subTabTimeoutRef.current);
    subTabTimeoutRef.current = setTimeout(() => {
      setDisplayedSubTab(subTab);
      requestAnimationFrame(() => setSubTabVisible(true));
    }, SUB_TAB_FADE_MS);
  }, [subTab, displayedSubTab]);

  useEffect(() => {
    return () => { if (subTabTimeoutRef.current) clearTimeout(subTabTimeoutRef.current); };
  }, []);

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
        const rows = parsePopResponse(res.data) as PopUsageRow[];
        const list = Array.isArray(rows) ? rows : [];
        setUsageList(deduplicateUsageByLatestState(list));
      })
      .finally(() => setUsageLoading(false));
  }, []);

  /**
   * 구매내역 필터링 함수
   * - paymentKey가 있고 COMPLETED 또는 CANCELED 상태인 것만 필터링
   * - 같은 orderId 그룹에서 CANCELED가 있으면 COMPLETED는 제외하고 CANCELED만 표시
   */
  const filterPurchaseList = useCallback((rows: PopPurchaseRow[]): PopPurchaseRow[] => {
    // 1단계: 기본 필터링 (paymentKey가 있고 COMPLETED 또는 CANCELED인 것만)
    const basicFiltered = rows.filter(
      (row) =>
        row.paymentKey != null &&
        row.paymentKey !== '' &&
        (row.popStatus === 'COMPLETED' || row.popStatus === 'CANCELED')
    );

    // 2단계: orderId로 그룹화
    const orderIdGroups = new Map<string, PopPurchaseRow[]>();
    basicFiltered.forEach((row) => {
      const orderId = row.orderId || '';
      if (!orderIdGroups.has(orderId)) {
        orderIdGroups.set(orderId, []);
      }
      orderIdGroups.get(orderId)!.push(row);
    });

    // 3단계: 각 그룹에서 CANCELED가 있으면 COMPLETED 제거
    const result: PopPurchaseRow[] = [];
    orderIdGroups.forEach((groupRows) => {
      const hasCanceled = groupRows.some((row) => row.popStatus === 'CANCELED');
      if (hasCanceled) {
        // CANCELED가 있으면 CANCELED만 추가
        result.push(...groupRows.filter((row) => row.popStatus === 'CANCELED'));
      } else {
        // CANCELED가 없으면 COMPLETED만 추가
        result.push(...groupRows.filter((row) => row.popStatus === 'COMPLETED'));
      }
    });

    return result;
  }, []);

  const fetchPurchase = useCallback(() => {
    setPurchaseLoading(true);
    mypageApi
      .getPopPurchaseHistory()
      .then((res) => {
        const rows = parsePopResponse(res.data) as PopPurchaseRow[];
        const list = Array.isArray(rows) ? rows : [];
        // 필터링 함수 적용
        setPurchaseList(filterPurchaseList(list));
      })
      .catch(handleError)
      .finally(() => setPurchaseLoading(false));
  }, [handleError, filterPurchaseList]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    if (subTab === 'purchase') {
      fetchPurchase();
    }
  }, [subTab, fetchPurchase]);

  const popLoading = subTab === 'usage' ? usageLoading : purchaseLoading;
  useEffect(() => {
    onLoadingChange?.(popLoading);
  }, [popLoading, onLoadingChange]);

  // 날짜가 바뀌면 종료일을 오늘로 자동 업데이트
  useEffect(() => {
    const updateEndDate = () => {
      const today = getTodayDateString();
      setInputRange((prev) => ({ ...prev, end: today }));
    };
    updateEndDate();
    // 매일 자정에 업데이트하기 위한 interval (1분마다 확인)
    const interval = setInterval(() => {
      updateEndDate();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelUsageClick = (row: PopUsageRow) => {
    setCancelTarget(row);
    setShowConfirmModal(true);
  };

  const DONATION_CANCEL_REASON = '구매자 변심으로 인한 취소';
  const FEATURED_CANCEL_REASON = '사용자 요청에 의한 취소';

  const handleConfirmCancel = useCallback(async () => {
    const target = cancelTarget;
    if (!target) return;

    const uid = tokenUtils.getUserIdFromAccessToken();
    if (uid === null) {
      ToastUtils.error('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    if (target.popTarget === 'DONATION') {
      const popHistoryId = target.popHistoryId;
      if (popHistoryId == null || typeof popHistoryId !== 'number' || Number.isNaN(popHistoryId)) {
        ToastUtils.error('취소할 내역을 확인할 수 없습니다.');
        return;
      }
    } else {
      // 게시글 홍보(FEATURED_BOARD) 취소: popHistoryId 필수
      const popHistoryId = target.popHistoryId;
      if (popHistoryId == null || typeof popHistoryId !== 'number' || Number.isNaN(popHistoryId)) {
        ToastUtils.error('취소할 내역을 확인할 수 없습니다.');
        return;
      }
    }

    setShowConfirmModal(false);
    setCancelTarget(null);
    setCancelSubmitting(true);

    try {
      if (target.popTarget === 'DONATION') {
        const popHistoryId = target.popHistoryId!;
        await fetchClient.post<unknown>(`/api/users/${uid}/donations/cancel`, {
          popHistoryId,
          changeAmount: Math.abs(target.changeAmount ?? 0),
          message: DONATION_CANCEL_REASON,
        });
        ToastUtils.success('후원이 취소되었습니다.');
      } else {
        // 게시글 홍보 취소
        const isFeatured = (r: PopUsageRow) =>
          r.popTarget === 'FEATURED_BOARD' || r.popTarget === 'FEATURE_BOARD';
        const rawBoardId = target.related?.id ?? (target as Record<string, unknown>).boardId ?? (target as Record<string, unknown>).board_id;
        const boardIdNum = rawBoardId != null ? Number(rawBoardId) : undefined;

        // 같은 boardId의 FEATURED_BOARD PENDING 건 전체 조회
        const sameBoardPending = usageList.filter((r) => {
          if (!isFeatured(r)) return false;
          if (r.popStatus !== 'PENDING') return false;
          const rId = r.related?.id ?? (r as Record<string, unknown>).boardId ?? (r as Record<string, unknown>).board_id;
          return rId != null && Number(rId) === boardIdNum;
        });

        // 가장 오래된 건(popHistoryId 최소)이 작성 건
        const oldestId = sameBoardPending.length > 0
          ? Math.min(...sameBoardPending.map((r) => r.popHistoryId ?? Infinity))
          : undefined;
        const isCreationRow = target.popHistoryId === oldestId;

        if (isCreationRow && sameBoardPending.length > 1) {
          // 작성 건 취소 → 연장 건도 함께 전부 취소 (작성 건이 없으면 연장이 의미 없음)
          let cancelledCount = 0;
          for (const row of sameBoardPending) {
            const phId = row.popHistoryId;
            if (phId == null || typeof phId !== 'number') continue;
            await mypageApi.cancelPopUsage({
              userId: uid,
              boardId: Number.isFinite(boardIdNum) ? boardIdNum : undefined,
              popHistoryId: phId,
              cancelReason: FEATURED_CANCEL_REASON,
            });
            cancelledCount++;
          }
          ToastUtils.success(`작성 건 포함 ${cancelledCount}건이 모두 취소되었습니다.`);
        } else {
          // 연장 건만 취소 (개별)
          await mypageApi.cancelPopUsage({
            userId: uid,
            boardId: Number.isFinite(boardIdNum) ? boardIdNum : undefined,
            popHistoryId: target.popHistoryId!,
            cancelReason: FEATURED_CANCEL_REASON,
          });
          ToastUtils.success('재화 사용 취소가 완료되었습니다.');
        }
      }
      fetchUsage();
      await onPopBalanceRefresh?.();
    } catch (err: unknown) {
      const msg = getErrorMessageFromResponse(err);
      ToastUtils.error(msg || '취소 요청에 실패했습니다.');
    } finally {
      setCancelSubmitting(false);
    }
  }, [cancelTarget, usageList, fetchUsage, onPopBalanceRefresh]);

  const handleCancelPurchaseClick = (row: PopPurchaseRow) => {
    setPurchaseCancelTarget(row);
    setShowPurchaseCancelModal(true);
  };

  const handleConfirmPurchaseCancel = useCallback(async () => {
    // 중복 요청 방지 가드
    if (purchaseCancelSubmitting) return;

    const row = purchaseCancelTarget;
    if (!row) return;
    const paymentKey = row.paymentKey;
    if (!paymentKey || typeof paymentKey !== 'string' || !paymentKey.trim()) {
      ToastUtils.error('paymentKey를 확인할 수 없습니다.');
      setShowPurchaseCancelModal(false);
      setPurchaseCancelTarget(null);
      return;
    }
    setShowPurchaseCancelModal(false);
    setPurchaseCancelTarget(null);
    setPurchaseCancelSubmitting(true);
    try {
      await cancelPayment(paymentKey, '사용자 요청에 의한 취소');
      ToastUtils.success('구매 취소가 완료되었습니다.');

      setPurchaseList((prev) =>
        prev.map((item) =>
          item.paymentKey === paymentKey ? { ...item, canceled: true } : item
        )
      );

      await onPopBalanceRefresh?.();
      // 서버 데이터로 동기화
      fetchPurchase();
    } catch (err: unknown) {
      // AxiosError인 경우 에러 메시지 추출 강화
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errorCode?: string;
          };
        };
      };

      const status = axiosErr?.response?.status;
      const data = axiosErr?.response?.data;

      // 401인 경우 로그인으로 이동
      if (status === 401) {
        ToastUtils.error('로그인이 필요합니다.');
        router.push('/auth/login');
        return;
      }

      // 그 외 실패: data.message → 토스 변환 시도 → 변환 성공 시 tossFriendly, 아니면 rawMessage, 없으면 기본 문구 (errorCode는 노출하지 않음)
      const rawMessage = typeof data?.message === 'string' ? data.message.trim() : '';
      const tossFriendly = toUserFriendlyTossMessage(rawMessage || undefined);
      const displayMessage = tossFriendly ?? (rawMessage || '구매 취소에 실패했습니다.');
      ToastUtils.error(displayMessage);
    } finally {
      setPurchaseCancelSubmitting(false);
    }
  }, [purchaseCancelTarget, purchaseCancelSubmitting, fetchPurchase, onPopBalanceRefresh]);

  /** 날짜 범위로 필터링 */
  const filterUsageByDateRange = useCallback((rows: PopUsageRow[], range: { start: string; end: string }): PopUsageRow[] => {
    if (!range.start || !range.end) return rows;
    return rows.filter((row) => {
      const dateStr = (row.requestedDatetime || row.createdDatetime || '').slice(0, 10);
      if (!dateStr) return false;
      return dateStr >= range.start && dateStr <= range.end;
    });
  }, []);

  const filterPurchaseByDateRange = useCallback((rows: PopPurchaseRow[], range: { start: string; end: string }): PopPurchaseRow[] => {
    if (!range.start || !range.end) return rows;
    return rows.filter((row) => {
      const dateStr = (row.createdDatetime || '').slice(0, 10);
      if (!dateStr) return false;
      return dateStr >= range.start && dateStr <= range.end;
    });
  }, []);

  const filteredUsageList = useMemo(() => {
    return filterUsageByDateRange(usageList, inputRange);
  }, [usageList, inputRange, filterUsageByDateRange]);

  const filteredPurchaseList = useMemo(() => {
    return filterPurchaseByDateRange(purchaseList, inputRange);
  }, [purchaseList, inputRange, filterPurchaseByDateRange]);

  const handleSearch = () => {
    // 날짜 필터링은 useMemo에서 자동으로 적용됨
    // 필요시 여기서 추가 작업 가능
  };

  return (
    <div className={styles.popSection}>
      <div className={styles.settlementRequestSummaryBox}>
        <div className={styles.settlementSummaryRow}>
          <span>보유 POP</span>
          <span className={styles.settlementTotalAmount}>{(user.popBalance ?? 0).toLocaleString('ko-KR')}</span>
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
            onClick={() => onChangeSubTab(t.id)}
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
          max={getTodayDateString()}
          className={styles.settlementDateInput}
          aria-label="시작일"
        />
        <span>~</span>
        <input
          type="date"
          value={inputRange.end}
          onChange={(e) => setInputRange((r) => ({ ...r, end: e.target.value }))}
          max={getTodayDateString()}
          className={styles.settlementDateInput}
          aria-label="종료일"
        />
        <button
          type="button"
          className={styles.settlementSearchBtn}
          disabled={subTab === 'usage' ? usageLoading : purchaseLoading}
          onClick={handleSearch}
        >
          조회
        </button>
      </div>

      <div className={styles.popTableWrap} style={{ opacity: subTabVisible ? 1 : 0, transition: `opacity ${SUB_TAB_FADE_MS}ms ease` }}>
        {displayedSubTab === 'usage' && (
          <div style={{ overflowX: 'auto' }}>
            <div className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableHeader}`}>
              {USAGE_COLUMNS.map((col) => (
                <div key={col}>{col}</div>
              ))}
            </div>
            <div className={styles.fadeWrap}>
              <div className={`${styles.fadeLayer} ${usageLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableRow}`}>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '55%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '55%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                  </div>
                ))}
              </div>
              <div className={`${styles.fadeLayer} ${!usageLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                {filteredUsageList.length === 0 && !usageLoading ? (
                  <div className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.settlementGrid3EmptyRow}`}>
                    <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                      내역이 없습니다.
                    </div>
                  </div>
                ) : (
                  filteredUsageList.map((row, idx) => {
                    const usageDatetime = row.requestedDatetime ?? row.createdDatetime;
                    return (
                      <div
                        key={idx}
                        className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableRow}`}
                      >
                        <div className={styles.tableCell}><PopUsageDateCell dt={usageDatetime} /></div>
                        <div className={styles.tableCell}>{formatAmountWithWon(row.changeAmount)}</div>
                        <div className={styles.tableCell}>{row.related?.name ?? '-'}</div>
                        <div className={styles.tableCell}>{mapPopTargetToLabel(row.popTarget)}</div>
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
                              disabled={cancelSubmitting}
                              onClick={() => handleCancelUsageClick(row)}
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
            </div>
          </div>
        )}
        {displayedSubTab === 'purchase' && (
          <div style={{ overflowX: 'auto' }}>
            <div className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.tableHeader}`}>
              {PURCHASE_COLUMNS.map((col) => (
                <div key={col}>{col}</div>
              ))}
            </div>
            <div className={styles.fadeWrap}>
              <div className={`${styles.fadeLayer} ${purchaseLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.tableRow}`}>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '50%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '55%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                  </div>
                ))}
              </div>
              <div className={`${styles.fadeLayer} ${!purchaseLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                {filteredPurchaseList.length === 0 && !purchaseLoading ? (
                  <div className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.settlementGrid3EmptyRow}`}>
                    <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                      내역이 없습니다.
                    </div>
                  </div>
                ) : (
                  filteredPurchaseList.map((row, idx) => (
                    <div
                      key={idx}
                      className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.tableRow}`}
                    >
                      <div className={styles.tableCell}><PopUsageDateCell dt={row.createdDatetime} /></div>
                      <div className={styles.tableCell}>{formatAmountWithPop(row.changeAmount)}</div>
                      <div className={styles.tableCell}>{mapPurchaseTargetToLabel(row.target)}</div>
                      <div className={styles.tableCell}>{formatActualAmount(row.actualAmount)}</div>
                      <div className={styles.tableCell}>
                        <PopUsageDateCell dt={row.popStatus === 'CANCELED' ? undefined : row.expiredDatetime} />
                      </div>
                      <div className={styles.tableCell}>
                        {row.popStatus === 'CANCELED' ? (
                          <span className={styles.popStatusNeutral}>취소완료</span>
                        ) : row.popStatus === 'COMPLETED' ? (
                          <button
                            type="button"
                            className={styles.donationCancelBtn}
                            onClick={() => handleCancelPurchaseClick(row)}
                          >
                            구매취소
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showConfirmModal && cancelTarget && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pop-cancel-modal-title"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3
              id="pop-cancel-modal-title"
              className={styles.modalTitle}
              style={{ fontSize: '1.1rem', marginBottom: 12 }}
            >
              {cancelTarget.popTarget === 'DONATION' ? '후원 취소 확인' : '게시글 홍보 취소 확인'}
            </h3>
            <p className={styles.donationConfirmMessage} style={{ whiteSpace: 'pre-line' }}>
              {cancelTarget.popTarget === 'DONATION'
                ? '정말 이 사용자에 대한 후원을 취소하시겠습니까?'
                : (() => {
                    const isFt = (r: PopUsageRow) => r.popTarget === 'FEATURED_BOARD' || r.popTarget === 'FEATURE_BOARD';
                    const bid = cancelTarget.related?.id ?? (cancelTarget as Record<string, unknown>).boardId ?? (cancelTarget as Record<string, unknown>).board_id;
                    const bidNum = bid != null ? Number(bid) : NaN;
                    const samePending = usageList.filter((r) => {
                      if (!isFt(r) || r.popStatus !== 'PENDING') return false;
                      const rId = r.related?.id ?? (r as Record<string, unknown>).boardId ?? (r as Record<string, unknown>).board_id;
                      return rId != null && Number(rId) === bidNum;
                    });
                    const oldest = samePending.length > 0 ? Math.min(...samePending.map((r) => r.popHistoryId ?? Infinity)) : undefined;
                    const isCreation = cancelTarget.popHistoryId === oldest;
                    if (isCreation && samePending.length > 1) {
                      return `이 게시글의 작성 재화를 취소하면 연장 ${samePending.length - 1}건도 함께 취소됩니다.\n진행하시겠습니까?`;
                    }
                    return '이 게시글 홍보를 취소하고 재화를 환불받으시겠습니까?';
                  })()}
            </p>
            <div className={styles.settlementConfirmActions}>
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
              <button
                type="button"
                className={styles.settlementConfirmBtn}
                disabled={cancelSubmitting}
                onClick={handleConfirmCancel}
              >
                {cancelSubmitting ? '처리 중…' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurchaseCancelModal && purchaseCancelTarget && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pop-purchase-cancel-modal-title"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3
              id="pop-purchase-cancel-modal-title"
              className={styles.modalTitle}
              style={{ fontSize: '1.1rem', marginBottom: 12 }}
            >
              구매 취소 확인
            </h3>
            <p className={styles.donationConfirmMessage}>
              구매를 취소하시겠습니까?
            </p>
            <div className={styles.settlementConfirmActions}>
              <button
                type="button"
                className={styles.settlementConfirmCancelBtn}
                disabled={purchaseCancelSubmitting}
                onClick={() => {
                  setShowPurchaseCancelModal(false);
                  setPurchaseCancelTarget(null);
                }}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.settlementConfirmBtn}
                disabled={purchaseCancelSubmitting}
                onClick={handleConfirmPurchaseCancel}
              >
                {purchaseCancelSubmitting ? '처리 중…' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PopSection;
