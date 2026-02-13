'use client';

import { useParams } from 'next/navigation';
import EditPost from '@/components/board/EditPost';

export default function EditPostPage() {
  const params = useParams();
  const boardId = (params?.boardId as string) ?? '';
  const category = 'showcase';

  return <EditPost category={category} boardId={boardId} />;
}
