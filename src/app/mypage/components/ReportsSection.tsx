'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ReportCancelConfirmModal } from '../ReportCancelConfirmModal';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../mypage.module.css';

export interface ReportsSectionProps {
  dateInputMax: string;
  initialDateRange: { start: string; end: string };
}

export function ReportsSection({ dateInputMax, initialDateRange }: ReportsSectionProps) {
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [showReportCancelModal, setShowReportCancelModal] = useState(false);

  // 신고내역 탭 활성화 시 (마운트 시) 데이터 fetch (API 미연동 – 스켈레톤만 해제)
  useEffect(() => {
    setReportsList([]);
    setReportsLoading(false);
  }, []);

  const handleDateRangeSearch = async () => {
    if (!dateRange.start || !dateRange.end) {
      ToastUtils.error('시작일과 종료일을 모두 선택해 주세요.');
      return;
    }
    if (dateRange.start > dateRange.end) {
      ToastUtils.error('종료일이 시작일보다 빠를 수 없습니다.');
      return;
    }
    // TODO: 신고 API 연동 후 활성화
    setReportsList([]);
    setReportsLoading(false);
  };

  const handleReportCancel = () => {
    if (selectedReports.length === 0) return;
    setShowReportCancelModal(true);
  };

  const handleReportCancelConfirm = () => {
    // TODO: API 호출하여 선택된 신고 취소
    console.log('Cancelling reports:', selectedReports);
    setSelectedReports([]);
    setShowReportCancelModal(false);
  };

  return (
    <div>
      <div className={styles.flexGap8Mb16}>
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
          max={dateInputMax}
          className={styles.dateInput}
        />
        <span className={styles.dateTilde}>~</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
          max={dateInputMax}
          className={styles.dateInput}
        />
        <button type="button" onClick={handleDateRangeSearch} className={styles.modalBtn}>
          조회
        </button>
        {selectedReports.length > 0 && (
          <button type="button" onClick={handleReportCancel} className={styles.modalBtnDanger}>
            신고 취소
          </button>
        )}
      </div>
      <div className={styles.overflowXAuto}>
        <div>
          <div className={styles.tableGrid + ' ' + styles.reportsGrid + ' ' + styles.tableHeader}>
            <div>
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedReports([]);
                  } else {
                    setSelectedReports([]);
                  }
                }}
              />
            </div>
            <div>신고일시</div>
            <div>신고사유</div>
            <div>상태</div>
            <div>글 바로가기</div>
            <div>신고 취소</div>
          </div>
          <div className={styles.fadeWrap}>
            <div className={`${styles.fadeLayer} ${reportsLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.tableGrid + ' ' + styles.reportsGrid + ' ' + styles.tableRow}>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBar16}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                </div>
              ))}
            </div>
            <div className={`${styles.fadeLayer} ${!reportsLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {reportsList.length === 0 && !reportsLoading ? (
                <div className={styles.padding24Center}>
                  신고 내역이 없습니다.
                </div>
              ) : (
                reportsList.map((report, idx) => (
                  <div key={idx} className={styles.tableGrid + ' ' + styles.reportsGrid + ' ' + styles.tableRow}>
                    <div className={styles.tableCell}>
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(report.id || idx)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReports([...selectedReports, report.id || idx]);
                          } else {
                            setSelectedReports(selectedReports.filter((id) => id !== (report.id || idx)));
                          }
                        }}
                      />
                    </div>
                    <div className={styles.tableCell}>{report.createdAt || '-'}</div>
                    <div className={styles.tableCell}>{report.reason || '-'}</div>
                    <div className={styles.tableCell}>{report.status || '-'}</div>
                    <div className={styles.tableCell}>
                      {report.boardId ? (
                        <Link href={`/boards/${report.boardId}`}>바로가기</Link>
                      ) : (
                        '-'
                      )}
                    </div>
                    <div className={styles.tableCell}>-</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ReportCancelConfirmModal
        isOpen={showReportCancelModal}
        onClose={() => setShowReportCancelModal(false)}
        onConfirm={handleReportCancelConfirm}
      />
    </div>
  );
}
