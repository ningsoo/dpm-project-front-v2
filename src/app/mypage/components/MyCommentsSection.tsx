'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Search } from 'lucide-react';
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

export function MyCommentsSection() {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [searchQuery, setSearchQuery] = useState('');
  const [comments, setComments] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // TODO: 실제 검색 API 호출
      console.log('Searching comments:', searchQuery);
    }
  };

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16, width: '33.33%' }}>
        <input
          type="text"
          placeholder="검색어 입력"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            width: '100%',
            padding: '8px 40px 8px 12px',
            border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`,
            borderRadius: 8,
            fontSize: 14,
            background: darkMode ? '#242422' : '#fff',
            color: darkMode ? '#B5B3A7' : '#333',
          }}
        />
        <button
          type="button"
          onClick={handleSearch}
          onMouseEnter={(e) => { e.currentTarget.style.color = darkMode ? '#3A3934' : '#111'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            color: '#666',
            transition: 'color 0.2s',
          }}
        >
          <Search size={18} />
        </button>
      </div>
      <div className={styles.popTableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <div className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableHeader}`}>
            <div>날짜</div>
            <div>게시판</div>
            <div>댓글</div>
            <div>원문 글 제목</div>
            <div>추천</div>
          </div>
          {loading ? (
            <div className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.settlementGrid3EmptyRow}`}>
              <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                로딩 중...
              </div>
            </div>
          ) : comments.length === 0 ? (
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
                  {comment.categoryType}
                </div>
                <div className={styles.tableCell}>
                  {comment.content}
                </div>
                <div className={styles.tableCell}>
                  {comment.title}
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
  );
}
