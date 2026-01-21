'use client';

import { useParams } from 'next/navigation';
import CreatePost from '@/components/board/CreatePost';

export default function NewPostPage() {
  const params = useParams();
  const category = (params?.category as string) || 'showcase';

  return <CreatePost category={category} />;
}
