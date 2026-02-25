'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { get, str, formatDate } from '../common/helpers';
import { Pagination } from '../common/Pagination';
import { useComments } from './useComments';
import styles from '@/app/adm1n/admin.module.css';

export function CommentsSection() {
  const {
    data,
    page,
    totalPages,
    loading,
    deleteTarget,
    setDeleteTarget,
    submitting,
    load,
    handleDelete,
  } = useComments();

  return (
    <>
      <h1 className={styles.sectionTitle}>댓글관리</h1>
      <div className={styles.sectionContent}>
        <div className={`${styles.tableGrid} ${styles.commentsGrid}`}>
          <div className={`${styles.tableGrid} ${styles.commentsGrid} ${styles.tableHeader}`}>
            <div>No</div>
            <div>게시글</div>
            <div>댓글 내용</div>
            <div>작성일</div>
            <div>삭제</div>
          </div>
          {!loading &&
            data.map((c, i) => (
              <div
                key={i}
                className={`${styles.tableGrid} ${styles.commentsGrid} ${styles.tableRow}`}
              >
                <div className={styles.tableCell}>{page * 10 + i + 1}</div>
                <div className={styles.tableCellLeft}>
                  {str(get(c, 'boardTitle') ?? get(c, 'boardId'))}
                </div>
                <div className={styles.tableCellLeft}>{str(get(c, 'content'))}</div>
                <div className={styles.tableCell}>{formatDate(str(get(c, 'createdAt')))}</div>
                <div className={styles.tableCell}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeleteTarget(str(get(c, 'commentId') ?? get(c, 'id')))}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
        </div>
        {!loading && data.length === 0 && (
          <div className={styles.emptyState}>댓글이 없습니다.</div>
        )}
        <Pagination page={page} totalPages={totalPages} onPage={load} />
      </div>

      {deleteTarget &&
        createPortal(
          <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeBtn} onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
              <h3 className={styles.modalTitle}>댓글 삭제</h3>
              <p className={styles.subtext}>
                이 댓글을 정말 삭제하시겠습니까?
              </p>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>
                  취소
                </button>
                <button
                  className={styles.confirmBtnDanger}
                  disabled={submitting}
                  onClick={handleDelete}
                >
                  {submitting ? '처리중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
