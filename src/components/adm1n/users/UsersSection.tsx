'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { get, str } from '../common/helpers';
import { Pagination } from '../common/Pagination';
import { StatusBadge } from '../common/StatusBadge';
import { Adm1nModal } from '../common/Adm1nModal';
import { useUsers } from './useUsers';
import styles from '@/app/adm1n/admin.module.css';

export function UsersSection() {
  const {
    data,
    page,
    totalPages,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    loading,
    modal,
    setModal,
    manageForm,
    setManageForm,
    submitting,
    load,
    handleSearch,
    openManage,
    handleManage,
  } = useUsers();

  return (
    <>
      <h1 className={styles.sectionTitle}>회원관리</h1>
      <div className={styles.sectionContent}>
        <div className={styles.filterBar}>
          <input
            className={styles.searchInput}
            placeholder="이메일 / 닉네임 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">전체 상태</option>
            <option value="ACTIVE">활성</option>
            <option value="SUSPENDED">정지</option>
            <option value="BANNED">차단</option>
          </select>
          <button className={styles.filterBtn} onClick={handleSearch}>
            검색
          </button>
        </div>

        <div className={`${styles.tableGrid} ${styles.usersGrid}`}>
          <div className={`${styles.tableGrid} ${styles.usersGrid} ${styles.tableHeader}`}>
            <div>No</div>
            <div>이메일</div>
            <div>닉네임</div>
            <div>등급</div>
            <div>역할</div>
            <div>상태</div>
            <div>관리</div>
          </div>
          {!loading &&
            data.map((u, i) => (
              <div key={i} className={`${styles.tableGrid} ${styles.usersGrid} ${styles.tableRow}`}>
                <div className={styles.tableCell}>{page * 10 + i + 1}</div>
                <div className={styles.tableCellLeft}>{str(get(u, 'email'))}</div>
                <div className={styles.tableCell}>{str(get(u, 'nickname'))}</div>
                <div className={styles.tableCell}>{str(get(u, 'grade'))}</div>
                <div className={styles.tableCell}>{str(get(u, 'role'))}</div>
                <div className={styles.tableCell}>
                  <StatusBadge status={str(get(u, 'status'))} />
                </div>
                <div className={styles.tableCell}>
                  <button className={styles.manageBtn} onClick={() => openManage(u)}>
                    관리
                  </button>
                </div>
              </div>
            ))}
        </div>
        {!loading && data.length === 0 && (
          <div className={styles.emptyState}>회원이 없습니다.</div>
        )}
        <Pagination page={page} totalPages={totalPages} onPage={(p) => load(p, search, statusFilter)} />
      </div>

      {modal &&
        createPortal(
          <div className={styles.modalOverlay} onClick={() => setModal(null)}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>
                <X size={18} />
              </button>
              <h3 className={styles.modalTitle}>회원 관리</h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>이메일</span>
                <span className={styles.detailValue}>{str(modal.user.email)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>닉네임</span>
                <span className={styles.detailValue}>{str(modal.user.nickname)}</span>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>등급</label>
                <select
                  className={styles.modalSelect}
                  value={manageForm.grade}
                  onChange={(e) => setManageForm((f) => ({ ...f, grade: e.target.value }))}
                >
                  <option value="BRONZE">BRONZE</option>
                  <option value="SILVER">SILVER</option>
                  <option value="GOLD">GOLD</option>
                  <option value="PLATINUM">PLATINUM</option>
                  <option value="DIAMOND">DIAMOND</option>
                </select>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>역할</label>
                <select
                  className={styles.modalSelect}
                  value={manageForm.role}
                  onChange={(e) => setManageForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>상태</label>
                <select
                  className={styles.modalSelect}
                  value={manageForm.status}
                  onChange={(e) => setManageForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="ACTIVE">활성</option>
                  <option value="SUSPENDED">정지</option>
                  <option value="BANNED">차단</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setModal(null)}>
                  취소
                </button>
                <button
                  className={styles.confirmBtn}
                  disabled={submitting}
                  onClick={handleManage}
                >
                  {submitting ? '처리중...' : '저장'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
