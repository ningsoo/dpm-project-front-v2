'use client';

import styles from '../mypage.module.css';

interface SettlementSectionProps {
  settlementStart: string;
  settlementEnd: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onSearch: () => void;
}

export function SettlementSection({
  settlementStart,
  settlementEnd,
  onChangeStart,
  onChangeEnd,
  onSearch,
}: SettlementSectionProps) {
  return (
    <div>
      <div className={styles.settlementSectionTitleRow}>
        <h2 className={styles.settlementSectionTitle}>정산 내역</h2>
      </div>
      <div className={styles.settlementSummaryBlock}>
        <div className={styles.settlementSummaryRow}>
          <span>총 정산액</span>
          <span className={styles.settlementTotalAmount}>0원</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="date"
          value={settlementStart}
          onChange={(e) => onChangeStart(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
        />
        <span>~</span>
        <input
          type="date"
          value={settlementEnd}
          onChange={(e) => onChangeEnd(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
        />
        <button
          type="button"
          onClick={onSearch}
          style={{
            padding: '8px 16px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          조회
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div>
          <div className={styles.tableGrid + ' ' + styles.settlementGrid + ' ' + styles.tableHeader}>
            <div style={{ textAlign: 'left' }}>정산 일자</div>
            <div style={{ textAlign: 'center' }}>정산 요청일자</div>
            <div style={{ textAlign: 'center' }}>정산금액</div>
            <div style={{ textAlign: 'right', paddingRight: '20px' }}>정산처리상태</div>
          </div>
          <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
            정산 내역이 없습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
