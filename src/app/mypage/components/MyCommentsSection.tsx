'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../mypage.module.css';

interface MyComment {
  commentId: number;
  createdDateTime: number[]; // [year, month, day, hour, minute, second]
  categoryType: string;
  content: string;
  boardId: number;
  title: string;
  likeCount: number;
}

/** createdDateTime 배열을 yyyy.mm.dd / hh:mm:ss 형식으로 변환 */
function formatCommentDate(dateTimeArray: number[] | undefined): { date: string; time: string } {
  if (!Array.isArray(dateTimeArray) || dateTimeArray.length < 3) {
    return { date: '-', time: '' };
  }
  const [year, month, day, hour = 0, minute = 0, second = 0] = dateTimeArray;
  const date = `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  return { date, time };
}

function CommentDateCell({ dateTimeArray }: { dateTimeArray: number[] | undefined }) {
  const { date, time } = formatCommentDate(dateTimeArray);
  return (
    <div className={styles.donationDateCell}>
      <span>{date}</span>
      {time && <span>{time}</span>}
    </div>
  );
}

/** categoryType을 첫 글자만 대문자, 나머지는 소문자로 변환 */
function formatCategoryType(categoryType: string): string {
  if (!categoryType) return categoryType;
  return categoryType.charAt(0).toUpperCase() + categoryType.slice(1).toLowerCase();
}

const COMMENT_CHARS_PER_LINE = 20;
const COMMENT_MAX_LINES = 2;

/** 댓글 내용: 한 줄 15자, 최대 2줄. 2줄 초과 시 말줄임(...) */
function formatCommentContent(content: string): string {
  if (!content) return '';
  const s = String(content).trim();
  if (s.length <= COMMENT_CHARS_PER_LINE) return s;
  if (s.length <= COMMENT_CHARS_PER_LINE * COMMENT_MAX_LINES) {
    return s.slice(0, COMMENT_CHARS_PER_LINE) + '\n' + s.slice(COMMENT_CHARS_PER_LINE);
  }
  return (
    s.slice(0, COMMENT_CHARS_PER_LINE) +
    '\n' +
    s.slice(COMMENT_CHARS_PER_LINE, COMMENT_CHARS_PER_LINE * COMMENT_MAX_LINES) +
    '...'
  );
}

interface MyCommentsSectionProps {
  onLoadingChange?: (loading: boolean) => void;
}

export function MyCommentsSection({ onLoadingChange }: MyCommentsSectionProps = {}) {
  const router = useRouter();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // 탭 활성화 시 데이터 fetch
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    mypageApi
      .getMyComments()
      .then(({ data }) => {
        const content = (data?.data as { content?: MyComment[] })?.content;
        setComments(Array.isArray(content) ? content : []);
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          ToastUtils.error('로그인이 필요합니다.');
          router.push('/auth/login');
        } else {
          ToastUtils.error('댓글을 불러올 수 없습니다.');
        }
        setComments([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, router]);

  return (
    <div>
      <div className={styles.popTableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <div className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableHeader}`}>
            <div>날짜</div>
            <div>게시판</div>
            <div>댓글</div>
            <div>원문 글 제목</div>
            <div>추천</div>
          </div>
          <div className={styles.fadeWrap}>
            {/* 스켈레톤 레이어 */}
            <div className={`${styles.fadeLayer} ${loading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableRow}`}>
                  <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '85%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '75%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '80%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '45%' }} /></div>
                </div>
              ))}
            </div>
            {/* 실제 콘텐츠 레이어 */}
            <div className={`${styles.fadeLayer} ${!loading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {comments.length === 0 && !loading ? (
                <div className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.settlementGrid3EmptyRow}`}>
                  <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                    댓글이 없습니다.
                  </div>
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.commentId}
                    className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableRow}`}
                  >
                    <div className={styles.tableCell}>
                      <CommentDateCell dateTimeArray={comment.createdDateTime} />
                    </div>
                    <div className={styles.tableCell}>
                      {formatCategoryType(comment.categoryType)}
                    </div>
                    <div className={`${styles.tableCell} ${styles.commentContentCell}`}>
                      <button
                        type="button"
                        className={styles.cellLinkBtn}
                        onClick={() => {
                          sessionStorage.setItem(
                            'soundock_mypage_return',
                            JSON.stringify({ tab: 'comments', scrollY: window.scrollY })
                          );
                          router.push(`/boards/${comment.boardId}#comment-${comment.commentId}`);
                        }}
                      >
                        {formatCommentContent(comment.content)}
                      </button>
                    </div>
                    <div className={styles.tableCell}>
                      <button
                        type="button"
                        className={styles.cellLinkBtn}
                        onClick={() => {
                          sessionStorage.setItem(
                            'soundock_mypage_return',
                            JSON.stringify({ tab: 'comments', scrollY: window.scrollY })
                          );
                          router.push(`/boards/${comment.boardId}`);
                        }}
                      >
                        {comment.title}
                      </button>
                    </div>
                    <div className={styles.tableCell}>
                      {comment.likeCount}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
