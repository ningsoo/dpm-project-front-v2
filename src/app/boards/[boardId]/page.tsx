'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import PostDetail from '@/components/board/PostDetail';

/** boardId가 유효한 문자열로 확정되었을 때만 true */
function isValidBoardId(id: unknown): id is string {
  return typeof id === 'string' && id.trim() !== '';
}

export default function PostDetailPage() {
  const params = useParams();
  const boardId = useMemo(() => {
    const raw = params?.boardId;
    return isValidBoardId(raw) ? String(raw).trim() : null;
  }, [params?.boardId]);
  const category = 'SHOWCASE';

  // boardId가 확정되기 전까지는 로딩 표시 (useParams 초기값/StrictMode 이중 마운트 방지)
  if (!boardId) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#666' }}>로딩 중…</div>;
  }

  return <PostDetail category={category} boardId={boardId} />;
}
