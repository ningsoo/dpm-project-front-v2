'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, MessageCircle, Eye, MoreVertical } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { formatCreatedDateTimeFull } from '@/utils/createdDateTime';
import type { BoardDetail } from '@/api/boardApi';
import styles from './PostDetail.module.css';

/** API 응답 댓글 형태 */
interface CommentFromApi {
  commentId?: number | string;
  userId?: number;
  nickname: string;
  content: string;
  createdDateTime: number[];
}

/** 화면용 댓글 타입 */
interface Comment {
  id: string;
  commentId: string | undefined;
  userId: number | undefined;
  nickname: string;
  content: string;
  createdDateTime: number[];
}

/** commentId 없을 때 fallback key 생성 */
function getCommentFallbackId(nickname: string, createdDateTime: number[] | unknown): string {
  const arr = Array.isArray(createdDateTime) ? createdDateTime : [];
  return `${nickname}-${arr.join('-')}`;
}

function transformComments(apiData: CommentFromApi[]): Comment[] {
  return apiData.map((c) => ({
    id: c.commentId != null
      ? String(c.commentId)
      : getCommentFallbackId(c.nickname, c.createdDateTime),
    commentId: c.commentId != null ? String(c.commentId) : undefined,
    userId: c.userId,
    nickname: c.nickname,
    content: c.content,
    createdDateTime: c.createdDateTime,
  }));
}

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  const [commentOpen, setCommentOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null);
  const [showCommentDeleteModal, setShowCommentDeleteModal] = useState<string | null>(null);
  const [showCommentReportModal, setShowCommentReportModal] = useState<string | null>(null);
  const [commentReportReason, setCommentReportReason] = useState('');
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<string, number>>({});
  const [likeLoading, setLikeLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const commentMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // ===== 댓글 조회 =====
  useEffect(() => {
    if (!boardId) return;

    boardApi
      .getComments(boardId)
      .catch((err: { response?: { status?: number } }) => {
        if (err?.response?.status === 404) {
          return { data: { data: [] } };
        }
        return Promise.reject(err);
      })
      .then(({ data }) => {
        const raw = Array.isArray(data?.data)
          ? (data.data as unknown as CommentFromApi[])
          : [];
        setComments(transformComments(raw));
      })
      .catch(() => {
        setComments([]);
      });
  }, [boardId]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }

      if (commentMenuOpen) {
        const clickedInside = Object.values(commentMenuRefs.current).some(
          (ref) => ref && ref.contains(event.target as Node)
        );
        if (!clickedInside) {
          setCommentMenuOpen(null);
        }
      }
    };

    if (menuOpen || commentMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, commentMenuOpen]);

  const handleCommentSubmit = () => {
    if (!isAuthenticated || !commentText.trim() || commentText.length > 50) return;

    boardApi
      .createComment(boardId, { content: commentText.trim() })
      .then(() => {
        setCommentText('');
        setCommentOpen(true);
        return boardApi.getComments(boardId);
      })
      .then(({ data }) => {
        const raw = Array.isArray(data?.data)
          ? (data.data as unknown as CommentFromApi[])
          : [];
        setComments(transformComments(raw));
      })
      .catch(() => ToastUtils.error('댓글 등록 실패'));
  };

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

  const handleCommentDeleteConfirm = () => {
    if (!showCommentDeleteModal) return;
    const deletedCommentId = showCommentDeleteModal;
    const wasLastComment = comments.length === 1;
    boardApi
      .deleteComment(boardId, deletedCommentId)
      .then(() => {
        ToastUtils.success('댓글이 삭제되었습니다.');
        setComments((prev) =>
          prev.filter((c) => (c.commentId ?? c.id) !== deletedCommentId)
        );
        if (wasLastComment) return Promise.resolve(null);
        return boardApi.getComments(boardId);
      })
      .then((res) => {
        if (res === null) return;
        const raw = Array.isArray(res?.data?.data)
          ? (res.data.data as unknown as CommentFromApi[])
          : [];
        setComments(transformComments(raw));
      })
      .catch((err: { response?: { status?: number } }) => {
        if (err?.response?.status === 404) {
          setComments([]);
        } else {
          ToastUtils.error('댓글 삭제에 실패했습니다.');
        }
      })
      .finally(() => setShowCommentDeleteModal(null));
  };

  const handleCommentReportSubmit = () => {
    // TODO: 댓글 신고 API 연동 시 사용
    ToastUtils.info('신고 기능은 준비 중입니다.');
    setShowCommentReportModal(null);
    setCommentReportReason('');
  };

  /** 로그인 필요 모달에서 "예" 클릭 → 로그인 페이지로 이동 (이전 페이지 redirect 파라미터 포함) */
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
        if (data?.data && typeof data.data.isliked === 'boolean') {
          const res = data.data;
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  isliked: res.isliked,
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

  const handleCommentLikeClick = (commentId: string) => {
    if (!isAuthenticated) {
      setShowLoginRequiredModal(true);
      return;
    }
    setCommentLikeCounts((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] ?? 0) + 1,
    }));
    ToastUtils.success('좋아요');
  };

  const handlePostReportClick = () => {
    setMenuOpen(false);
    if (!isAuthenticated) {
      setShowLoginRequiredModal(true);
      return;
    }
    setShowReportModal(true);
  };

  const handleCommentReportClick = (cId: string) => {
    setCommentMenuOpen(null);
    if (!isAuthenticated) {
      setShowLoginRequiredModal(true);
      return;
    }
    setShowCommentReportModal(cId);
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
            className={`${styles.iconBtn} ${post.isliked === true ? styles.likeBtnLiked : ''}`}
            onClick={handlePostLikeClick}
            disabled={likeLoading}
          >
            <Heart size={18} fill={post.isliked === true ? 'currentColor' : 'none'} />
            {post.likes ?? 0}
          </button>

          <span className={styles.iconBtn}>
            <Eye size={18} />
            {post.views ?? 0}
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

      {/* ===== 댓글 영역 (기존 유지) ===== */}
      <section className={styles.commentSection}>
        <h2 className={styles.commentTitle}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setCommentOpen((o) => !o)}
          >
            <MessageCircle size={18} />
            댓글 {comments.length}
          </button>
        </h2>

        {commentOpen && (
          <>
            <div className={styles.commentForm}>
              <input
                type="text"
                placeholder={
                  isAuthenticated
                    ? '댓글 (1~50자)'
                    : '로그인 후 댓글을 작성할 수 있습니다.'
                }
                value={commentText}
                onChange={(e) => {
                  if (!isAuthenticated) return;
                  setCommentText(e.target.value);
                }}
                onFocus={() => {
                  if (!isAuthenticated) setShowLoginRequiredModal(true);
                }}
                className={styles.commentInput}
                maxLength={50}
                readOnly={!isAuthenticated}
              />

              <button
                type="button"
                className={styles.commentSubmit}
                onClick={handleCommentSubmit}
                disabled={!isAuthenticated || !commentText.trim()}
              >
                등록
              </button>
            </div>

            {comments.map((c) => {
              const isCommentAuthor =
                c.userId != null &&
                currentUserId != null &&
                String(c.userId) === String(currentUserId);

              const apiCommentId = c.commentId ?? c.id;

              return (
                <div key={c.id} className={styles.commentItem}>
                  <div className={styles.commentHead}>
                    <span className={styles.commentAuthor}>{c.nickname}</span>
                    <span className={styles.commentDate}>
                      {formatCreatedDateTimeFull(c.createdDateTime)}
                    </span>

                    <div
                      className={styles.menuWrapper}
                      ref={(el) => {
                        if (el) commentMenuRefs.current[c.id] = el;
                        else delete commentMenuRefs.current[c.id];
                      }}
                    >
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() =>
                          setCommentMenuOpen(
                            commentMenuOpen === c.id ? null : c.id
                          )
                        }
                        style={{ padding: '2px 6px' }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {commentMenuOpen === c.id && (
                        <div className={styles.menuDropdown}>
                          {isCommentAuthor ? (
                            <>
                              <button
                                className={styles.menuItem}
                                onClick={() =>
                                  ToastUtils.info(
                                    '댓글 수정 기능은 준비 중입니다.'
                                  )
                                }
                              >
                                수정
                              </button>
                              <button
                                className={styles.menuItem}
                                onClick={() =>
                                  setShowCommentDeleteModal(apiCommentId)
                                }
                              >
                                삭제
                              </button>
                            </>
                          ) : (
                            <button
                              className={styles.menuItem}
                              onClick={() => handleCommentReportClick(c.id)}
                            >
                              신고
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.commentBody}>{c.content}</div>
                  <div className={styles.commentFooter}>
                    <button
                      type="button"
                      className={styles.commentLikeBtn}
                      onClick={() => handleCommentLikeClick(c.id)}
                    >
                      <Heart size={14} />
                      <span>{commentLikeCounts[c.id] ?? 0}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

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

      {/* 댓글 삭제 확인 모달 */}
      {showCommentDeleteModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <p className={styles.modalMessage}>정말 삭제 하시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                onClick={() => setShowCommentDeleteModal(null)}
              >
                아니요
              </button>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonDelete}`}
                onClick={handleCommentDeleteConfirm}
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 신고 모달 */}
      {showCommentReportModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <p className={styles.modalMessage} style={{ marginBottom: '12px' }}>
              신고 사유를 입력해주세요.
            </p>
            <textarea
              className={styles.reportTextarea}
              placeholder="신고 사유를 입력하세요"
              value={commentReportReason}
              onChange={(e) => setCommentReportReason(e.target.value)}
              maxLength={200}
            />
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                onClick={() => {
                  setShowCommentReportModal(null);
                  setCommentReportReason('');
                }}
              >
                취소
              </button>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonConfirm}`}
                onClick={handleCommentReportSubmit}
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
