'use client';

import { useState, useEffect } from 'react';
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
  authorNickname: string;
  content: string;
  createdAt: string;
  likeCount?: number;
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
  const user = useSelector((s: RootState) => s.auth.user);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);

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

  const handleLike = () => {
    if (!user) return;
    boardApi.likePost(safeCat, boardId).then(() => {
      setPost((p) => (p ? { ...p, likeCount: (p.likeCount ?? 0) + 1, isLiked: true } : null));
    }).catch(() => ToastUtils.error('실패'));
  };

  const handleCommentSubmit = () => {
    if (!user || !commentText.trim() || commentText.length > 50) return;
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

  if (loading) return <div className={styles.loading}>로딩 중…</div>;
  if (!post) return <div className={styles.loading}>글이 없습니다.</div>;

  const ytId = extractYoutubeId(post.youtubeUrl);
  const isAuthor = user?.id === post.authorId;

  return (
    <article className={styles.wrap}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{post.title}</h1>
        <div className={styles.actions}>
          <button type="button" className={styles.iconBtn} onClick={handleLike} disabled={!user}>
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
          <button type="button" className={styles.iconBtn} title="메뉴">
            <MoreVertical size={18} />
            {/* Dropdown: Edit/Delete (author), Report (others) */}
          </button>
        </div>
      </div>

      <div className={styles.authorRow}>
        <span className={styles.author}>{post.authorNickname || '—'}</span>
        {user && !isAuthor && (
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
            {user && (
              <div className={styles.commentForm}>
                <input
                  type="text"
                  placeholder="댓글 (1~50자)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className={styles.commentInput}
                  maxLength={50}
                />
                <button
                  type="button"
                  className={styles.commentSubmit}
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim()}
                >
                  등록
                </button>
              </div>
            )}

            {comments.map((c) => (
              <div key={c.id} className={styles.commentItem}>
                <div className={styles.commentHead}>
                  <span className={styles.commentAuthor}>{c.authorNickname}</span>
                  <span className={styles.commentDate}>{formatDateTime(c.createdAt)}</span>
                  <button type="button" className={styles.menuBtn}>⋯</button>
                </div>
                <div className={styles.commentBody}>{c.content}</div>
                <button type="button" className={styles.replyBtn}>답글</button>
              </div>
            ))}
          </>
        )}
      </section>
    </article>
  );
}
