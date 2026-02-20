'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import styles from '../mypage.module.css';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';

export interface SettlementUser {
  email: string;
  name?: string;
  phoneNumber: string;
  accountNumber?: string;
  nickname?: string;
}

export type SettlementHistoryItem = {
  popHistoryId?: number;
  requestedDatetime?: string;
  approvedDatetime?: string;
  changeAmount?: number;
  statusLabel?: '정산신청' | '정산완료';
};

/** 정산 가능 내역 개별 항목 */
export type AvailableSettlementRow = {
  transactionId?: number;
  changeAmount?: number;
  approvedDatetime?: string;
  createdDatetime?: string;
};

/** getAvailableSettlements 응답 구조 */
export type AvailableSettlementsData = {
  totalAmount: number;
  totalCount: number;
  popHistoryResponses: AvailableSettlementRow[];
};

/** 날짜 문자열을 날짜/시간으로 분리 */
function formatDateTwoLines(dt?: string): { date: string; time: string } {
  if (!dt || typeof dt !== 'string') return { date: '-', time: '' };
  const s = dt.trim();
  if (s.length < 10) return { date: s, time: '' };
  
  const datePart = s.substring(0, 10).replace(/-/g, '.');
  let timePart = s.substring(10).trim();
  if (timePart.startsWith('T')) {
    timePart = timePart.substring(1).trim();
  }
  return { date: datePart, time: timePart };
}

function SettlementDateCell({ dt }: { dt?: string }) {
  const { date, time } = formatDateTwoLines(dt);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span>{date}</span>
      {time && <span>{time}</span>}
    </div>
  );
}

function mapPopStatusToLabel(popStatus: unknown): '정산신청' | '정산완료' {
  const s = popStatus != null ? String(popStatus).toUpperCase() : '';
  switch (s) {
    case 'SETTLEMENT_COMPLETED':
      return '정산완료';
    case 'SETTLEMENT_REQUEST':
    default:
      return '정산신청';
  }
}

export function parseSettlementHistory(data: unknown): SettlementHistoryItem[] {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        popHistoryId: typeof row.popHistoryId === 'number' ? row.popHistoryId : undefined,
        requestedDatetime: row.requestedDatetime ? String(row.requestedDatetime) : undefined,

        approvedDatetime: row.approvedDatetime ? String(row.approvedDatetime) : undefined,
        changeAmount: typeof row.changeAmount === 'number' ? row.changeAmount : 0,
        statusLabel: mapPopStatusToLabel(row.popStatus),
      };
    });
  }
  return [];
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

const SUB_TAB_FADE_MS = 150;

interface SettlementSectionProps {
  user: SettlementUser;
  subTab: 'history' | 'register' | 'request';
  onChangeSubTab: (next: 'history' | 'register' | 'request') => void;
  onLoadingChange?: (loading: boolean) => void;
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

export function SettlementSection({ user, subTab, onChangeSubTab, onLoadingChange }: SettlementSectionProps) {
  
  const [historyList, setHistoryList] = useState<SettlementHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyRange, setHistoryRange] = useState({ start: getDate30DaysAgo(), end: getTodayDateString() });

  const [accountNumber, setAccountNumber] = useState('');
  const [accountNumberError, setAccountNumberError] = useState('');
  const [isAccountNumberTyping, setIsAccountNumberTyping] = useState(false);
  const accountNumberDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [showRequestConfirm, setShowRequestConfirm] = useState(false);

  const [availableAmount, setAvailableAmount] = useState(0);
  const [availableRows, setAvailableRows] = useState<AvailableSettlementRow[]>([]);
  const [availableLoading, setAvailableLoading] = useState(true);

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

