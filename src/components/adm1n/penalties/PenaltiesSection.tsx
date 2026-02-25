'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { get, str, formatDate } from '../common/helpers';
import { Pagination } from '../common/Pagination';
import { usePenalties } from './usePenalties';
import styles from '@/app/adm1n/admin.module.css';

export function PenaltiesSection() {
  const {
    data,
    page,
    totalPages,
    loading,
    detail,
    setDetail,
    detailLoading,
    setDetailLoading,
    load,
  } = usePenalties();

  return (
    <>
      <h1 className={styles.sectionTitle}>제재관리</h1>
      <div className={styles.sectionContent}>
        <div className={`${styles.tableGrid} ${styles.penaltiesGrid}`}>
          <div className={`${styles.tableGrid} ${styles.penaltiesGrid} ${styles.tableHeader}`}>
            <div>No</div>
            <div>대상자</div>
            <div>사유</div>
            <div>유형</div>
            <div>종료일</div>
          </div>
          {!loading &&
            data.map((p, i) => (
              <div
                key={i}
                className={`${styles.tableGrid} ${styles.penaltiesGrid} ${styles.tableRow}`}
              >
                <div className={styles.tableCell}>{page * 10 + i + 1}</div>
                <div className={styles.tableCellLeft}>
                  {str(get(p, 'nickname') ?? get(p, 'targetNickname'))}
                </div>
                <div className={styles.tableCellLeft}>{str(get(p, 'reason'))}</div>
                <div className={styles.tableCell}>
                  {str(get(p, 'penaltyType') ?? get(p, 'type'))}
                </div>
                <div className={styles.tableCell}>
                  {formatDate(str(get(p, 'endDate') ?? get(p, 'until')))}
                </div>
              </div>
            ))}
        </div>
        {!loading && data.length === 0 && (
          <div className={styles.emptyState}>제재 내역이 없습니다.</div>
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
              <h3 className={styles.modalTitle}>제재 상세</h3>
              {detailLoading ? (
                <div className={styles.skeletonCol}>
                  <div className={`${styles.skeletonBar} ${styles.skeletonBarH16} ${styles.skeletonBarW100}`} />
                  <div className={`${styles.skeletonBar} ${styles.skeletonBarH16} ${styles.skeletonBarW80}`} />
                </div>
              ) : detail ? (
                <>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>대상자</span>
                    <span className={styles.detailValue}>
                      {str(detail.nickname ?? detail.targetNickname)}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>유형</span>
                    <span className={styles.detailValue}>
                      {str(detail.penaltyType ?? detail.type)}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>사유</span>
                    <span className={styles.detailValue}>{str(detail.reason)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>시작일</span>
                    <span className={styles.detailValue}>
                      {formatDate(str(detail.startDate ?? detail.createdAt))}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>종료일</span>
                    <span className={styles.detailValue}>
                      {formatDate(str(detail.endDate ?? detail.until))}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
