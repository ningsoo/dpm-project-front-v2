'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { get, str, formatDate } from '../common/helpers';
import { Pagination } from '../common/Pagination';
import { StatusBadge } from '../common/StatusBadge';
import { useReports } from './useReports';
import styles from '@/app/adm1n/admin.module.css';

export function ReportsSection() {
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
    penaltyForm,
    setPenaltyForm,
    submitting,
    load,
    openDetail,
    handlePenalize,
  } = useReports();

  return (
    <>
      <h1 className={styles.sectionTitle}>신고관리</h1>
      <div className={styles.sectionContent}>
        <div className={styles.filterBar}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">전체 상태</option>
            <option value="PENDING">대기</option>
            <option value="PROCESSING">처리중</option>
            <option value="COMPLETED">완료</option>
          </select>
          <button className={styles.filterBtn} onClick={() => load(0, statusFilter)}>
            검색
          </button>
        </div>

        <div className={`${styles.tableGrid} ${styles.reportsGrid}`}>
          <div className={`${styles.tableGrid} ${styles.reportsGrid} ${styles.tableHeader}`}>
            <div>No</div>
            <div>대상자</div>
            <div>신고 내용</div>
            <div>상세</div>
            <div>처리 상태</div>
          </div>
          {!loading &&
            data.map((r, i) => (
              <div
                key={i}
                className={`${styles.tableGrid} ${styles.reportsGrid} ${styles.tableRow}`}
              >
                <div className={styles.tableCell}>{page * 10 + i + 1}</div>
                <div className={styles.tableCell}>
                  {str(get(r, 'reportedNickname') ?? get(r, 'targetNickname'))}
                </div>
                <div className={styles.tableCellLeft}>
                  {str(get(r, 'content') ?? get(r, 'reason'))}
                </div>
                <div className={styles.tableCell}>
                  <button
                    className={styles.detailBtn}
                    onClick={() => openDetail(str(get(r, 'reportId') ?? get(r, 'id')))}
                  >
                    상세
                  </button>
                </div>
                <div className={styles.tableCell}>
                  <StatusBadge status={str(get(r, 'reportStatus') ?? get(r, 'status'))} />
                </div>
              </div>
            ))}
        </div>
        {!loading && data.length === 0 && (
          <div className={styles.emptyState}>신고가 없습니다.</div>
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
              <h3 className={styles.modalTitle}>신고 상세</h3>
              {detailLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className={styles.skeletonBar} style={{ width: '100%', height: 16 }} />
                  <div className={styles.skeletonBar} style={{ width: '80%', height: 16 }} />
                </div>
              ) : detail ? (
                <>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>신고 내용</span>
                    <span className={styles.detailValue}>
                      {str(detail.content ?? detail.reason)}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>대상자</span>
                    <span className={styles.detailValue}>
                      {str(detail.reportedNickname ?? detail.targetNickname)}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>상태</span>
                    <span className={styles.detailValue}>
                      <StatusBadge status={str(detail.reportStatus ?? detail.status)} />
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>작성일</span>
                    <span className={styles.detailValue}>
                      {formatDate(str(detail.createdAt))}
                    </span>
                  </div>

                  {str(detail.reportStatus ?? detail.status).toUpperCase() !== 'COMPLETED' && (
                    <>
                      <h4
                        style={{
                          margin: '20px 0 12px',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                        }}
                      >
                        제재 적용
                      </h4>
                      <div className={styles.modalField}>
                        <label className={styles.modalLabel}>제재 유형</label>
                        <select
                          className={styles.modalSelect}
                          value={penaltyForm.type}
                          onChange={(e) =>
                            setPenaltyForm((f) => ({ ...f, type: e.target.value }))
                          }
                        >
                          <option value="WARNING">경고</option>
                          <option value="SUSPENSION">정지</option>
                          <option value="BAN">차단</option>
                        </select>
                      </div>
                      <div className={styles.modalField}>
                        <label className={styles.modalLabel}>사유</label>
                        <textarea
                          className={styles.modalTextarea}
                          value={penaltyForm.reason}
                          onChange={(e) =>
                            setPenaltyForm((f) => ({ ...f, reason: e.target.value }))
                          }
                          placeholder="제재 사유를 입력하세요..."
                        />
                      </div>
                      {penaltyForm.type === 'SUSPENSION' && (
                        <div className={styles.modalField}>
                          <label className={styles.modalLabel}>종료일</label>
                          <input
                            type="date"
                            className={styles.modalInput}
                            value={penaltyForm.until}
                            onChange={(e) =>
                              setPenaltyForm((f) => ({ ...f, until: e.target.value }))
                            }
                          />
                        </div>
                      )}
                      <div className={styles.modalActions}>
                        <button className={styles.cancelBtn} onClick={() => setDetail(null)}>
                          취소
                        </button>
                        <button
                          className={styles.confirmBtnDanger}
                          disabled={submitting || !penaltyForm.reason.trim()}
                          onClick={handlePenalize}
                        >
                          {submitting ? '처리중...' : '제재 적용'}
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
