'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { get, str, formatDate } from '../common/helpers';
import { Pagination } from '../common/Pagination';
import { useBoards } from './useBoards';
import styles from '@/app/adm1n/admin.module.css';

export function BoardsSection() {
  const {
    data,
    page,
    totalPages,
    categoryFilter,
    setCategoryFilter,
    loading,
    deleteTarget,
    setDeleteTarget,
    submitting,
    load,
    handleDelete,
  } = useBoards();

  return (
    <>
      <h1 className={styles.sectionTitle}>게시글관리</h1>
      <div className={styles.sectionContent}>
        <div className={styles.filterBar}>
          <select
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">전체 카테고리</option>
            <option value="SHOWCASE">Showcase</option>
            <option value="SPOTLIGHT">Spotlight</option>
            <option value="PLAYLIST">Playlist</option>
            <option value="COMMUNITY">Community</option>
            <option value="REVIEW">Review</option>
          </select>
          <button className={styles.filterBtn} onClick={() => load(0, categoryFilter)}>
            검색
          </button>
        </div>

        <div className={`${styles.tableGrid} ${styles.boardsGrid}`}>
          <div className={`${styles.tableGrid} ${styles.boardsGrid} ${styles.tableHeader}`}>
            <div>No</div>
            <div>카테고리</div>
            <div>제목</div>
            <div>작성일</div>
            <div>삭제</div>
          </div>
          {!loading &&
            data.map((b, i) => (
              <div key={i} className={`${styles.tableGrid} ${styles.boardsGrid} ${styles.tableRow}`}>
                <div className={styles.tableCell}>{page * 10 + i + 1}</div>
                <div className={styles.tableCell}>{str(get(b, 'category'))}</div>
                <div className={styles.tableCellLeft}>{str(get(b, 'title'))}</div>
                <div className={styles.tableCell}>{formatDate(str(get(b, 'createdAt')))}</div>
                <div className={styles.tableCell}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeleteTarget(str(get(b, 'boardId') ?? get(b, 'id')))}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
        </div>
        {!loading && data.length === 0 && (
          <div className={styles.emptyState}>게시글이 없습니다.</div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={(p) => load(p, categoryFilter)}
        />
      </div>

      {deleteTarget &&
        createPortal(
          <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeBtn} onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
              <h3 className={styles.modalTitle}>게시글 삭제</h3>
              <p className={styles.subtext}>
                이 게시글을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
