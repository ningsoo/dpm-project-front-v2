'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, Eye, MoreVertical } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { formatCreatedDateTimeFull } from '@/utils/createdDateTime';
import { formatViews } from '@/utils/displayFormatters';
import type { BoardDetail } from '@/api/boardApi';
import CommentSection from './CommentSection';
import styles from './PostDetail.module.css';

interface Post extends BoardDetail {
  id?: string;
  category?: string;
  playlistThumbnail?: string;
  playlistUrl?: string;
  photos?: string[];
  files?: { url: string; name: string }[];
}

/** 유튜브 ID 추출 */
function extractYoutubeId(url?: string): string {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? m[1] : '';
}

function getCategoryDisplayName(category?: string): string {
  if (!category) return 'CATEGORY';

  const map: Record<string, string> = {
    showcase: 'Showcase',
    playlists: 'Playlists',
    spotlight: 'Spotlight',
    community: 'Community',
    reviews: 'Reviews',
    SHOWCASE: 'Showcase',
    PLAYLISTS: 'Playlists',
    SPOTLIGHT: 'Spotlight',
    COMMUNITY: 'Community',
    REVIEWS: 'Reviews',
  };

  return map[category] || category;
}

interface PostDetailProps {
  category: string;   // URL 기준 (fallback용)
  boardId: string;
}

