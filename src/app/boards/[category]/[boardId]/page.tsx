'use client';

import { useParams } from 'next/navigation';
import PostDetail from '@/components/board/PostDetail';

export default function PostDetailPage() {
  const params = useParams();
  const category = (params?.category as string) || 'showcase';
  const boardId = params?.boardId as string;

  return <PostDetail category={category} boardId={boardId} />;
}
