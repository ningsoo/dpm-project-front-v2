'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import styles from '../mypage.module.css';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import {
  sanitizeEmailInput,
  validateEmailForSubmit,
  validateEmailForUX,
  validateNicknameFormatBySignupRule,
  validatePhoneFromDigitsStrict,
} from '@/utils/authValidation';

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

interface SettlementSectionProps {
  user: SettlementUser;
}

export function SettlementSection({ user }: SettlementSectionProps) {
  const [subTab, setSubTab] = useState<'history' | 'register' | 'request'>('history');
  
  const [historyList, setHistoryList] = useState<SettlementHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyRange, setHistoryRange] = useState({ start: '', end: '' });
  
  const [accountForm, setAccountForm] = useState({
    email: '', name: '', phoneNumber: '', accountNumber: '',
  });
  const [registerErrors, setRegisterErrors] = useState<any>({});
  const [emailHangulError, setEmailHangulError] = useState('');
  const [emailFormatError, setEmailFormatError] = useState('');
  const emailDebounceRef = useRef<any>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneErrorUx, setPhoneErrorUx] = useState('');
  const phoneDebounceRef = useRef<any>(null);
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [showRequestConfirm, setShowRequestConfirm] = useState(false);

  const getAvailableAmount = useCallback(() => {
    return historyList.reduce(
      (sum, item) => sum + (item.changeAmount || 0), 0
    );
  }, [historyList]);
  
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

  useEffect(() => {
    if (subTab === 'history' || subTab === 'request') {
      fetchHistory();
    }
  }, [subTab, fetchHistory]);

  const phoneDigits = (accountForm.phoneNumber ?? '').replace(/\D/g, '').slice(0, 11);
  const phoneComplete = phoneDigits.length === 11;
  useEffect(() => {
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    if (phoneComplete) {
      phoneDebounceRef.current = setTimeout(() => {
        const result = validatePhoneFromDigitsStrict(phoneDigits);
        setPhoneErrorUx(result.ok ? '' : result.error);
      }, 600);
    } else {
      setPhoneErrorUx('');
    }
  }, [phoneDigits, phoneComplete]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, hadKorean } = sanitizeEmailInput(e.target.value);
    setAccountForm(prev => ({ ...prev, email: value }));
    setEmailHangulError(hadKorean ? '한글 불가' : '');
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    if (!value) return;
    emailDebounceRef.current = setTimeout(() => {
      const { error } = validateEmailForUX(value);
      setEmailFormatError(error);
    }, 1200);
  };

  const handleRegisterAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountSubmitting(true);
    mypageApi.registerSettlementAccount({
      ...accountForm, 
      name: accountForm.name.trim(),
      accountNumber: accountForm.accountNumber.trim()
    })
      .then((res: any) => {
        if (res.data?.success === false) ToastUtils.error(res.data.message);
        else ToastUtils.success('정산 계좌가 등록되었습니다.');
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
        
        // 서버가 200 OK를 줬지만 success: false인 경우
        if (res.data?.success == true) {
          ToastUtils.error(res.data.message || '정산 신청에 실패했습니다.');
          return;
        }
        
        ToastUtils.success('정산 신청이 완료되었습니다.');
        fetchHistory(); 
      })
      .catch((err: any) => {
         setShowRequestConfirm(false); // 실패해도 모달 닫기
         
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
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
            {subTab === t.id && <span className={styles.settlementSubTabIndicator} />}
          </button>
        ))}
      </div>

      <div className={styles.settlementInnerContent}>
        {/* === 1. 정산 내역 탭 === */}
        {subTab === 'history' && (
          <div>
            <div className={styles.settlementDateRow}>
               <input type="date" value={historyRange.start} onChange={e=>setHistoryRange(r=>({...r, start:e.target.value}))} className={styles.settlementDateInput}/>
               <span>~</span>
               <input type="date" value={historyRange.end} onChange={e=>setHistoryRange(r=>({...r, end:e.target.value}))} className={styles.settlementDateInput}/>
               <button className={styles.settlementSearchBtn} onClick={fetchHistory}>조회</button>
            </div>
            {loading ? <p className={styles.settlementLoading}>로딩 중...</p> : (
              <div style={{ overflowX: 'auto' }}>
                <div className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableHeader}`}>
                  <div style={centerStyle}>정산요청일</div>
                  <div style={centerStyle}>정산승인일</div>
                  <div style={centerStyle}>변동 수량</div>
                  <div style={centerStyle}>정산금액</div>
                  <div style={centerStyle}>정산처리상태</div>
                </div>
                {historyList.length === 0 ? <div className={styles.settlementEmpty}>내역이 없습니다.</div> : 
                  historyList.map((item, idx) => (
                    <div key={idx} className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableRow}`}>
                      <div className={styles.tableCell} style={centerStyle}><SettlementDateCell dt={item.requestedDatetime} /></div>
                      <div className={styles.tableCell} style={centerStyle}><SettlementDateCell dt={item.approvedDatetime} /></div>
                      <div className={styles.tableCell} style={centerStyle}>{formatSettlementAmount(item.changeAmount)}</div>
                      <div className={styles.tableCell} style={centerStyle}>{formatSettlementAmount(item.changeAmount)}</div>
                      <div className={styles.tableCell} style={centerStyle}>{item.statusLabel ?? '정산신청'}</div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* === 2. 정산 정보 등록 탭 === */}
        {subTab === 'register' && (
           <div>
             <form onSubmit={handleRegisterAccount} className={styles.settlementForm}>
                <div className={styles.settlementField}>
                  <label>이메일</label>
                  <input type="email" value={accountForm.email} onChange={handleEmailChange} className={styles.settlementInput} />
                </div>
                <div className={styles.settlementField}>
                  <label>이름</label>
                  <input type="text" value={accountForm.name} onChange={e=>setAccountForm({...accountForm, name:e.target.value})} className={styles.settlementInput} />
                </div>
                <div className={styles.settlementField}>
                  <label>연락처</label>
                  <input type="tel" value={accountForm.phoneNumber} onChange={e=>setAccountForm({...accountForm, phoneNumber:e.target.value})} className={styles.settlementInput} />
                </div>
                <div className={styles.settlementField}>
                  <label>계좌번호</label>
                  <input type="text" value={accountForm.accountNumber} onChange={e=>setAccountForm({...accountForm, accountNumber:e.target.value})} className={styles.settlementInput} placeholder="파민 뱅크 계좌만 가능합니다" />
                </div>
                <button type="submit" className={styles.submitBtn} disabled={accountSubmitting}>등록</button>
             </form>
           </div>
        )}

        {/* === 3. 정산 신청 탭 === */}
        {subTab === 'request' && (
          <div>
            <div className={styles.settlementRequestSummaryBox}>
              <div className={styles.settlementSummaryRow}>
                <span>정산 가능 금액</span>
                {/* 6,000원으로 그대로 나옴 */}
                <span className={styles.settlementTotalAmount}>
                  {getAvailableAmount().toLocaleString()}원
                </span>
              </div>
              {/* 버튼은 항상 활성화 (0원이라도 누를 수 있음) */}
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
              {loading ? <p className={styles.settlementLoading}>로딩 중...</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <div className={`${styles.tableGrid} ${styles.settlementGrid3} ${styles.tableHeader}`}>
                    <div className={styles.settlementGrid3Col1} style={centerStyle}>후원번호</div>
                    <div className={styles.settlementGrid3Col2} style={centerStyle}>후원금액</div>
                    <div className={styles.settlementGrid3Col3} style={centerStyle}>후원승인일</div>
                  </div>
                  {historyList.length === 0 ? (
                    <div className={`${styles.tableGrid} ${styles.settlementGrid3} ${styles.settlementGrid3EmptyRow}`}>
                      <div className={`${styles.settlementEmpty} ${styles.settlementGrid3EmptyCell}`}>
                        내역이 없습니다.
                      </div>
                    </div>
                  ) : (
                    historyList.map((item, idx) => (
                      <div key={idx} className={`${styles.tableGrid} ${styles.settlementGrid3} ${styles.tableRow}`}>
                        <div className={`${styles.tableCell} ${styles.settlementGrid3Col1}`} style={centerStyle}>
                          {item.popHistoryId ?? '-'}
                        </div>
                        <div className={`${styles.tableCell} ${styles.settlementGrid3Col2}`} style={centerStyle}>
                          {formatSettlementAmount(item.changeAmount)}
                        </div>
                        <div className={`${styles.tableCell} ${styles.settlementGrid3Col3}`} style={centerStyle}>
                           <SettlementDateCell dt={item.approvedDatetime} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
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