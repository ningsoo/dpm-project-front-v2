'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import CreatePost from '@/components/board/CreatePost/CreatePost';

export default function NewPostPage() {
  const params = useParams();
  const category = (params?.category as string) || 'SHOWCASE';

  return (
    <Suspense fallback={null}>
      <CreatePost category={category} />
    </Suspense>
  );
}