  const fetchHistory = useCallback(() => {
    setLoading(true);
    const params = historyRange.start || historyRange.end
      ? { start: historyRange.start || undefined, end: historyRange.end || undefined }
      : undefined;
      
    mypageApi.getSettlementsHistory(params)
      .then((res) => {
        const body = res.data as any;
        const data = body?.data ?? body;
        setHistoryList(parseSettlementHistory(data));
      })
      .catch(() => setHistoryList([]))
      .finally(() => setLoading(false));
  }, [historyRange.start, historyRange.end]);

  const fetchAvailable = useCallback(() => {
    setAvailableLoading(true);
    mypageApi.getAvailableSettlements()
      .then((res) => {
        const body = res.data as any;
        const data = (body?.data ?? body) as Partial<AvailableSettlementsData> | null;
        setAvailableAmount(typeof data?.totalAmount === 'number' ? data.totalAmount : 0);
        setAvailableRows(Array.isArray(data?.popHistoryResponses) ? data.popHistoryResponses : []);
      })
      .catch(() => {
        setAvailableAmount(0);
        setAvailableRows([]);
        ToastUtils.error('정산 가능 내역을 불러올 수 없습니다.');
      })
      .finally(() => setAvailableLoading(false));
  }, []);

  useEffect(() => {
    if (subTab === 'history') {
      fetchHistory();
    } else if (subTab === 'request') {
      fetchAvailable();
    }
  }, [subTab, fetchHistory, fetchAvailable]);

  const settlementLoading = subTab === 'history' ? loading : subTab === 'request' ? availableLoading : false;
  useEffect(() => {
    onLoadingChange?.(settlementLoading);
  }, [settlementLoading, onLoadingChange]);

