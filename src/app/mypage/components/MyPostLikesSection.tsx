'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Search } from 'lucide-react';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from '../mypage.module.css';

interface LikedPost {
  postLikeId: number;
  categoryType: string;
  boardId: number;
  title: string;
  nickname: string;
  views: number;
  likes: number;
}

/** categoryType: 첫 글자만 대문자, 나머지 소문자 */
function formatCategoryType(categoryType: string): string {
  if (!categoryType) return categoryType;
  return categoryType.charAt(0).toUpperCase() + categoryType.slice(1).toLowerCase();
}

interface MyPostLikesSectionProps {
  onLoadingChange?: (loading: boolean) => void;
}

export function MyPostLikesSection({ onLoadingChange }: MyPostLikesSectionProps = {}) {
  const router = useRouter();
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<LikedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    mypageApi
      .getMyPostLikes()
      .then(({ data }) => {
        const content = (data?.data as { content?: LikedPost[] })?.content;
        setItems(Array.isArray(content) ? content : []);
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          ToastUtils.error('로그인이 필요합니다.');
          router.push('/auth/login');
        } else {
          ToastUtils.error('좋아요 한 게시글을 불러올 수 없습니다.');
        }
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // TODO: 실제 검색 API 호출
      console.log('Searching liked:', searchQuery);
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
          <div className={`${styles.tableGrid} ${styles.likedGrid5} ${styles.tableHeader}`}>
            <div>게시판</div>
            <div>제목</div>
            <div>작성자</div>
            <div>조회</div>
            <div>추천</div>
          </div>
          <div className={styles.fadeWrap}>
            {/* 스켈레톤 레이어 */}
            <div className={`${styles.fadeLayer} ${loading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${styles.tableGrid} ${styles.likedGrid5} ${styles.tableRow}`}>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '70%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '85%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '50%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '40%' }} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '35%' }} /></div>
                </div>
              ))}
            </div>
            {/* 실제 콘텐츠 레이어 */}
            <div className={`${styles.fadeLayer} ${!loading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
              {items.length === 0 && !loading ? (
                <div className={`${styles.tableGrid} ${styles.likedGrid5} ${styles.settlementGrid3EmptyRow}`}>
                  <div className={`${styles.settlementEmpty} ${styles.popGridEmptyCell}`}>
                    좋아요 한 게시글이 없습니다.
                  </div>
                </div>
              ) : (
                items.map((row) => (
                  <div
                    key={row.postLikeId}
                    className={`${styles.tableGrid} ${styles.likedGrid5} ${styles.tableRow}`}
                  >
                    <div className={styles.tableCell}>{formatCategoryType(row.categoryType)}</div>
                    <div className={styles.tableCell}>
                      <button
                        type="button"
                        className={styles.cellLinkBtn}
                        onClick={() => {
                          sessionStorage.setItem(
                            'soundock_mypage_return',
                            JSON.stringify({ tab: 'liked', scrollY: window.scrollY })
                          );
                          router.push(`/boards/${row.boardId}`);
                        }}
                      >
                        {row.title}
                      </button>
                    </div>
                    <div className={styles.tableCell}>{row.nickname}</div>
                    <div className={styles.tableCell}>{row.views}</div>
                    <div className={styles.tableCell}>{row.likes}</div>
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
