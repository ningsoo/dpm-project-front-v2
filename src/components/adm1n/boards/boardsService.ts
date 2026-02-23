import { adminApi } from '@/api/adminApi';
import { safeParse } from '../common/helpers';
import type { PageResponse } from '../common/types';

export interface GetBoardsParams {
  page: number;
  category?: string;
}

export async function fetchBoards(params: GetBoardsParams): Promise<PageResponse> {
  const res = await adminApi.getBoards(params);
  return safeParse(res.data?.data);
}

export async function deleteBoard(boardId: string): Promise<void> {
  await adminApi.deleteBoard(boardId);
}
