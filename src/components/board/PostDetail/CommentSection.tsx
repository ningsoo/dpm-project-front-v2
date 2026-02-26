'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Heart, MoreVertical } from 'lucide-react';
import { boardApi } from '@/api/boardApi';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { formatCreatedDateTimeFull } from '@/utils/createdDateTime';
import { formatCommentCount, formatNickname } from '@/utils/displayFormatters';
import MessageSendModal from './MessageSendModal';
import styles from '../BoardFormLayout/BoardFormLayout.module.css';

/** API 응답 댓글 형태 (백엔드 isDeleted → JSON deleted) */
interface CommentFromApi {
  commentId?: number | string;
  userId?: number;
  nickname: string;
  deleted?: boolean;
  content: string;
  likeCount?: number;
  toggledLike?: boolean;
  createdDatetime?: number[];
  createdDateTime?: number[];
}

/** 화면용 댓글 타입 */
interface Comment {
  id: string;
  commentId: string | undefined;
  userId: number | undefined;
  nickname: string;
  deleted?: boolean;
  content: string;
  likeCount: number;
  toggledLike: boolean;
  createdDateTime: number[];
}

function getCommentFallbackId(nickname: string, createdDateTime: number[] | unknown): string {
  const arr = Array.isArray(createdDateTime) ? createdDateTime : [];
  return `${nickname}-${arr.join('-')}`;
}

function extractCommentList(data: unknown): CommentFromApi[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  const inner = d.data;
  if (Array.isArray(inner)) return inner as unknown as CommentFromApi[];
  if (inner && typeof inner === 'object') {
    const arr = (inner as Record<string, unknown>).commentResponse;
    if (Array.isArray(arr)) return arr as CommentFromApi[];
  }
  return [];
}

function getCountCommentFromResponse(data: unknown): number | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const inner = (data as Record<string, unknown>).data;
  if (inner && typeof inner === 'object') {
    const n = (inner as Record<string, unknown>).countComment;
    return typeof n === 'number' ? n : undefined;
  }
  return undefined;
}

function transformComments(apiData: CommentFromApi[]): Comment[] {
  return apiData.map((c) => {
    const dt = c.createdDatetime ?? c.createdDateTime ?? [];
    return {
      id: c.commentId != null ? String(c.commentId) : getCommentFallbackId(c.nickname, dt),
      commentId: c.commentId != null ? String(c.commentId) : undefined,
      userId: c.userId,
      nickname: c.nickname,
      deleted: c.deleted,
      content: c.content,
      likeCount: typeof c.likeCount === 'number' ? c.likeCount : 0,
      toggledLike: c.toggledLike === true,
      createdDateTime: Array.isArray(dt) ? dt : [],
    };
  });
}

export interface CommentSectionProps {
  boardId: string;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
}

