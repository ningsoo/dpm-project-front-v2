'use client';

import { get, str, num, formatDateAndTime } from '../common/helpers';
import { StatusBadge } from '../common/StatusBadge';
import { useCancelRequests } from './useCancelRequests';
import styles from '@/app/adm1n/admin.module.css';

export function CancelRequestsSection() {
  const {
    data,
    loading,
    submitting,
    approveTarget,
    approvedIds,
    processedCache,
    handleApprove,
  } = useCancelRequests();

  const apiIds = new Set(data.map((d) => str(get(d, 'transactionId'))));
  const cachedOnly = Array.from(processedCache.values()).filter(
    (p) => !apiIds.has(str(get(p, 'transactionId')))
  );
  const displayItems = [...data, ...cachedOnly];

  return (
    <>
      <h1 className={styles.sectionTitle}>후원 취소요청</h1>
      <div className={styles.sectionContent}>
        <div className={styles.cancelRequestsTableWrap}>
          <div className={`${styles.tableGrid} ${styles.cancelRequestsGrid}`}>
            <div
              className={`${styles.tableGrid} ${styles.cancelRequestsGrid} ${styles.tableHeader}`}
            >
              <div>No</div>
              <div>요청자</div>
              <div>수혜자</div>
              <div>후원금액</div>
              <div>요청일시</div>
              <div>승인</div>
            </div>
            {!loading &&
              displayItems.map((item, i) => {
                const txId = str(get(item, 'transactionId'));
                const isSubmitting = submitting && approveTarget === txId;
                const isApproved =
                  approvedIds.has(txId) ||
                  ['CANCELLED', 'COMPLETED', 'APPROVED'].includes(
                    String(get(item, 'popStatus')).toUpperCase()
                  );
                return (
                  <div
                    key={i}
                    className={`${styles.tableGrid} ${styles.cancelRequestsGrid} ${styles.tableRow}`}
                  >
                    <div className={styles.tableCell}>{i + 1}</div>
                    <div className={styles.tableCell}>{str(get(item, 'donatorNickname'))}</div>
                    <div className={styles.tableCell}>{str(get(item, 'receiverNickname'))}</div>
                    <div className={styles.tableCell}>
                      {num(get(item, 'donationAmount')).toLocaleString()}원
                    </div>
                    <div className={`${styles.tableCell} ${styles.cellDateTime}`}>
                      {(() => {
                        const { date, time } = formatDateAndTime(
                          get(item, 'cancelRequestDate') as string | null | undefined
                        );
                        return (
                          <>
                            <span>{date}</span>
                            <span>{time}</span>
                          </>
                        );
                      })()}
                    </div>
                    <div className={styles.tableCell}>
                      {isApproved ? (
                        <StatusBadge status="COMPLETED" />
                      ) : (
                        <button
                          className={styles.approveBtn}
                          onClick={() =>
                            handleApprove(txId, item as Record<string, unknown>)
                          }
                          disabled={isSubmitting || !txId || txId === '-'}
                        >
                          {isSubmitting ? '처리중...' : '승인'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        {!loading && data.length === 0 && processedCache.size === 0 && (
          <div className={styles.emptyState}>취소 요청 내역이 없습니다.</div>
        )}
      </div>
    </>
  );
}
