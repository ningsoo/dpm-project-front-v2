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
  } = useSettlements();

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
            <div>승인날짜</div>
            <div>처리 상태</div>
          </div>
          {!loading &&
            data.map((s, i) => (
              <div
                key={i}
                className={`${styles.tableGrid} ${styles.settlementsGrid} ${styles.tableRow}`}
                role="button"
                tabIndex={0}
                aria-label={`정산 상세 보기: ${str(get(s, 'boardTitle') ?? get(s, 'title'))}`}
                onClick={() => openDetail(str(get(s, 'boardId') ?? get(s, 'id')))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetail(str(get(s, 'boardId') ?? get(s, 'id')));
                  }
                }}
                className={styles.cursorPointer}
              >
                <div className={styles.tableCell}>{page * 10 + i + 1}</div>
                <div className={styles.tableCell}>
                  {str(
                    get(s, 'nickname') ??
                      get(s, 'authorNickname') ??
                      get(s, 'boardTitle') ??
                      get(s, 'title')
                  )}
                </div>
                <div className={styles.tableCell}>
                  {num(get(s, 'amount')).toLocaleString()}원
                </div>
                <div className={styles.tableCell}>
                  {formatDate(
                    str(
                      get(s, 'approvedAt') ??
                        get(s, 'settlementApprovedAt') ??
                        get(s, 'updatedAt')
                    )
                  )}
                </div>
                <div className={styles.tableCell}>
                  <StatusBadge
                    status={str(get(s, 'settlementStatus') ?? get(s, 'status'))}
                  />
                </div>
              </div>
            ))}
        </div>
        {!loading && data.length === 0 && (
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
