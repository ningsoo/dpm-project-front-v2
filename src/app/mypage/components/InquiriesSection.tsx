'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../mypage.module.css';

export interface InquiriesSectionProps {
  dateInputMax: string;
  initialDateRange: { start: string; end: string };
}

type InquiryListItem = { createdAt: string; inquiryType: string; title: string; inquiryStatus: string; inquiryId: number };
type InquiryDetail = {
  title: string;
  inquiryType: string;
  createdAt: string;
  content: string;
  fileUrl?: string;
  isImage?: boolean;
  commentStatus: string;
  adminComment?: string;
  commentCreatedAt?: string;
};

export function InquiriesSection({ dateInputMax, initialDateRange }: InquiriesSectionProps) {
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [inquiryPage, setInquiryPage] = useState(0);
  const [inquiryTotalPages, setInquiryTotalPages] = useState(0);
  const [inquiryLoading, setInquiryLoading] = useState(true);
  const [showInquiryDetailModal, setShowInquiryDetailModal] = useState(false);
  const [inquiryDetail, setInquiryDetail] = useState<InquiryDetail | null>(null);
  const [inquiryDetailLoading, setInquiryDetailLoading] = useState(false);

  // 문의내역 탭 활성화 시 데이터 fetch
  useEffect(() => {
    setInquiryLoading(true);
    const params: { page: number; size: number; startDate?: string; endDate?: string } = { page: inquiryPage, size: 10 };
    if (dateRange.start) params.startDate = dateRange.start;
    if (dateRange.end) params.endDate = dateRange.end;
    mypageApi.getInquiries(params)
      .then(({ data }) => {
        const pageData = data?.data as { content?: InquiryListItem[]; totalPages?: number } | undefined;
        setInquiries(pageData?.content ?? []);
        setInquiryTotalPages(pageData?.totalPages ?? 0);
      })
      .catch(() => {
        ToastUtils.error('문의 내역을 불러올 수 없습니다.');
      })
      .finally(() => {
        setInquiryLoading(false);
      });
  }, [inquiryPage]);

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
        <button
          type="button"
          disabled={inquiryLoading || (!!dateRange.start !== !!dateRange.end)}
          onClick={() => {
            const { start, end } = dateRange;
            if ((start && !end) || (!start && end)) {
              ToastUtils.error('시작일과 종료일을 모두 선택해 주세요.');
              return;
            }
            if (start && end && start > end) {
              ToastUtils.error('종료일이 시작일보다 빠를 수 없습니다.');
              return;
            }
            setInquiryPage(0);
            setInquiryLoading(true);
            const params: { page: number; size: number; startDate?: string; endDate?: string } = { page: 0, size: 10 };
            if (start) params.startDate = start;
            if (end) params.endDate = end;
            mypageApi.getInquiries(params)
              .then(({ data }) => {
                const pageData = data?.data as { content?: InquiryListItem[]; totalPages?: number } | undefined;
                setInquiries(pageData?.content ?? []);
                setInquiryTotalPages(pageData?.totalPages ?? 0);
              })
              .catch(() => {
                ToastUtils.error('문의 내역을 불러올 수 없습니다.');
              })
              .finally(() => {
                setInquiryLoading(false);
              });
          }}
          className={(inquiryLoading || (!!dateRange.start !== !!dateRange.end)) ? styles.inquiryFilterBtnDisabled : styles.modalBtn}
        >
          조회
        </button>
      </div>
      <div className={styles.overflowXAuto}>
        <div>
          <div className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableHeader}>
            <div className={styles.tableHeaderCell}>문의일시</div>
            <div className={styles.tableHeaderCell}>문의유형</div>
            <div className={styles.tableHeaderCell}>제목</div>
            <div className={styles.tableHeaderCell}>상태</div>
          </div>
          <div className={styles.fadeWrap}>
            <div className={`${styles.fadeLayer} ${inquiryLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableRow}>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                </div>
              ))}
            </div>
            <div className={`${styles.fadeLayer} ${!inquiryLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {inquiries.length === 0 ? (
                <div className={styles.padding24Center}>
                  문의 내역이 없습니다.
                </div>
              ) : (
                inquiries.map((item) => (
                  <div
                    key={item.inquiryId}
                    className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableRow}
                  >
                    <div className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                      {(() => {
                        if (!item.createdAt) return '-';
                        if (Array.isArray(item.createdAt)) {
                          const [y, mo, d, h = 0, mi = 0] = item.createdAt as unknown as number[];
                          return `${y}.${String(mo).padStart(2, '0')}.${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
                        }
                        const raw = String(item.createdAt);
                        const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
                        if (isNaN(d.getTime())) return raw;
                        const y = d.getFullYear();
                        const mo = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const h = String(d.getHours()).padStart(2, '0');
                        const mi = String(d.getMinutes()).padStart(2, '0');
                        return `${y}.${mo}.${day} ${h}:${mi}`;
                      })()}
                    </div>
                    <div className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                      {(() => {
                        const map: Record<string, string> = {
                          USER: '계정/제재',
                          PAYMENT: '결제/재화',
                          DONATION: '후원',
                          POST: '게시물/작업물',
                          API: '외부 서비스 연동',
                          ETC: '기타',
                        };
                        return map[item.inquiryType] ?? item.inquiryType;
                      })()}
                    </div>
                    <div className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                      <button
                        type="button"
                        className={styles.inquiryTitleLink}
                        onClick={() => {
                          setInquiryDetailLoading(true);
                          setShowInquiryDetailModal(true);
                          setInquiryDetail(null);
                          mypageApi.getInquiryDetail(item.inquiryId)
                            .then(({ data }) => {
                              const detail = data?.data as InquiryDetail | undefined;
                              setInquiryDetail(detail ?? null);
                            })
                            .catch(() => {
                              ToastUtils.error('문의 상세 정보를 불러올 수 없습니다.');
                              setShowInquiryDetailModal(false);
                            })
                            .finally(() => {
                              setInquiryDetailLoading(false);
                            });
                        }}
                      >
                        {item.title}
                      </button>
                    </div>
                    <div className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                      <span
                        className={
                          styles.statusBadge + ' ' +
                          (item.inquiryStatus === 'COMPLETED'
                            ? styles.statusCompleted
                            : item.inquiryStatus === 'PROCESSING'
                              ? styles.statusProcessing
                              : styles.statusPending)
                        }
                      >
                        {(() => {
                          const statusMap: Record<string, string> = {
                            PENDING: '답변 대기',
                            PROCESSING: '처리 중',
                            COMPLETED: '답변 완료',
                          };
                          return statusMap[item.inquiryStatus] ?? item.inquiryStatus;
                        })()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {inquiryTotalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={inquiryPage === 0}
            onClick={() => setInquiryPage((p) => Math.max(0, p - 1))}
          >
            &lt;
          </button>
          {Array.from({ length: inquiryTotalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={
                styles.pageBtn + (i === inquiryPage ? ' ' + styles.pageBtnActive : '')
              }
              onClick={() => setInquiryPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={inquiryPage >= inquiryTotalPages - 1}
            onClick={() => setInquiryPage((p) => Math.min(inquiryTotalPages - 1, p + 1))}
          >
            &gt;
          </button>
        </div>
      )}

      {/* 문의 상세 모달 */}
      {showInquiryDetailModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setShowInquiryDetailModal(false)}
        >
          <div
            className={styles.inquiryDetailCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setShowInquiryDetailModal(false)}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            <h2 className={styles.modalTitle}>문의 상세</h2>

            {inquiryDetailLoading ? (
              <div className={styles.padding24FlexCol}>
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW40H18}`} />
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} />
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW80}`} />
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} />
                <div className={styles.mt12}>
                  <div className={`${styles.skeletonBar} ${styles.skeletonBarW40H18}`} />
                </div>
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW30}`} />
              </div>
            ) : inquiryDetail ? (
              <div className={styles.inquiryDetailBody}>
                <div className={styles.inquiryDetailSection}>
                  <h3 className={styles.inquiryDetailSectionTitle}>문의 정보</h3>
                  <div className={styles.inquiryDetailRow}>
                    <span className={styles.inquiryDetailLabel}>제목</span>
                    <span className={styles.inquiryDetailValue}>{inquiryDetail.title}</span>
                  </div>
                  <div className={styles.inquiryDetailRow}>
                    <span className={styles.inquiryDetailLabel}>유형</span>
                    <span className={styles.inquiryDetailValue}>
                      {({ USER: '계정/제재', PAYMENT: '결제/재화', DONATION: '후원', POST: '게시물/작업물', API: '외부 서비스 연동', ETC: '기타' } as Record<string, string>)[inquiryDetail.inquiryType] ?? inquiryDetail.inquiryType}
                    </span>
                  </div>
                  <div className={styles.inquiryDetailRow}>
                    <span className={styles.inquiryDetailLabel}>작성일시</span>
                    <span className={styles.inquiryDetailValue}>
                      {(() => {
                        if (!inquiryDetail.createdAt) return '-';
                        if (Array.isArray(inquiryDetail.createdAt)) {
                          const [y, mo, d, h = 0, mi = 0] = inquiryDetail.createdAt as unknown as number[];
                          return `${y}.${String(mo).padStart(2, '0')}.${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
                        }
                        const raw = String(inquiryDetail.createdAt);
                        const dt = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
                        if (isNaN(dt.getTime())) return raw;
                        return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                      })()}
                    </span>
                  </div>
                  <div className={`${styles.inquiryDetailRow} ${styles.inquiryDetailAlignStart}`}>
                    <span className={styles.inquiryDetailLabel}>내용</span>
                    <span className={`${styles.inquiryDetailValue} ${styles.preWrap}`}>{inquiryDetail.content}</span>
                  </div>
                  {inquiryDetail.fileUrl && (
                    <div className={`${styles.inquiryDetailRow} ${styles.inquiryDetailAlignStart}`}>
                      <span className={styles.inquiryDetailLabel}>첨부파일</span>
                      <span className={styles.inquiryDetailValue}>
                        {inquiryDetail.isImage ? (
                          <img
                            src={inquiryDetail.fileUrl}
                            alt="첨부 이미지"
                            className={styles.inquiryDetailAttachmentImg}
                          />
                        ) : (
                          <a
                            href={inquiryDetail.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.inquiryDetailAttachmentLink}
                          >
                            첨부파일 열기
                          </a>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.inquiryDetailSection}>
                  <h3 className={styles.inquiryDetailSectionTitle}>관리자 답변</h3>
                  <div className={styles.inquiryDetailRow}>
                    <span className={styles.inquiryDetailLabel}>상태</span>
                    <span className={styles.inquiryDetailValue}>
                      <span
                        className={
                          styles.statusBadge + ' ' +
                          (inquiryDetail.commentStatus === 'COMPLETED'
                            ? styles.statusCompleted
                            : inquiryDetail.commentStatus === 'PROCESSING'
                              ? styles.statusProcessing
                              : styles.statusPending)
                        }
                      >
                        {({ PENDING: '답변 대기', PROCESSING: '처리 중', COMPLETED: '답변 완료' } as Record<string, string>)[inquiryDetail.commentStatus] ?? inquiryDetail.commentStatus}
                      </span>
                    </span>
                  </div>
                  {inquiryDetail.commentStatus === 'COMPLETED' && inquiryDetail.adminComment ? (
                    <>
                      <div className={`${styles.inquiryDetailRow} ${styles.inquiryDetailAlignStart}`}>
                        <span className={styles.inquiryDetailLabel}>답변</span>
                        <span className={`${styles.inquiryDetailValue} ${styles.preWrap}`}>{inquiryDetail.adminComment}</span>
                      </div>
                      {inquiryDetail.commentCreatedAt && (
                        <div className={styles.inquiryDetailRow}>
                          <span className={styles.inquiryDetailLabel}>답변일시</span>
                          <span className={styles.inquiryDetailValue}>
                            {(() => {
                              if (Array.isArray(inquiryDetail.commentCreatedAt)) {
                                const [y, mo, d, h = 0, mi = 0] = inquiryDetail.commentCreatedAt as unknown as number[];
                                return `${y}.${String(mo).padStart(2, '0')}.${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
                              }
                              const raw = String(inquiryDetail.commentCreatedAt);
                              const dt = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
                              if (isNaN(dt.getTime())) return raw;
                              return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                            })()}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.inquiryDetailPending}>
                      답변 준비 중입니다.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.padding24Center}>
                정보를 불러올 수 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
