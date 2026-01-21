'use client';

import { useParams } from 'next/navigation';
import BoardList from '@/components/board/BoardList';

const GRID_CATEGORIES = ['showcase', 'playlists', 'spotlight'];
const LIST_CATEGORIES = ['community', 'reviews'];

export default function BoardListPage() {
  const params = useParams();
  const category = (params?.category as string) || 'showcase';
  const viewMode = GRID_CATEGORIES.includes(category) ? 'grid' : 'list';

  return <BoardList category={category} viewMode={viewMode} />;
}