export default function CommentSection({
  boardId,
  isAuthenticated,
  onLoginRequired,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [countComment, setCountComment] = useState<number>(0);
  const [commentText, setCommentText] = useState('');
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null);
  const [commentMenuSource, setCommentMenuSource] = useState<'nickname' | 'ellipsis'>('ellipsis');
  const [showCommentDeleteModal, setShowCommentDeleteModal] = useState<string | null>(null);
  const [showCommentReportModal, setShowCommentReportModal] = useState<string | null>(null);
  const [commentReportReason, setCommentReportReason] = useState('');
  const [commentLikeLoading, setCommentLikeLoading] = useState<string | null>(null);
  const [commentSubmitLoading, setCommentSubmitLoading] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [commentEditLoading, setCommentEditLoading] = useState<string | null>(null);
  const [messageModalTarget, setMessageModalTarget] = useState<{
    userId: number;
    nickname: string;
    deleted?: boolean;
  } | null>(null);

  const commentMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const didAutoScrollRef = useRef(false);
  const pendingHashIdRef = useRef<string | null>(null);
  const currentUserId =
    typeof window !== 'undefined' ? tokenUtils.getUserIdFromToken() : null;

  // 해시가 #comment-로 시작하면 댓글 섹션 자동 펼침
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash.startsWith('#comment-')) {
      const targetId = hash.slice(1);
      pendingHashIdRef.current = targetId;
      setCommentOpen(true);
    }
  }, []);

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
        const raw = extractCommentList(data);
        setComments(transformComments(raw));
        const count = getCountCommentFromResponse(data);
        if (typeof count === 'number') setCountComment(count);
        else setCountComment(raw.length);
      })
      .catch(() => {
        setComments([]);
        setCountComment(0);
      });
  }, [boardId]);

  // 댓글 목록 렌더 후 해시 대상으로 스크롤
  useEffect(() => {
    if (
      !didAutoScrollRef.current &&
      pendingHashIdRef.current &&
      commentOpen
    ) {
      const targetId = pendingHashIdRef.current;
      let attempt = 0;
      const maxAttempts = 12;
      const intervalMs = 150;
      const tryScroll = () => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ block: 'start' });
          didAutoScrollRef.current = true;
          pendingHashIdRef.current = null;
          // 스크롤 후 해당 댓글 하이라이트 애니메이션
          const commentId = targetId.replace('comment-', '');
          setHighlightedCommentId(commentId);
          setTimeout(() => setHighlightedCommentId(null), 2000);
          return;
        }
        attempt += 1;
        if (attempt < maxAttempts) {
          setTimeout(tryScroll, intervalMs);
        }
      };
      tryScroll();
    }
  }, [commentOpen, comments.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleClickOutside = (event: MouseEvent) => {
      if (commentMenuOpen) {
        const clickedInside = Object.values(commentMenuRefs.current).some(
          (ref) => ref && ref.contains(event.target as Node)
        );
        if (!clickedInside) setCommentMenuOpen(null);
      }
    };
    if (commentMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commentMenuOpen]);

  const handleCommentSubmit = () => {
    if (
      !isAuthenticated ||
      !commentText.trim() ||
      commentText.length > 100 ||
      commentSubmitLoading
    )
      return;

    setCommentSubmitLoading(true);
    boardApi
      .createComment(boardId, { content: commentText.trim() })
      .then(({ data }) => {
        setCommentText('');
        setCommentOpen(true);
        const res = (data as { data?: CommentFromApi & { countComment?: number } })?.data;
        if (!res || typeof res !== 'object') return;
        if (typeof res.countComment === 'number') {
          setCountComment(res.countComment);
        }
        const newComment = transformComments([res])[0];
        if (newComment) {
          setComments((prev) => [...prev, newComment]);
        }
      })
      .catch(() => ToastUtils.error('댓글 등록 실패'))
      .finally(() => setCommentSubmitLoading(false));
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommentSubmit();
    }
  };

  const handleEditStart = (commentId: string, content: string) => {
    setCommentMenuOpen(null);
    setEditingCommentId(commentId);
    setEditingContent(content);
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleEditSubmit = (commentId: string, originalContent: string) => {
    const trimmed = editingContent.trim();
    if (!trimmed) {
      ToastUtils.error('댓글 내용을 입력해주세요.');
      return;
    }
    if (trimmed === originalContent) {
      handleEditCancel();
      return;
    }
    if (commentEditLoading) return;

    setCommentEditLoading(commentId);
    boardApi
      .updateComment(boardId, commentId, { content: trimmed })
      .then(() => {
        setComments((prev) =>
          prev.map((c) =>
            (c.commentId ?? c.id) === commentId ? { ...c, content: trimmed } : c
          )
        );
        handleEditCancel();
      })
      .catch(() => ToastUtils.error('댓글 수정에 실패했습니다.'))
      .finally(() => setCommentEditLoading(null));
  };

  const handleEditKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    commentId: string,
    originalContent: string
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit(commentId, originalContent);
    }
  };

  const handleCommentDeleteConfirm = () => {
    if (!showCommentDeleteModal) return;
    const deletedCommentId = showCommentDeleteModal;
    boardApi
      .deleteComment(boardId, deletedCommentId)
      .then(() => {
        ToastUtils.success('댓글이 삭제되었습니다.');
        setComments((prev) =>
          prev.filter((c) => (c.commentId ?? c.id) !== deletedCommentId)
        );
        setCountComment((prev) => Math.max(0, prev - 1));
      })
      .catch(() => ToastUtils.error('댓글 삭제에 실패했습니다.'))
      .finally(() => setShowCommentDeleteModal(null));
  };

  const handleCommentReportSubmit = () => {
    ToastUtils.info('신고 기능은 준비 중입니다.');
    setShowCommentReportModal(null);
    setCommentReportReason('');
  };

  const handleCommentLikeClick = (commentId: string) => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    if (commentLikeLoading) return;
    setCommentLikeLoading(commentId);
    boardApi
      .likeComment(boardId, commentId)
      .then(({ data }) => {
        const res = (data as { data?: { likeCount?: number; toggledLike?: boolean } })?.data;
        if (res && typeof res.likeCount === 'number' && typeof res.toggledLike === 'boolean') {
          const { likeCount, toggledLike } = res;
          setComments((prev) =>
            prev.map((c) =>
              (c.commentId ?? c.id) === commentId ? { ...c, likeCount, toggledLike } : c
            )
          );
        }
      })
      .catch(() => ToastUtils.error('좋아요 처리에 실패했습니다.'))
      .finally(() => setCommentLikeLoading(null));
  };

  const handleCommentReportClick = (cId: string) => {
    setCommentMenuOpen(null);
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    setShowCommentReportModal(cId);
  };

  return (
    <>
      <section className={styles.commentSection}>
        <h2 className={styles.commentTitle}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setCommentOpen((o) => !o)}
          >
            <MessageCircle size={18} />
            댓글 {formatCommentCount(countComment)}
          </button>
        </h2>

        {commentOpen && (
          <>
            <div className={styles.commentForm}>
              <textarea
                placeholder={
                  isAuthenticated
                    ? '댓글을 입력해주세요.'
                    : '로그인 후 댓글을 작성할 수 있습니다.'
                }
                value={commentText}
                onChange={(e) => {
                  if (!isAuthenticated) return;
                  setCommentText(e.target.value);
                }}
                onKeyDown={handleCommentKeyDown}
                onFocus={() => {
                  if (!isAuthenticated) onLoginRequired();
                }}
                className={styles.commentInput}
                maxLength={100}
                readOnly={!isAuthenticated}
                rows={2}
              />
              <button
                type="button"
                className={styles.commentSubmit}
                onClick={handleCommentSubmit}
                disabled={
                  !isAuthenticated ||
                  !commentText.trim() ||
                  commentSubmitLoading
                }
              >
                {commentSubmitLoading ? '등록 중…' : '등록'}
              </button>
            </div>

            {comments.map((c) => {
              const isCommentAuthor =
                c.userId != null &&
                currentUserId != null &&
                String(c.userId) === String(currentUserId);
              const apiCommentId = c.commentId ?? c.id;
              const isCommentLikeLoading = commentLikeLoading === apiCommentId;

              return (
                <div
                  key={c.commentId ?? c.id}
                  id={apiCommentId != null ? `comment-${apiCommentId}` : undefined}
                  className={`${styles.commentItem}${highlightedCommentId === apiCommentId ? ` ${styles.commentItemHighlight}` : ''}`}
                >
                  <div
                    className={styles.commentHead}
                    ref={(el) => {
                      if (el) commentMenuRefs.current[c.id] = el;
                      else delete commentMenuRefs.current[c.id];
                    }}
                  >
                    {isCommentAuthor ? (
                      <span className={`${styles.commentAuthor} ${c.deleted ? 'authorDeleted' : ''}`}>{formatNickname(c.nickname, c.deleted, '-')}</span>
                    ) : (
                      <div className={styles.menuWrapper}>
                        <button
                          type="button"
                          className={styles.commentAuthorBtn}
                          onClick={() => {
                            if (!isAuthenticated) {
                              onLoginRequired();
                              return;
                            }
                            const nextOpen = commentMenuOpen === c.id && commentMenuSource === 'nickname' ? null : c.id;
                            setCommentMenuOpen(nextOpen);
                            setCommentMenuSource('nickname');
                          }}
                        >
                          <span className={c.deleted ? 'authorDeleted' : ''}>{formatNickname(c.nickname, c.deleted, '-')}</span>
                        </button>
                        {commentMenuOpen === c.id && commentMenuSource === 'nickname' && (
                          <div className={`${styles.menuDropdown} ${styles.menuDropdownRight}`}>
                            {c.userId != null && (
                              <button
                                className={styles.menuItem}
                                onClick={() => {
                                  setCommentMenuOpen(null);
                                  setMessageModalTarget({
                                    userId: c.userId!,
                                    nickname: c.nickname,
                                    deleted: c.deleted,
                                  });
                                }}
                              >
                                쪽지
                              </button>
                            )}
                            <button
                              className={styles.menuItem}
                              onClick={() => handleCommentReportClick(c.id)}
                            >
                              신고
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      className={`${styles.commentLikeBtn} ${c.toggledLike ? styles.likeBtnLiked : ''}`}
                      onClick={() => handleCommentLikeClick(apiCommentId)}
                      disabled={isCommentLikeLoading}
                    >
                      <Heart size={16} fill={c.toggledLike ? 'currentColor' : 'none'} />
                      <span>{c.likeCount}</span>
                    </button>
                    <span className={styles.commentDate}>
                      {formatCreatedDateTimeFull(c.createdDateTime)}
                    </span>
                    <div className={styles.menuWrapper}>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnCompact}`}
                        onClick={() => {
                          const nextOpen = commentMenuOpen === c.id && commentMenuSource === 'ellipsis' ? null : c.id;
                          setCommentMenuOpen(nextOpen);
                          setCommentMenuSource('ellipsis');
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {commentMenuOpen === c.id && commentMenuSource === 'ellipsis' && (
                        <div className={styles.menuDropdown}>
                          {isCommentAuthor ? (
                            <>
                              <button
                                className={styles.menuItem}
                                onClick={() =>
                                  handleEditStart(apiCommentId, c.content)
                                }
                              >
                                수정
                              </button>
                              <button
                                className={styles.menuItem}
                                onClick={() => setShowCommentDeleteModal(apiCommentId)}
                              >
                                삭제
                              </button>
                            </>
                          ) : (
                            <>
                              {c.userId != null && (
                                <button
                                  className={styles.menuItem}
                                  onClick={() => {
                                    setCommentMenuOpen(null);
                                    setMessageModalTarget({
                                      userId: c.userId!,
                                      nickname: c.nickname,
                                      deleted: c.deleted,
                                    });
                                  }}
                                >
                                  쪽지
                                </button>
                              )}
                              <button
                                className={styles.menuItem}
                                onClick={() => handleCommentReportClick(c.id)}
                              >
                                신고
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {editingCommentId === apiCommentId ? (
                    <div className={styles.commentEditBlock}>
                      <textarea
                        className={styles.commentEditInput}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={(e) =>
                          handleEditKeyDown(e, apiCommentId, c.content)
                        }
                        maxLength={50}
                        rows={2}
                        disabled={!!commentEditLoading}
                      />
                      <div className={styles.commentEditActions}>
                        <button
                          type="button"
                          className={styles.commentEditCancel}
                          onClick={handleEditCancel}
                          disabled={!!commentEditLoading}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          className={styles.commentEditSubmit}
                          onClick={() =>
                            handleEditSubmit(apiCommentId, c.content)
                          }
                          disabled={
                            !!commentEditLoading || !editingContent.trim()
                          }
                        >
                          {commentEditLoading === apiCommentId
                            ? '수정 중…'
                            : '수정 완료'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.commentBody}>{c.content}</div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </section>

      {messageModalTarget && (
        <MessageSendModal
          open={!!messageModalTarget}
          onClose={() => setMessageModalTarget(null)}
          targetUserId={messageModalTarget.userId}
          targetNickname={formatNickname(messageModalTarget.nickname, messageModalTarget.deleted)}
          onLoginRequired={onLoginRequired}
        />
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
            <p className={`${styles.modalMessage} ${styles.modalMessageMb12}`}>
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
    </>
  );
}