export default function PostDetail({ category, boardId }: PostDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const currentUserId =
    typeof window !== 'undefined' ? tokenUtils.getUserIdFromToken() : null;

  // ===== 게시글 조회 =====
  useEffect(() => {
    if (!boardId) return;

    setLoading(true);

    boardApi
      .getPost(boardId)
      .then(({ data }) => {
        const postData = data?.data as BoardDetail | undefined;
        if (postData) setPost({ ...postData });
      })
      .catch((err: { response?: { status?: number } }) => {
        if (err?.response?.status !== 404) {
          console.error('게시글 조회 실패', err);
        }
        ToastUtils.error('글을 불러올 수 없습니다');
      })
      .finally(() => setLoading(false));
  }, [boardId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleDeleteConfirm = () => {
    boardApi
      .deletePost(boardId)
      .then(() => {
        ToastUtils.success('글이 삭제되었습니다.');

        // 이동은 실제 카테고리 기준
        const nextCat = post?.category?.toLowerCase() ?? category;
        router.push(`/boards/category/${nextCat}`);
      })
      .catch(() => ToastUtils.error('글 삭제에 실패했습니다.'))
      .finally(() => setShowDeleteModal(false));
  };

  const handleReportSubmit = () => {
    // TODO: 신고 API 연동 시 사용
    ToastUtils.info('신고 기능은 준비 중입니다.');
    setShowReportModal(false);
    setReportReason('');
  };

  const handleGoToLogin = () => {
    setShowLoginRequiredModal(false);
    router.push(`/auth/login?redirect=${encodeURIComponent(pathname ?? '')}`);
  };

  const handlePostLikeClick = () => {
    if (!isAuthenticated) {
      setShowLoginRequiredModal(true);
      return;
    }
    if (likeLoading || !post) return;
    setLikeLoading(true);
    boardApi
      .likePost(boardId)
      .then(({ data }) => {
        if (data?.data && typeof data.data.liked === 'boolean') {
          const res = data.data;
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  isliked: res.liked,
                  likes:
                    typeof res.likes === 'number' ? res.likes : prev.likes ?? 0,
                }
              : null
          );
        }
      })
      .catch(() => {
        ToastUtils.error('좋아요 처리에 실패했습니다.');
      })
      .finally(() => setLikeLoading(false));
  };

  const handlePostReportClick = () => {
    setMenuOpen(false);
    if (!isAuthenticated) {
      setShowLoginRequiredModal(true);
      return;
    }
    setShowReportModal(true);
  };

  if (loading) return <div className={styles.loading}>로딩 중…</div>;
  if (!post) return <div className={styles.loading}>글이 없습니다.</div>;

  const ytId = extractYoutubeId(post.fileUrl ?? undefined);

  const isAuthor =
    post.userId != null &&
    currentUserId != null &&
    String(post.userId) === String(currentUserId);

  const Categorytype = post.category
    ? post.category.toLowerCase()
    : category;

  return (
    <article className={styles.wrap}>
      <div className={styles.categoryRow}>
        <Link
          href={`/boards/category/${Categorytype}`}
          className={styles.categoryLink}
        >
          {getCategoryDisplayName(post.category)}
        </Link>
      </div>

      <div className={styles.titleRow}>
        <h1 className={styles.title}>{post.title}</h1>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.iconBtn} ${post.liked === true ? styles.likeBtnLiked : ''}`}
            onClick={handlePostLikeClick}
            disabled={likeLoading}
          >
            <Heart size={18} fill={post.liked === true ? 'currentColor' : 'none'} />
            {post.likes ?? 0}
          </button>

          <span className={styles.iconBtn}>
            <Eye size={18} />
            {formatViews(post.views)}
          </span>

          <span className={styles.iconBtn} style={{ cursor: 'default' }}>
            {formatCreatedDateTimeFull(
              Array.isArray(post.createdDateTime)
                ? post.createdDateTime
                : undefined
            )}
          </span>

          <div className={styles.menuWrapper} ref={menuRef}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setMenuOpen((p) => !p)}
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <div className={styles.menuDropdown}>
                {isAuthor ? (
                  <>
                    <button
                      className={styles.menuItem}
                      onClick={() => router.push(`/boards/${boardId}/edit`)}
                    >
                      수정
                    </button>
                    <button
                      className={styles.menuItem}
                      onClick={() => setShowDeleteModal(true)}
                    >
                      삭제
                    </button>
                  </>
                ) : (
                  <button
                    className={styles.menuItem}
                    onClick={handlePostReportClick}
                  >
                    신고
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.authorRow}>
        <span className={styles.author}>{post.nickname || '—'}</span>
      </div>

      <div className={styles.contentBlock}>
        {Categorytype === 'showcase' && ytId && (
          <div className={styles.videoWrap}>
            <iframe
              title="YouTube"
              src={`https://www.youtube.com/embed/${ytId}`}
              allowFullScreen
            />
          </div>
        )}

        {Categorytype === 'playlists' && post.playlistThumbnail && (
          <a
            href={post.playlistUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.thumbLink}
          >
            <img src={post.playlistThumbnail} alt="" />
          </a>
        )}

        {Categorytype === 'spotlight' &&
          post.photos &&
          post.photos.length > 0 && (
            <div className={styles.photoList}>
              {post.photos.map((url, i) => (
                <img key={i} src={url} alt="" />
              ))}
            </div>
          )}

        {['community', 'reviews'].includes(Categorytype) &&
          post.files &&
          post.files.length > 0 && (
            <div className={styles.fileList}>
              {post.files.map((f, i) => (
                <div key={i} className={styles.fileItem}>
                  <a href={f.url} download>
                    {f.name}
                  </a>
                </div>
              ))}
            </div>
          )}

        <div className={styles.text}>{post.content}</div>
      </div>

      <CommentSection
        boardId={boardId}
        isAuthenticated={isAuthenticated}
        onLoginRequired={() => setShowLoginRequiredModal(true)}
      />

      {showLoginRequiredModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <p className={styles.modalMessage}>로그인 페이지로 이동하시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonConfirm}`}
                onClick={handleGoToLogin}
              >
                예
              </button>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                onClick={() => setShowLoginRequiredModal(false)}
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <p className={styles.modalMessage}>정말 삭제 하시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonDelete}`}
                onClick={handleDeleteConfirm}
              >
                예
              </button>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                onClick={() => setShowDeleteModal(false)}
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신고 모달 */}
      {showReportModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <p className={styles.modalMessage} style={{ marginBottom: '12px' }}>
              신고 사유를 입력해주세요.
            </p>
            <textarea
              className={styles.reportTextarea}
              placeholder="신고 사유를 입력하세요"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={200}
            />
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
              >
                취소
              </button>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonConfirm}`}
                onClick={handleReportSubmit}
              >
                신고
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
