'use client';

import { useParams } from 'next/navigation';
import CreatePost from '@/components/board/CreatePost/CreatePost'

export default function NewPostPage() {
  const params = useParams();
  const category = (params?.category as string) || 'SHOWCASE';

  return <CreatePost category={category} />;
}
