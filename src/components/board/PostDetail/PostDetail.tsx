'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Eye, MoreVertical } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { boardApi } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import type { BoardCategory } from '@/api/boardApi';
import styles from './PostDetail.module.css';

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorNickname?: string;
  likeCount?: number;
  viewCount?: number;
  isLiked?: boolean;
  isAuthor?: boolean; // 현재 로그인한 사용자가 작성자인지 여부
  createdAt?: string;
  youtubeUrl?: string;
  playlistThumbnail?: string;
  playlistTitle?: string;
  playlistUrl?: string;
  photos?: string[];
  files?: { name: string; url: string }[];
}

interface Comment {
  id: string;
  authorId?: string;
  authorNickname: string;
  content: string;
  createdAt: string;
  likeCount?: number;
  isAuthor?: boolean; // 현재 로그인한 사용자가 작성자인지 여부
  replies?: Comment[];
}

function extractYoutubeId(url?: string): string {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? m[1] : '';
}

function formatDateTime(s?: string): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

interface PostDetailProps {
  category: string;
  boardId: string;
}

export default function PostDetail({ category, boardId }: PostDetailProps) {
  const router = useRouter();
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
  const menuRef = useRef<HTMLDivElement>(null);
  const commentMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const safeCat = (['showcase', 'playlists', 'spotlight', 'community', 'reviews'].includes(category)
    ? category
    : 'showcase') as BoardCategory;

  useEffect(() => {
    boardApi
      .getPost(safeCat, boardId)
      .then(({ data }) => {
        const d = data?.data as Post & { comments?: Comment[] };
        setPost(d || null);
        setComments(d?.comments || []);
      })
      .catch(() => ToastUtils.error('글을 불러올 수 없습니다'))
      .finally(() => setLoading(false));
  }, [safeCat, boardId]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      // 댓글 메뉴 닫기
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

  const handleLike = () => {
    if (!isAuthenticated) return;
    boardApi.likePost(safeCat, boardId).then(() => {
      setPost((p) => (p ? { ...p, likeCount: (p.likeCount ?? 0) + 1, isLiked: true } : null));
    }).catch(() => ToastUtils.error('실패'));
  };

  const handleCommentSubmit = () => {
    if (!isAuthenticated || !commentText.trim() || commentText.length > 50) return;
    boardApi.createComment(safeCat, boardId, commentText).then(() => {
      setCommentText('');
      setCommentOpen(true);
      // Refetch or append optimistically
      boardApi.getPost(safeCat, boardId).then(({ data }) => {
        const d = data?.data as { comments?: Comment[] };
        setComments(d?.comments || []);
      });
    }).catch(() => ToastUtils.error('댓글 등록 실패'));
  };

  const handleMenuClick = () => {
    if (!isAuthenticated) return; // 비로그인 사용자는 동작하지 않음
    setMenuOpen((prev) => !prev);
  };

  const handleEdit = () => {
    setMenuOpen(false);
    router.push(`/boards/${category}/${boardId}/edit`);
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    boardApi.deletePost(safeCat, boardId)
      .then(() => {
        ToastUtils.success('글이 삭제되었습니다.');
        router.push(`/boards/${category}`);
      })
      .catch(() => {
        ToastUtils.error('글 삭제에 실패했습니다.');
      })
      .finally(() => {
        setShowDeleteModal(false);
      });
  };

  const handleReportClick = () => {
    setMenuOpen(false);
    setShowReportModal(true);
  };

  const handleReportSubmit = () => {
    if (!reportReason.trim()) {
      ToastUtils.error('신고 사유를 입력해주세요.');
      return;
    }
    boardApi.reportPost(safeCat, boardId, reportReason.trim())
      .then(() => {
        ToastUtils.success('신고가 접수되었습니다.');
        setShowReportModal(false);
        setReportReason('');
      })
      .catch(() => {
        ToastUtils.error('신고 접수에 실패했습니다.');
      });
  };

  // 댓글 메뉴 핸들러
  const handleCommentMenuClick = (commentId: string) => {
    if (!isAuthenticated) return;
    setCommentMenuOpen((prev) => (prev === commentId ? null : commentId));
  };

  const handleCommentDeleteClick = (commentId: string) => {
    setCommentMenuOpen(null);
    setShowCommentDeleteModal(commentId);
  };

  const handleCommentDeleteConfirm = () => {
    if (!showCommentDeleteModal) return;
    boardApi.deleteComment(safeCat, boardId, showCommentDeleteModal)
      .then(() => {
        ToastUtils.success('댓글이 삭제되었습니다.');
        setComments((prev) => prev.filter((c) => c.id !== showCommentDeleteModal));
        setShowCommentDeleteModal(null);
      })
      .catch(() => {
        ToastUtils.error('댓글 삭제에 실패했습니다.');
        setShowCommentDeleteModal(null);
      });
  };

  const handleCommentReportClick = (commentId: string) => {
    setCommentMenuOpen(null);
    setShowCommentReportModal(commentId);
  };

  const handleCommentReportSubmit = () => {
    if (!showCommentReportModal || !commentReportReason.trim()) {
      ToastUtils.error('신고 사유를 입력해주세요.');
      return;
    }
    boardApi.reportComment(safeCat, boardId, showCommentReportModal, commentReportReason.trim())
      .then(() => {
        ToastUtils.success('신고가 접수되었습니다.');
        setShowCommentReportModal(null);
        setCommentReportReason('');
      })
      .catch(() => {
        ToastUtils.error('신고 접수에 실패했습니다.');
      });
  };

  if (loading) return <div className={styles.loading}>로딩 중…</div>;
  if (!post) return <div className={styles.loading}>글이 없습니다.</div>;

  const ytId = extractYoutubeId(post.youtubeUrl);
  const isAuthor = post.isAuthor ?? false;

  return (
    <article className={styles.wrap}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{post.title}</h1>
        <div className={styles.actions}>
          <button type="button" className={styles.iconBtn} onClick={handleLike} disabled={!isAuthenticated}>
            <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} />
            {post.likeCount ?? 0}
          </button>
          <span className={styles.iconBtn}>
            <Eye size={18} />
            {post.viewCount ?? 0}
          </span>
          <span className={styles.iconBtn} style={{ cursor: 'default' }}>
            {formatDateTime(post.createdAt)}
          </span>
          <div className={styles.menuWrapper} ref={menuRef}>
            <button
              type="button"
              className={styles.iconBtn}
              title="메뉴"
              onClick={handleMenuClick}
              disabled={!isAuthenticated}
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && isAuthenticated && (
              <div className={styles.menuDropdown}>
                {isAuthor ? (
                  <>
                    <button type="button" className={styles.menuItem} onClick={handleEdit}>
                      수정
                    </button>
                    <button type="button" className={styles.menuItem} onClick={handleDeleteClick}>
                      삭제
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.menuItem} onClick={handleReportClick}>
                    신고
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.authorRow}>
        <span className={styles.author}>{post.authorNickname || '—'}</span>
        {isAuthenticated && !isAuthor && (
          <button type="button" className={styles.donateBtn}>
            POP 기부
          </button>
        )}
      </div>

      <div className={styles.contentBlock}>
        {category === 'showcase' && ytId && (
          <div className={styles.videoWrap}>
            <iframe
              title="YouTube"
              src={`https://www.youtube.com/embed/${ytId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {category === 'playlists' && post.playlistThumbnail && (
          <a
            href={post.playlistUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.thumbLink}
          >
            <img src={post.playlistThumbnail} alt="" />
          </a>
        )}

        {category === 'spotlight' && post.photos && post.photos.length > 0 && (
          <div className={styles.photoList}>
            {post.photos.map((url, i) => (
              <img key={i} src={url} alt="" />
            ))}
          </div>
        )}

        {['community', 'reviews'].includes(category) && post.files && post.files.length > 0 && (
          <div className={styles.fileList}>
            {post.files.map((f, i) => (
              <div key={i} className={styles.fileItem}>
                <a href={f.url} download>{f.name}</a>
              </div>
            ))}
          </div>
        )}

        <div className={styles.text}>{post.content}</div>
      </div>

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
                  if (!isAuthenticated) {
                    router.push('/auth/login');
                  }
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

            {/* ✅ 댓글 리스트 */}
            {comments.map((c) => {
              const isCommentAuthor = c.isAuthor ?? false;
              return (
                <div key={c.id} className={styles.commentItem}>
                  <div className={styles.commentHead}>
                    <span className={styles.commentAuthor}>
                      {c.authorNickname}
                    </span>
                    <span className={styles.commentDate}>
                      {formatDateTime(c.createdAt)}
                    </span>
                    <div
                      className={styles.menuWrapper}
                      ref={(el) => {
                        if (el) {
                          commentMenuRefs.current[c.id] = el;
                        } else {
                          delete commentMenuRefs.current[c.id];
                        }
                      }}
                    >
                      <button
                        type="button"
                        className={styles.iconBtn}
                        title="메뉴"
                        onClick={() => handleCommentMenuClick(c.id)}
                        disabled={!isAuthenticated}
                        style={{ padding: '2px 6px' }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {commentMenuOpen === c.id && isAuthenticated && (
                        <div className={styles.menuDropdown}>
                          {isCommentAuthor ? (
                            <>
                              <button
                                type="button"
                                className={styles.menuItem}
                                onClick={() => {
                                  // TODO: 댓글 수정 기능 구현
                                  setCommentMenuOpen(null);
                                  ToastUtils.info('댓글 수정 기능은 준비 중입니다.');
                                }}
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                className={styles.menuItem}
                                onClick={() => handleCommentDeleteClick(c.id)}
                              >
                                삭제
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
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

                  <button
                    type="button"
                    className={styles.replyBtn}
                    disabled={!isAuthenticated}
                    onClick={() => {
                      if (!isAuthenticated) router.push('/auth/login');
                    }}
                  >
                    답글
                  </button>
                </div>
              );
            })}
          </>
        )}
      </section>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <p className={styles.modalMessage}>정말 삭제 하시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                onClick={() => setShowDeleteModal(false)}
              >
                아니요
              </button>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonDelete}`}
                onClick={handleDeleteConfirm}
              >
                예
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
