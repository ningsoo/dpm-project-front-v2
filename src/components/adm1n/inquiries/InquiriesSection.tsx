'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { get, str, formatDate } from '../common/helpers';
import { Pagination } from '../common/Pagination';
import { StatusBadge } from '../common/StatusBadge';
import { useInquiries } from './useInquiries';
import styles from '@/app/adm1n/admin.module.css';

export function InquiriesSection() {
  const {
    data,
    page,
    totalPages,
    loading,
    detail,
    setDetail,
    detailLoading,
    setDetailLoading,
    reply,
    setReply,
    submitting,
    load,
    openDetail,
    handleReply,
  } = useInquiries();

  return (
    <>
      <h1 className={styles.sectionTitle}>문의관리</h1>
      <div className={styles.sectionContent}>
        <div className={`${styles.tableGrid} ${styles.inquiriesGrid}`}>
          <div className={`${styles.tableGrid} ${styles.inquiriesGrid} ${styles.tableHeader}`}>
            <div>No</div>
            <div>닉네임</div>
            <div>유형</div>
            <div>제목</div>
            <div>상세</div>
            <div>처리 상태</div>
          </div>
          {!loading &&
            data.map((q, i) => (
              <div
                key={i}
                className={`${styles.tableGrid} ${styles.inquiriesGrid} ${styles.tableRow}`}
              >
                <div className={styles.tableCell}>{page * 20 + i + 1}</div>
                <div className={styles.tableCell}>{str(get(q, 'nickName'))}</div>
                <div className={styles.tableCell}>{str(get(q, 'inquiryType'))}</div>
                <div className={styles.tableCellLeft}>{str(get(q, 'title'))}</div>
                <div className={styles.tableCell}>
                  <button
                    className={styles.inquiriesDetailBtn}
                    onClick={() =>
                      openDetail(
                        str(get(q, 'userInquiryId') ?? get(q, 'inquiryId') ?? get(q, 'id'))
                      )
                    }
                  >
                    상세
                  </button>
                </div>
                <div className={styles.tableCell}>
                  <StatusBadge
                    status={str(
                      get(q, 'commentStatus') ?? get(q, 'inquiryStatus') ?? get(q, 'status')
                    )}
                  />
                </div>
              </div>
            ))}
        </div>
        {!loading && data.length === 0 && (
          <div className={styles.emptyState}>문의가 없습니다.</div>
        )}
        <Pagination page={page} totalPages={totalPages} onPage={load} />
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
              <h3 className={styles.modalTitle}>문의 상세</h3>
              {detailLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className={styles.skeletonBar} style={{ width: '100%', height: 16 }} />
                  <div className={styles.skeletonBar} style={{ width: '80%', height: 16 }} />
                  <div className={styles.skeletonBar} style={{ width: '60%', height: 16 }} />
                </div>
              ) : detail ? (
                <>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>닉네임</span>
                    <span className={styles.detailValue}>{str(get(detail, 'nickName'))}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>유형</span>
                    <span className={styles.detailValue}>{str(detail.inquiryType)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>제목</span>
                    <span className={styles.detailValue}>{str(detail.title)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>내용</span>
                    <span className={styles.detailValue}>{str(detail.content)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>처리 상태</span>
                    <span className={styles.detailValue}>
                      <StatusBadge
                        status={str(
                          detail.commentStatus ?? detail.inquiryStatus ?? detail.status
                        )}
                      />
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>작성일</span>
                    <span className={styles.detailValue}>
                      {formatDate(str(detail.createdAt))}
                    </span>
                  </div>
                  {detail.adminComment && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>답변</span>
                      <span className={styles.detailValue}>{str(detail.adminComment)}</span>
                    </div>
                  )}
                  {!detail.adminComment &&
                    str(detail.commentStatus ?? detail.inquiryStatus ?? detail.status).toUpperCase() !==
                      'COMPLETED' && (
                      <>
                        <div className={styles.modalField} style={{ marginTop: 16 }}>
                          <label className={styles.modalLabel}>답변 작성</label>
                          <textarea
                            className={styles.modalTextarea}
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="답변을 입력하세요."
                          />
                        </div>
                        <div className={styles.modalActions}>
                          <button className={styles.cancelBtn} onClick={() => setDetail(null)}>
                            취소
                          </button>
                          <button
                            className={styles.confirmBtn}
                            disabled={submitting || !reply.trim()}
                            onClick={handleReply}
                          >
                            {submitting ? '처리중...' : '답변 등록'}
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
