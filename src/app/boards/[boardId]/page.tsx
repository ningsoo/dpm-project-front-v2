'use client';

import { useParams } from 'next/navigation';
import PostDetail from '@/components/board/PostDetail';

export default function PostDetailPage() {
  const params = useParams();
  const boardId = (params?.boardId as string) ?? '';
  const category = 'SHOWCASE';

  return <PostDetail category={category} boardId={boardId} />;
}
