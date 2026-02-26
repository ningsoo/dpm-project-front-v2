'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { get, str, num, formatDate } from '../common/helpers';
import { Pagination } from '../common/Pagination';
import { StatusBadge } from '../common/StatusBadge';
import { useSettlements } from './useSettlements';
import styles from '@/app/adm1n/admin.module.css';

export function SettlementsSection() {
  const {
    data,
    page,
    totalPages,
    statusFilter,
    setStatusFilter,
    loading,
    detail,
    setDetail,
    detailLoading,
    setDetailLoading,
    memo,
    setMemo,
    submitting,
    load,
    openDetail,
    handleApprove,
    handleApproveGroup,
    handleRejectGroup,
    approvingGroupKey,
    rejectingGroupKey,
  } = useSettlements();

  /** 같은 userId + requestedDatetime = 한 번의 정산 신청 → 그룹화 */
  const groupedRows = (() => {
    const list = Array.isArray(data) ? data : [];
    const keyOf = (s: unknown) => {
      const uid = get(s, 'userId');
      const req = get(s, 'requestedDatetime');
      return `${uid ?? ''}_${str(req ?? '')}`;
    };
    const byKey = new Map<string, { rows: unknown[] }>();
    for (const s of list) {
      const key = keyOf(s);
      if (!byKey.has(key)) byKey.set(key, { rows: [] });
      byKey.get(key)!.rows.push(s);
    }
    return Array.from(byKey.entries()).map(([groupKey, { rows }]) => {
      const first = rows[0] as Record<string, unknown>;
      const nickName = str(first?.nickName ?? first?.nickname);
      const totalAmount = rows.reduce<number>(
        (sum, r) => sum + num(get(r, 'changeAmount') ?? get(r, 'amount')),
        0
      );
      const requestedDt = str(get(first, 'requestedDatetime'));
      const approvedDt = rows.map((r) => str(get(r, 'approvedDatetime') ?? get(r, 'approvedAt'))).find((d) => d && d !== '-') ?? '-';
      const popHistoryIds = rows.map((r) => num(get(r, 'popHistoryId'))).filter((id) => Number.isInteger(id));
      const statuses = rows.map((r) => str(get(r, 'popStatus')).toUpperCase());
      const isRequest = statuses.some((st) => st === 'SETTLEMENT_REQUEST');
      const isCompleted = statuses.every((st) => st === 'SETTLEMENT_COMPLETED');
      return {
        groupKey,
        nickName,
        totalAmount,
        requestedDatetime: requestedDt,
        approvedDatetime: approvedDt,
        popHistoryIds,
        isRequest,
        isCompleted,
      };
    });
  })();

  return (
    <>
      <h1 className={styles.sectionTitle}>정산관리</h1>
      <div className={styles.sectionContent}>
        <div className={styles.filterBar}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">전체 상태</option>
            <option value="PENDING">대기</option>
            <option value="APPROVED">승인</option>
            <option value="REJECTED">거절</option>
          </select>
          <button className={styles.filterBtn} onClick={() => load(0, statusFilter)}>
            검색
          </button>
        </div>

        <div className={`${styles.tableGrid} ${styles.settlementsGrid}`}>
          <div
            className={`${styles.tableGrid} ${styles.settlementsGrid} ${styles.tableHeader}`}
          >
            <div>No</div>
            <div>사용자</div>
            <div>금액</div>
            <div>신청일</div>
            <div>처리 상태</div>
            <div>승인 / 완료</div>
          </div>
          {!loading &&
            groupedRows.map((group, i) => {
              const isApproving = approvingGroupKey === group.groupKey;
              const isRejecting = rejectingGroupKey === group.groupKey;
              const canApprove = group.isRequest && group.popHistoryIds.length > 0;
              return (
                <div
                  key={group.groupKey}
                  className={`${styles.tableGrid} ${styles.settlementsGrid} ${styles.tableRow}`}
                >
                  <div className={styles.tableCell}>{i + 1}</div>
                  <div className={styles.tableCell}>{group.nickName}</div>
                  <div className={styles.tableCell}>
                    {group.totalAmount.toLocaleString()}원
                  </div>
                  <div className={styles.tableCell}>
                    {group.isCompleted
                      ? formatDate(group.approvedDatetime)
                      : formatDate(group.requestedDatetime)}
                  </div>
                  <div className={styles.tableCell}>
                    {group.isCompleted ? (
                      <StatusBadge status="COMPLETED" />
                    ) : (
                      <StatusBadge status="SETTLEMENT_REQUEST" />
                    )}
                  </div>
                  <div className={styles.tableCell}>
                    {canApprove && (
                      <>
                        <button
                          type="button"
                          className={styles.approveBtn}
                          disabled={isApproving || isRejecting}
                          onClick={() =>
                            handleApproveGroup(group.groupKey, group.popHistoryIds)
                          }
                        >
                          {isApproving ? '처리중...' : '승인'}
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          disabled={isApproving || isRejecting}
                          onClick={() =>
                            handleRejectGroup(group.groupKey, group.popHistoryIds)
                          }
                          style={{ marginLeft: 8 }}
                        >
                          {isRejecting ? '처리중...' : '거절'}
                        </button>
                      </>
                    )}
                    {group.isCompleted && <StatusBadge status="COMPLETED" />}
                  </div>
                </div>
              );
            })}
        </div>
        {!loading && groupedRows.length === 0 && (
          <div className={styles.emptyState}>정산 내역이 없습니다.</div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={(p) => load(p, statusFilter)}
        />
      </div>

      {(detail || detailLoading) &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={() => {
              setDetail(null);
              setDetailLoading(false);
            }}
          >
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setDetail(null);
                  setDetailLoading(false);
                }}
              >
                <X size={18} />
              </button>
              <h3 className={styles.modalTitle}>정산 상세</h3>
              {detailLoading ? (
                <div className={styles.skeletonCol}>
                  <div className={`${styles.skeletonBar} ${styles.skeletonBarH16} ${styles.skeletonBarW100}`} />
                  <div className={`${styles.skeletonBar} ${styles.skeletonBarH16} ${styles.skeletonBarW80}`} />
                </div>
              ) : detail ? (
                <>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>게시글</span>
                    <span className={styles.detailValue}>
                      {str(detail.boardTitle ?? detail.title)}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>작성자</span>
                    <span className={styles.detailValue}>
                      {str(detail.nickname ?? detail.authorNickname)}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>금액</span>
                    <span className={styles.detailValue}>
                      {num(detail.amount).toLocaleString()}원
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>상태</span>
                    <span className={styles.detailValue}>
                      <StatusBadge
                        status={str(detail.settlementStatus ?? detail.status)}
                      />
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>요청일</span>
                    <span className={styles.detailValue}>
                      {formatDate(str(detail.requestedAt ?? detail.createdAt))}
                    </span>
                  </div>

                  {str(detail.settlementStatus ?? detail.status).toUpperCase() ===
                    'PENDING' && (
                    <>
                      <div className={`${styles.modalField} ${styles.modalFieldMt16}`}>
                        <label className={styles.modalLabel}>메모 (선택)</label>
                        <textarea
                          className={styles.modalTextarea}
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          placeholder="승인 메모를 입력하세요..."
                        />
                      </div>
                      <div className={styles.modalActions}>
                        <button className={styles.cancelBtn} onClick={() => setDetail(null)}>
                          취소
                        </button>
                        <button
                          className={styles.confirmBtnApprove}
                          disabled={submitting}
                          onClick={handleApprove}
                        >
                          {submitting ? '처리중...' : '승인'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
