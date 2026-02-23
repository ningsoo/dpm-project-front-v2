import { adminApi } from '@/api/adminApi';
import { safeParse } from '../common/helpers';
import type { PageResponse } from '../common/types';

export async function fetchComments(page: number): Promise<PageResponse> {
  const res = await adminApi.getComments({ page });
  return safeParse(res.data?.data);
}

export async function deleteComment(commentId: string): Promise<void> {
  await adminApi.deleteComment(commentId);
}
