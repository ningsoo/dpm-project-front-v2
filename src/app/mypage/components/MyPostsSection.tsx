'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
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
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
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

  return (
    <div>
      <div className={styles.popTableWrap}>
        <div className={styles.overflowXAuto}>
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
                  <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW45}`} /></div>
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
                      <button
                        type="button"
                        className={styles.cellLinkBtn}
                        onClick={() => {
                          sessionStorage.setItem(
                            'soundock_mypage_return',
                            JSON.stringify({ tab: 'posts', scrollY: window.scrollY })
                          );
                          router.push(`/boards/${post.boardId}`);
                        }}
                      >
                        {post.title}
                      </button>
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
