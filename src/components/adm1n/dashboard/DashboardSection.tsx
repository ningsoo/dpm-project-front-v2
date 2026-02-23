'use client';

import { Users, FileText, HelpCircle, Flag } from 'lucide-react';
import { get, str, formatDate } from '../common/helpers';
import { StatusBadge } from '../common/StatusBadge';
import { useDashboard } from './useDashboard';
import styles from '@/app/adm1n/admin.module.css';

export function DashboardSection() {
  const { stats, recentBoards, recentInquiries, loading } = useDashboard();

  const cards = [
    { label: '전체 회원', value: stats.users, icon: <Users size={22} /> },
    { label: '전체 게시글', value: stats.boards, icon: <FileText size={22} /> },
    { label: '문의', value: stats.inquiries, icon: <HelpCircle size={22} /> },
    { label: '신고', value: stats.reports, icon: <Flag size={22} /> },
  ];

  return (
    <>
      <h1 className={styles.sectionTitle}>대시보드</h1>
      <div className={styles.sectionContent}>
        <div className={styles.dashContent}>
          <div className={styles.dashCardsWrap}>
            <div className={styles.statCards}>
              {cards.map((c) => (
                <div key={c.label} className={styles.statCard}>
                  <div className={styles.statIconWrap}>{c.icon}</div>
                  <div className={styles.statInfo}>
                    <p className={styles.statValue}>{c.value.toLocaleString()}</p>
                    <p className={styles.statLabel}>{c.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h3 className={styles.dashSubTitle}>최근 게시글</h3>
          <div className={`${styles.tableGrid} ${styles.boardsGrid}`}>
            <div className={`${styles.tableGrid} ${styles.boardsGrid} ${styles.tableHeader}`}>
              <div>No</div>
              <div>카테고리</div>
              <div>제목</div>
              <div>작성일</div>
              <div>작성자</div>
            </div>
            {recentBoards.map((b, i) => (
              <div key={i} className={`${styles.tableGrid} ${styles.boardsGrid} ${styles.tableRow}`}>
                <div className={styles.tableCell}>{i + 1}</div>
                <div className={styles.tableCell}>{str(get(b, 'category'))}</div>
                <div className={styles.tableCellLeft}>{str(get(b, 'title'))}</div>
                <div className={styles.tableCell}>{formatDate(str(get(b, 'createdAt')))}</div>
                <div className={styles.tableCell}>{str(get(b, 'author') ?? get(b, 'nickname'))}</div>
              </div>
            ))}
          </div>
          {!loading && recentBoards.length === 0 && (
            <div className={styles.emptyState}>게시글이 없습니다.</div>
          )}

          <h3 className={styles.dashSubTitle}>최근 문의</h3>
          <div className={`${styles.tableGrid} ${styles.inquiriesGrid}`}>
            <div className={`${styles.tableGrid} ${styles.inquiriesGrid} ${styles.tableHeader}`}>
              <div>No</div>
              <div>닉네임</div>
              <div>유형</div>
              <div>제목</div>
              <div>상세</div>
              <div>처리 상태</div>
            </div>
            {recentInquiries.map((q, i) => (
              <div key={i} className={`${styles.tableGrid} ${styles.inquiriesGrid} ${styles.tableRow}`}>
                <div className={styles.tableCell}>{i + 1}</div>
                <div className={styles.tableCell}>{str(get(q, 'nickName'))}</div>
                <div className={styles.tableCell}>{str(get(q, 'inquiryType'))}</div>
                <div className={styles.tableCellLeft}>{str(get(q, 'title'))}</div>
                <div className={styles.tableCell}>{str(get(q, 'details') ?? get(q, 'content'))}</div>
                <div className={styles.tableCell}>
                  <StatusBadge status={str(get(q, 'inquiryStatus'))} />
                </div>
              </div>
            ))}
          </div>
          {!loading && recentInquiries.length === 0 && (
            <div className={styles.emptyState}>문의가 없습니다.</div>
          )}
        </div>
      </div>
    </>
  );
}
