'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, Eye, MoreVertical } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { setCurrentBoardCategory } from '@/store/slices/uiSlice';
import { boardApi } from '@/api/boardApi';
import { s3Api } from '@/api/s3Api';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { formatCreatedDateTimeFull } from '@/utils/createdDateTime';
import { formatViews, formatNickname } from '@/utils/displayFormatters';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '@/utils/youtubeUtils';
import type { BoardDetail } from '@/api/boardApi';
import CommentSection from './CommentSection';
import PlaylistDetailSection from './PlaylistDetailSection';
import DonationModal from './DonationModal';
import MessageSendModal from './MessageSendModal';
import SpotlightExtendModal from './SpotlightExtendModal';
import { PopIcon } from '@/assets/site/paths';
import { MailIcon } from '@/assets/site/MailIcon';
import defaultProfileImg from '@/assets/site/profile.png';
import styles from '../BoardFormLayout/BoardFormLayout.module.css';
import postDetailStyles from './PostDetail.module.css';

interface Post extends BoardDetail {
  id?: string;
  category?: string;
  playlistThumbnail?: string;
  playlistUrl?: string;
  photos?: string[];
  files?: { url: string; name: string }[];
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
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<false | 'not_found' | 'server'>(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [nicknameMenuOpen, setNicknameMenuOpen] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [attachmentDownloading, setAttachmentDownloading] = useState(false);
  const [spotlightPhotoIndex, setSpotlightPhotoIndex] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const nicknameMenuRef = useRef<HTMLDivElement>(null);

  const currentUserId =
    typeof window !== 'undefined' ? tokenUtils.getUserIdFromToken() : null;

  // ===== 게시글 조회 (boardId 확정 시 1회, retry 시 재호출) =====
  useEffect(() => {
    const validId = typeof boardId === 'string' && boardId.trim() !== '';
    if (!validId) {
      setLoading(false);
      setPost(null);
      setFetchError(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    setFetchError(false);

    boardApi
      .getPost(boardId, { signal })
      .then(({ data }) => {
        if (signal.aborted) return;
        const postData = data?.data as BoardDetail | undefined;
        if (postData) setPost({ ...postData } as Post);
        else setPost(null);
        setFetchError(false);
      })
      .catch((err: unknown) => {
        const e = err as { name?: string; response?: { status?: number; statusText?: string; data?: unknown }; message?: string };
        if (e?.name === 'AbortError' || signal.aborted) return;
        const status = e?.response?.status;
        if (status === 500) {
          const resData = e?.response?.data;
          console.error(
            '[게시글 상세 500]',
            'boardId:', boardId,
            '| status:', status,
            '| statusText:', e?.response?.statusText ?? '(없음)',
            '| message:', e?.message ?? '(없음)',
            '| response.data:', typeof resData === 'object' ? JSON.stringify(resData) : resData
          );
          ToastUtils.error('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
          setFetchError('server');
        } else if (status === 404) {
          ToastUtils.error('삭제된 게시글입니다.');
          setFetchError('not_found');
        } else {
          console.error('게시글 조회 실패', 'boardId:', boardId, 'status:', status, err);
          ToastUtils.error('글을 불러올 수 없습니다');
          setFetchError('server');
        }
        setPost(null);
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [boardId, retryTrigger]);

  // Spotlight: 창 포커스 시 게시글 재조회 (마이페이지에서 사용취소 후 돌아왔을 때 잔여 Pop 반영)
  const isSpotlightPage = (category || (post?.categoryType ?? post?.category ?? '')).toString().toLowerCase() === 'spotlight';
  useEffect(() => {
    if (typeof window === 'undefined' || !isSpotlightPage || !boardId) return;
    const handleFocus = () => {
      boardApi.getPost(boardId).then(({ data }) => {
        const postData = data?.data as BoardDetail | undefined;
        if (postData) setPost({ ...postData } as Post);
      }).catch(() => {});
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [boardId, isSpotlightPage]);

  // 게시글 로드 시 헤더 네비에 현재 카테고리 active 표시용 (로딩 중에는 진입 카테고리 유지)
  useEffect(() => {
    if (!post) return; // 로딩 중에는 기존 값 유지
    const cat = (post.categoryType ?? post.category ?? category).toString().toLowerCase();
    dispatch(setCurrentBoardCategory(cat));
    return () => {
      dispatch(setCurrentBoardCategory(null));
    };
  }, [post, category, dispatch]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (nicknameMenuRef.current && !nicknameMenuRef.current.contains(event.target as Node)) {
        setNicknameMenuOpen(false);
      }
    };
    if (menuOpen || nicknameMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, nicknameMenuOpen]);

  // spotlight 사진 인덱스: 게시글/카테고리 바뀔 때 0으로 초기화 (훅 순서 유지를 위해 early return 이전에 호출)
  useEffect(() => {
    setSpotlightPhotoIndex(0);
  }, [boardId, category]);

  const handleDeleteConfirm = () => {
    boardApi
      .deletePost(boardId)
      .then(() => {
        ToastUtils.success('글이 삭제되었습니다.');
      

        // 이동은 실제 카테고리 기준
        const nextCat = post?.categoryType?.toLowerCase() ?? post?.category?.toLowerCase() ?? category;
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
                  liked: res.liked,
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

  /** 첨부파일 다운로드: Presigned URL 발급 후 브라우저 다운로드 트리거 */
  const handleFileDownload = async (fileKey: string, _originalFilename?: string) => {
    if (attachmentDownloading) return;
    setAttachmentDownloading(true);
    try {
      const { data } = await s3Api.getPresignedUrl(fileKey);
      const presignedUrl =
        (data as { url?: string })?.url ?? (data as { data?: { url?: string } })?.data?.url ?? null;
      if (!presignedUrl) {
        ToastUtils.error('다운로드 URL을 받지 못했습니다.');
        return;
      }
      window.location.href = presignedUrl;
    } catch {
      ToastUtils.error('파일 다운로드에 실패했습니다.');
    } finally {
      setAttachmentDownloading(false);
    }
  };

  if (loading) return <div className={styles.loading}>로딩 중…</div>;
  if (!post) {
    if (fetchError === 'not_found') {
      return (
        <div className={styles.loading}>
          <p>게시글을 불러올 수 없습니다.</p>
        </div>
      );
    }
    if (fetchError) {
      return (
        <div className={styles.loading}>
          <p style={{ marginBottom: 12 }}>일시적인 오류가 발생했습니다.</p>
          <p style={{ marginBottom: 16, fontSize: '0.9rem', color: '#666' }}>
            서버에서 응답하지 않습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => setRetryTrigger((t) => t + 1)}
          >
            다시 시도
          </button>
        </div>
      );
    }
    return <div className={styles.loading}>글이 없습니다.</div>;
  }

  const categoryType = (post.categoryType ?? post.category ?? category).toString();
  const categorySlug = categoryType.toLowerCase();

  const isAuthor =
    post.userId != null &&
    currentUserId != null &&
    String(post.userId) === String(currentUserId);

  return (
    <article className={styles.wrap}>
      <div className={styles.categoryRow}>
        <Link
          href={`/boards/category/${categorySlug}`}
          className={styles.categoryLink}
        >
          <h1 className={styles.h1}>{getCategoryDisplayName(categoryType)}</h1>
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
                      onClick={() => {
                        setMenuOpen(false);
                        router.push(`/boards/${boardId}/edit`);
                      }}
                    >
                      수정
                    </button>
                    <button
                      className={styles.menuItem}
                      onClick={() => {
                        setMenuOpen(false);
                        setShowDeleteModal(true);
                      }}
                    >
                      삭제
                    </button>
                    {categorySlug === 'spotlight' && (
                      <button
                        className={styles.menuItem}
                        onClick={() => {
                          setMenuOpen(false);
                          setShowExtendModal(true);
                        }}
                      >
                        연장하기
                      </button>
                    )}
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

      <section className={postDetailStyles.profileCard}>
        <div className={postDetailStyles.profileCardAvatarWrap}>
          <span className={postDetailStyles.avatar}>
            <img
              src={post.profileImage || defaultProfileImg.src}
              alt=""
              className={postDetailStyles.avatarImg}
              style={!post.profileImage ? { objectFit: 'contain' } : undefined}
            />
          </span>
        </div>
        <div className={postDetailStyles.profileCardText}>
          <div className={styles.menuWrapper} ref={nicknameMenuRef}>
            {isAuthor ? (
              <span className={`${postDetailStyles.author} ${post.deleted ? 'authorDeleted' : ''}`}>{formatNickname(post.nickname, post.deleted)}</span>
            ) : post.deleted ? (
              <span className={`${postDetailStyles.author} ${post.deleted ? 'authorDeleted' : ''}`}>{formatNickname(post.nickname, post.deleted, '—')}</span>
            ) : (
              <>
                <button
                  type="button"
                  className={`${postDetailStyles.author} ${postDetailStyles.authorBtn}`}
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowLoginRequiredModal(true);
                      return;
                    }
                    setNicknameMenuOpen((p) => !p);
                  }}
                >
                  {formatNickname(post.nickname, post.deleted, '—')}
                </button>
                {nicknameMenuOpen && isAuthenticated && post.userId != null && (
                  <div className={styles.menuDropdown}>
                    <button
                      className={styles.menuItem}
                      onClick={() => {
                        setNicknameMenuOpen(false);
                        setShowMessageModal(true);
                      }}
                    >
                      쪽지
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className={postDetailStyles.profileCardActions}>
          {!isAuthor && post.userId != null && !post.deleted && (
            <>
              <button
                type="button"
                className={postDetailStyles.profileCardIconLink}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginRequiredModal(true);
                    return;
                  }
                  setShowMessageModal(true);
                }}
                aria-label="쪽지 보내기"
                title="쪽지 보내기"
              >
                <MailIcon size={20} />
              </button>
              <button
                type="button"
                className={postDetailStyles.profileCardIconLink}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginRequiredModal(true);
                    return;
                  }
                  setShowDonationModal(true);
                }}
                aria-label="POP 후원"
                title="POP 후원"
              >
                <PopIcon size={40} />
              </button>
            </>
          )}
        </div>
      </section>

      {showMessageModal && post.userId != null && (
        <MessageSendModal
          open={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          targetUserId={Number(post.userId)}
          targetNickname={formatNickname(post.nickname, post.deleted)}
          onLoginRequired={() => setShowLoginRequiredModal(true)}
        />
      )}

      {showDonationModal && post.userId != null && (
        <DonationModal
          open={showDonationModal}
          onClose={() => setShowDonationModal(false)}
          targetUserId={Number(post.userId)}
          targetNickname={formatNickname(post.nickname, post.deleted)}
          boardId={boardId ? Number(boardId) : undefined}
          onSuccess={() => {
            setShowDonationModal(false);
            boardApi.getPost(boardId).then(({ data }) => {
              const postData = data?.data as BoardDetail | undefined;
              if (postData) setPost({ ...postData } as Post);
            }).catch(() => {});
          }}
          onOpenCharge={() => {
            setShowDonationModal(false);
            router.push('/mypage?openCharge=1');
          }}
        />
      )}

      {showExtendModal && categorySlug === 'spotlight' && (
        <SpotlightExtendModal
          open={showExtendModal}
          onClose={() => setShowExtendModal(false)}
          boardId={boardId}
          remainingPop={typeof post.remainingPop === 'number' ? post.remainingPop : 0}
          onSuccess={() => {
            setShowExtendModal(false);
            boardApi.getPost(boardId).then(({ data }) => {
              const postData = data?.data as BoardDetail | undefined;
              if (postData) setPost({ ...postData } as Post);
            }).catch(() => {});
          }}
          onOpenCharge={() => {
            setShowExtendModal(false);
            router.push('/mypage?tab=pop&openCharge=1');
          }}
        />
      )}

      <div className={styles.contentBlock}>
        {categorySlug === 'showcase' && (() => {
          const linkUrl = post.linkUrl ?? post.fileUrl ?? null;
          const videoId = extractYouTubeVideoId(linkUrl);
          const embedUrl = getYouTubeEmbedUrl(videoId);
          if (!videoId || !embedUrl) return null;
          return (
            <div className={`${styles.videoWrap} ${postDetailStyles.heroVideoWrap}`}>
              <iframe
                title="YouTube"
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        })()}

        {categorySlug === 'playlists' &&
          post.playlistItems &&
          post.playlistItems.length > 0 && (
            <PlaylistDetailSection
              playlistTitle={post.playlistTitle ?? post.title ?? '플레이리스트'}
              playlistItems={post.playlistItems}
            />
          )}

        {categorySlug === 'spotlight' &&
          (() => {
            const photos = post.photos ?? post.imageUrls ?? [];
            if (!Array.isArray(photos) || photos.length === 0) return null;
            const index = Math.min(spotlightPhotoIndex, photos.length - 1);
            if (photos.length === 1) {
              return (
                <div className={`${styles.videoWrap} ${postDetailStyles.heroVideoWrap}`}>
                  <img
                    src={photos[0]}
                    alt=""
                    className={styles.heroImage}
                  />
                </div>
              );
            }
            return (
              <div className={styles.photoNavWrap}>
                <div className={`${styles.videoWrap} ${postDetailStyles.heroVideoWrap}`}>
                  <img
                    src={photos[index]}
                    alt=""
                    className={styles.heroImage}
                  />
                </div>
                <button
                  type="button"
                  className={`${styles.photoNavBtn} ${styles.photoNavPrev}`}
                  onClick={() =>
                    setSpotlightPhotoIndex((i) =>
                      i <= 0 ? photos.length - 1 : i - 1
                    )
                  }
                  aria-label="이전 사진"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`${styles.photoNavBtn} ${styles.photoNavNext}`}
                  onClick={() =>
                    setSpotlightPhotoIndex((i) =>
                      i >= photos.length - 1 ? 0 : i + 1
                    )
                  }
                  aria-label="다음 사진"
                >
                  ›
                </button>
              </div>
            );
          })()}

        {['community', 'reviews'].includes(categorySlug) &&
          (() => {
            const urls = (post.imageUrls ?? []).filter(
              (u): u is string => typeof u === 'string' && u.trim() !== ''
            );
            if (urls.length === 0) return null;
            return (
              <div className={`${styles.videoWrap} ${postDetailStyles.heroVideoWrap}`}>
                <img
                  src={urls[0]}
                  alt=""
                  className={styles.heroImage}
                />
              </div>
            );
          })()}

        <div className={styles.text}>{post.content}</div>

        {categorySlug === 'spotlight' && isAuthor && (
          <div className={postDetailStyles.spotlightRemainingBlock}>
            <p className={postDetailStyles.spotlightRemainingText}>
              잔여 Pop: {(typeof post.remainingPop === 'number' ? post.remainingPop : 0).toLocaleString('ko-KR')}
              {(typeof post.remainingPop === 'number' && post.remainingPop === 0) ? ' (만료됨)' : ''}
            </p>
            {typeof post.remainingPop === 'number' && post.remainingPop === 0 && (
              <div className={postDetailStyles.spotlightExpiredActions}>
                <button
                  type="button"
                  className={postDetailStyles.spotlightExpiredBtn}
                  onClick={() => router.push(`/boards/${boardId}/edit`)}
                >
                  수정
                </button>
                <button
                  type="button"
                  className={postDetailStyles.spotlightExpiredBtn}
                  onClick={() => setShowExtendModal(true)}
                >
                  재등록
                </button>
              </div>
            )}
          </div>
        )}

        {['community', 'reviews'].includes(categorySlug) &&
          (() => {
            const att = post.attachment;
            if (!att || typeof att !== 'object') return null;
            const fileKey =
              (typeof att.fileKey === 'string' && att.fileKey.trim() !== '' ? att.fileKey : null) ??
              (typeof (att as { filekey?: string }).filekey === 'string' &&
              (att as { filekey: string }).filekey.trim() !== ''
                ? (att as { filekey: string }).filekey
                : null);
            const originalFilename =
              typeof att.originalFilename === 'string' && att.originalFilename.trim() !== ''
                ? att.originalFilename.trim()
                : '첨부파일';
            if (!fileKey) return null;
            return (
              <div className={styles.attachmentBlock}>
                <button
                  type="button"
                  className={styles.attachmentBtn}
                  onClick={() => handleFileDownload(fileKey, originalFilename)}
                  disabled={attachmentDownloading}
                >
                  [첨부파일] {originalFilename}
                </button>
              </div>
            );
          })()}
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
    </article>
  );
}
