'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Search } from 'lucide-react';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../mypage.module.css';

interface MyPost {
  boardId: number;
  category: {
    categoryId: number;
    categoryType: string;
    sortOrder: number;
    role: string;
    active: boolean;
  };
  title: string;
  createdDateTime: number[]; // [year, month, day, hour, minute, second]
  views: number;
  likes: number;
}

/** createdDateTime 배열을 yyyy.mm.dd / hh:mm:ss 형식으로 변환 */
function formatPostDate(dateTimeArray: number[] | undefined): { date: string; time: string } {
  if (!Array.isArray(dateTimeArray) || dateTimeArray.length < 3) {
    return { date: '-', time: '' };
  }
  const [year, month, day, hour = 0, minute = 0, second = 0] = dateTimeArray;
  const date = `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  return { date, time };
}

function PostDateCell({ dateTimeArray }: { dateTimeArray: number[] | undefined }) {
  const { date, time } = formatPostDate(dateTimeArray);
  return (
    <div className={styles.donationDateCell}>
      <span>{date}</span>
      {time && <span>{time}</span>}
    </div>
  );
}

/** categoryType을 한글 라벨로 변환 */
function mapCategoryTypeToLabel(categoryType: string): string {
  const map: Record<string, string> = {
    SHOWCASE: 'Showcase',
    PLAYLISTS: 'Playlists',
    SPOTLIGHT: 'Spotlight',
    COMMUNITY: 'Community',
    REVIEWS: 'Reviews',
  };
  return map[categoryType] ?? categoryType;
}

interface MyPostsSectionProps {
  onLoadingChange?: (loading: boolean) => void;
}

export function MyPostsSection({ onLoadingChange }: MyPostsSectionProps = {}) {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // 탭 활성화 시 데이터 fetch
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    mypageApi
      .getMyPosts()
      .then(({ data }) => {
        const content = (data?.data as { content?: MyPost[] })?.content;
        setPosts(Array.isArray(content) ? content : []);
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          ToastUtils.error('로그인이 필요합니다.');
          router.push('/auth/login');
        } else {
          ToastUtils.error('게시글을 불러올 수 없습니다.');
        }
        setPosts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, router]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // TODO: 실제 검색 API 호출
      console.log('Searching posts:', searchQuery);
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
          <div className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableHeader}`}>
            <div>날짜</div>
            <div>게시판</div>
            <div>제목</div>
            <div>조회</div>
            <div>추천</div>
          </div>
          <div className={styles.fadeWrap}>
            {/* 스켈레톤 레이어 */}
            <div className={`${styles.fadeLayer} ${loading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableRow}`}>
                  <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '85%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '65%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '80%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '50%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '45%' }} /></div>
                </div>
              ))}
            </div>
            {/* 실제 콘텐츠 레이어 */}
            <div className={`${styles.fadeLayer} ${!loading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {posts.length === 0 && !loading ? (
                <div className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.settlementGrid3EmptyRow}`}>
                  <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                    게시글이 없습니다.
                  </div>
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.boardId}
                    className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableRow}`}
                  >
                    <div className={styles.tableCell}>
                      <PostDateCell dateTimeArray={post.createdDateTime} />
                    </div>
                    <div className={styles.tableCell}>
                      {mapCategoryTypeToLabel(post.category.categoryType)}
                    </div>
                    <div className={styles.tableCell}>
                      {post.title}
                    </div>
                    <div className={styles.tableCell}>
                      {post.views}
                    </div>
                    <div className={styles.tableCell}>
                      {post.likes}
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
