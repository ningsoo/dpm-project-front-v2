'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
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
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
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

  return (
    <div>
      <div className={styles.popTableWrap}>
        <div className={styles.overflowXAuto}>
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
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW35}`} /></div>
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