  // 날짜가 바뀌면 종료일을 오늘로 자동 업데이트
  useEffect(() => {
    const updateEndDate = () => {
      const today = getTodayDateString();
      setHistoryRange((prev) => ({ ...prev, end: today }));
    };
    updateEndDate();
    // 매일 자정에 업데이트하기 위한 interval (1분마다 확인)
    const interval = setInterval(() => {
      updateEndDate();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const validateAccountNumber = (value: string): string => {
    if (!value) return '';
    if (!/^\d+$/.test(value)) return '계좌 번호는 502로 시작하며 1로 끝나는 11자리 숫자여야 합니다.';
    if (value.length !== 11) return '계좌 번호는 502로 시작하며 1로 끝나는 11자리 숫자여야 합니다.';
    if (!value.startsWith('502')) return '계좌 번호는 502로 시작하며 1로 끝나는 11자리 숫자여야 합니다.';
    if (!value.endsWith('1')) return '계좌 번호는 502로 시작하며 1로 끝나는 11자리 숫자여야 합니다.';
    return '';
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const value = raw.replace(/\D/g, '').slice(0, 11);
    setAccountNumber(value);
    setIsAccountNumberTyping(true);
    setAccountNumberError('');
    
    if (accountNumberDebounceRef.current) {
      clearTimeout(accountNumberDebounceRef.current);
    }
    
    accountNumberDebounceRef.current = setTimeout(() => {
      setIsAccountNumberTyping(false);
      const error = validateAccountNumber(value);
      setAccountNumberError(error);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (accountNumberDebounceRef.current) {
        clearTimeout(accountNumberDebounceRef.current);
      }
    };
  }, []);

  const handleRegisterAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = accountNumber.trim();
    const error = validateAccountNumber(trimmed);
    if (error) {
      setAccountNumberError(error);
      return;
    }
    setAccountSubmitting(true);
    mypageApi.registerSettlementAccount({
      email: user.email,
      name: user.name ?? '',
      phoneNumber: user.phoneNumber,
      accountNumber: trimmed,
    })
      .then((res: any) => {
        if (res.data?.success === false) {
          ToastUtils.error(res.data.message);
        } else {
          ToastUtils.success('정산 계좌가 등록되었습니다.');
          onChangeSubTab('request');
        }
      })
      .catch(() => ToastUtils.error('등록 실패'))
      .finally(() => setAccountSubmitting(false));
  };

  const handleRequestConfirmCancel = () => {
    setShowRequestConfirm(false);
  };

  const handleRequestConfirmOk = () => {
    setRequestSubmitting(true);
    
    mypageApi.requestSettlement()
      .then((res: any) => {
        setShowRequestConfirm(false);
        
        if (res.data?.success === false) {
          ToastUtils.error(res.data?.message || '정산 신청에 실패했습니다.');
          return;
        }
        
        ToastUtils.success('정산 신청이 완료되었습니다.');
        onChangeSubTab('history');
      })
      .catch((err: any) => {
         setShowRequestConfirm(false);
         const msg = err.response?.data?.message || '정산 가능한 금액이 없거나 이미 신청되었습니다.';
         ToastUtils.error(msg);
      })
      .finally(() => setRequestSubmitting(false));
  };

  const centerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
    height: '100%', // 높이 꽉 채우기
    minHeight: '40px', // 최소 높이 보장
  };

  return (
    <div className={styles.settlementSection}>
      <div className={styles.settlementSubTabs}>
        {SETTLEMENT_SUB_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={subTab === t.id}
            className={subTab === t.id ? styles.settlementSubTabActive : styles.settlementSubTab}
            onClick={() => onChangeSubTab(t.id)}
          >
            {t.label}
            {subTab === t.id && <span className={styles.settlementSubTabIndicator} />}
          </button>
        ))}
      </div>

      <div className={styles.settlementInnerContent} style={{ opacity: subTabVisible ? 1 : 0, transition: `opacity ${SUB_TAB_FADE_MS}ms ease` }}>
        {/* === 1. 정산 내역 탭 === */}
        {displayedSubTab === 'history' && (
          <div>
            <div className={styles.settlementDateRow}>
               <input type="date" value={historyRange.start} onChange={e=>setHistoryRange(r=>({...r, start:e.target.value}))} max={getTodayDateString()} className={styles.settlementDateInput}/>
               <span>~</span>
               <input type="date" value={historyRange.end} onChange={e=>setHistoryRange(r=>({...r, end:e.target.value}))} max={getTodayDateString()} className={styles.settlementDateInput}/>
               <button className={styles.settlementSearchBtn} onClick={fetchHistory}>조회</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableHeader}`}>
                <div>정산요청일</div>
                <div>정산승인일</div>
                <div>변동 수량</div>
                <div>정산금액</div>
                <div>정산처리상태</div>
              </div>
              <div className={styles.fadeWrap}>
                <div className={`${styles.fadeLayer} ${loading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableRow}`}>
                      <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '85%' }} /><div className={styles.skeletonBar} style={{ width: '65%' }} /></div></div>
                      <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '85%' }} /><div className={styles.skeletonBar} style={{ width: '65%' }} /></div></div>
                      <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '65%' }} /></div>
                      <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '65%' }} /></div>
                      <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                    </div>
                  ))}
                </div>
                <div className={`${styles.fadeLayer} ${!loading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                  {historyList.length === 0 && !loading ? <div className={styles.settlementEmpty}>내역이 없습니다.</div> :
                    historyList.map((item, idx) => (
                      <div key={idx} className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableRow}`}>
                        <div className={styles.tableCell}><SettlementDateCell dt={item.requestedDatetime} /></div>
                        <div className={styles.tableCell}><SettlementDateCell dt={item.approvedDatetime} /></div>
                        <div className={styles.tableCell}>{formatSettlementAmount(item.changeAmount)}</div>
                        <div className={styles.tableCell}>{formatSettlementAmount(item.changeAmount)}</div>
                        <div className={styles.tableCell}>{item.statusLabel ?? '정산신청'}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === 2. 정산 정보 등록 탭 === */}
        {displayedSubTab === 'register' && (
           <div>
             <form onSubmit={handleRegisterAccount} className={styles.settlementForm}>
                <div className={styles.settlementField}>
                  <label>이메일</label>
                  <input type="email" value={user.email} readOnly className={styles.settlementInput} />
                </div>
                <div className={styles.settlementField}>
                  <label>이름</label>
                  <input type="text" value={user.name ?? ''} readOnly className={styles.settlementInput} />
                </div>
                <div className={styles.settlementField}>
                  <label>연락처</label>
                  <input type="tel" value={user.phoneNumber} readOnly className={styles.settlementInput} />
                </div>
                <div className={styles.settlementField}>
                  <label>계좌번호</label>
                  <input type="text" value={accountNumber} onChange={handleAccountNumberChange} className={styles.settlementInput} placeholder="파민 뱅크 계좌만 가능합니다" />
                  <span className={styles.error} style={{ display: 'block', marginTop: 4, fontSize: '0.875rem', color: '#d32f2f', minHeight: '20px' }}>
                    {!isAccountNumberTyping && accountNumberError ? accountNumberError : ''}
                  </span>
                </div>
                <button 
                  type="submit" 
                  className={styles.submitBtn} 
                  disabled={
                    accountSubmitting || 
                    isAccountNumberTyping || 
                    !!accountNumberError || 
                    accountNumber.trim().length === 0
                  }
                >
                  등록
                </button>
             </form>
           </div>
        )}

        {/* === 3. 정산 신청 탭 === */}
        {displayedSubTab === 'request' && (
          <div>
            <div className={styles.settlementRequestSummaryBox}>
              <div className={styles.settlementSummaryRow}>
                <span>정산 가능 금액</span>
                <span className={styles.settlementTotalAmount}>
                  {availableAmount.toLocaleString()}원
                </span>
              </div>
              <button
                type="button"
                className={styles.submitBtn}
                disabled={requestSubmitting}
                onClick={() => setShowRequestConfirm(true)}
              >
                {requestSubmitting ? '신청 중…' : '정산요청'}
              </button>
            </div>

            <div className={styles.settlementRequestTableWrap}>
              <div style={{ overflowX: 'auto' }}>
                <div className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableHeader}`}>
                  <div style={centerStyle}>후원금액</div>
                  <div style={centerStyle}>후원승인일</div>
                </div>
                <div className={styles.fadeWrap}>
                  <div className={`${styles.fadeLayer} ${availableLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableRow}`}>
                        <div className={styles.tableCell} style={centerStyle}><div className={styles.skeletonBar} style={{ width: '40%' }} /></div>
                        <div className={styles.tableCell} style={centerStyle}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '50%' }} /><div className={styles.skeletonBar} style={{ width: '40%' }} /></div></div>
                      </div>
                    ))}
                  </div>
                  <div className={`${styles.fadeLayer} ${!availableLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                    {availableRows.length === 0 && !availableLoading ? (
                      <div className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableRow}`}>
                        <div className={styles.tableCell} style={{ ...centerStyle, gridColumn: '1 / -1' }}>
                          내역이 없습니다.
                        </div>
                      </div>
                    ) : (
                      availableRows.map((row, idx) => (
                        <div key={row.transactionId ?? idx} className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableRow}`}>
                          <div className={styles.tableCell} style={centerStyle}>
                            {formatSettlementAmount(typeof row.changeAmount === 'number' ? Math.abs(row.changeAmount) : undefined)}
                          </div>
                          <div className={styles.tableCell} style={centerStyle}>
                            <SettlementDateCell dt={row.approvedDatetime ?? row.createdDatetime} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showRequestConfirm && (
        <div className={styles.modalOverlay} onClick={handleRequestConfirmCancel}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>정산을 요청하시겠습니까?</h3>
            <div className={styles.settlementConfirmActions}>
              <button className={styles.settlementConfirmBtn} onClick={handleRequestConfirmOk} disabled={requestSubmitting}>확인</button>
              <button className={styles.settlementConfirmCancelBtn} onClick={handleRequestConfirmCancel} disabled={requestSubmitting}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}